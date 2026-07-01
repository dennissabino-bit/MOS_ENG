import { useState, useEffect, useMemo } from 'react';
import {
  Plus, MapPin, Users, Package, Calendar, CheckCircle,
  Filter, ChevronDown, TrendingDown, Trash2, Loader2,
  FileText, BarChart2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { NovaCotacaoModal } from '../components/cotacoes/NovaCotacaoModal';
import { supabase } from '../lib/supabase';
import type { CotacaoGrupo, Obra } from '../lib/database.types';

// ─── types ────────────────────────────────────────────────────────────────────

interface GrupoEnriquecido extends CotacaoGrupo {
  fornCount: number;
  itemCount: number;
  economia: number | null;
  winnerNome?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtCurrencyFull(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
  titulo, onConfirm, onCancel, saving,
}: { titulo: string; onConfirm: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-status-errorLight flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-5 h-5 text-status-error" />
          </div>
          <h3 className="font-display font-bold text-base text-text-primary mb-1">Excluir Cotação?</h3>
          <p className="font-body text-sm text-text-secondary">
            A cotação <span className="font-semibold text-text-primary">"{titulo}"</span>, seus itens e propostas serão excluídos permanentemente.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-status-error text-white font-body text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="flex items-end gap-[3px] flex-1 min-h-[96px]">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const isLast = i === data.length - 1;
          const hasValue = d.value > 0;
          return (
            <div key={`${d.label}-${i}`} className="flex-1 flex flex-col justify-end group relative h-full">
              <div
                title={`${d.label}: ${fmtCurrencyFull(d.value)}`}
                className={`w-full rounded-t transition-all duration-500 ${
                  isLast
                    ? 'bg-mos-700'
                    : hasValue
                      ? 'bg-mos-300 group-hover:bg-mos-400'
                      : 'bg-surface-3'
                }`}
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
            </div>
          );
        })}
      </div>
      {/* X axis labels — todos os 12 meses */}
      <div className="flex items-start gap-[3px] mt-2">
        {data.map((d, i) => (
          <div key={`label-${i}`} className="flex-1 flex justify-center">
            <span className={`font-data text-[8px] font-semibold capitalize leading-none ${
              i === data.length - 1 ? 'text-mos-700' : 'text-text-secondary'
            }`}>
              {d.label.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cotacao Card ─────────────────────────────────────────────────────────────

function CotacaoCard({
  grupo, onDelete, onOpen,
}: {
  grupo: GrupoEnriquecido;
  onDelete: (g: GrupoEnriquecido) => void;
  onOpen: (id: string) => void;
}) {
  const isFechada = grupo.status === 'fechada';

  return (
    <div
      onClick={() => onOpen(grupo.id)}
      className="card overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow duration-200 flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-bold text-sm text-text-primary leading-snug flex-1 min-w-0">
            {grupo.titulo}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-body text-[10px] font-bold tracking-wide ${
              isFechada
                ? 'bg-status-successLight text-status-success'
                : 'bg-status-infoLight text-status-info'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {isFechada ? 'FECHADA' : 'ABERTA'}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onDelete(grupo); }}
              className="p-1 rounded-md text-text-disabled hover:text-status-error hover:bg-status-errorLight transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {grupo.obras?.nome && (
          <div className="flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-wide uppercase truncate">
              {grupo.obras.nome}
            </span>
          </div>
        )}

        {isFechada && grupo.winnerNome && (
          <div className="flex items-center gap-2.5 bg-status-successLight rounded-md px-3 py-2 mb-3">
            <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-body text-[9px] font-bold text-status-success tracking-[0.12em]">FORNECEDOR SELECIONADO</p>
              <p className="font-body text-sm font-bold text-text-primary truncate">{grupo.winnerNome}</p>
            </div>
          </div>
        )}

        {grupo.economia != null && grupo.economia > 0 && (
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3 h-3 text-status-success" />
            <span className="font-data text-xs font-semibold text-status-success">
              Economia: {fmtCurrencyFull(grupo.economia)}
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-surface-2 px-4 py-3 bg-surface-1">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-text-tertiary" />
              <span className="font-data text-sm font-bold text-text-primary">{grupo.fornCount}</span>
            </div>
            <span className="font-body text-[9px] font-semibold text-text-disabled tracking-wider">FORNECEDORES</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3 text-text-tertiary" />
              <span className="font-data text-sm font-bold text-text-primary">{grupo.itemCount}</span>
            </div>
            <span className="font-body text-[9px] font-semibold text-text-disabled tracking-wider">ITENS</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-text-tertiary" />
              <span className="font-data text-[10px] font-bold text-text-primary">{fmtDate(grupo.created_at)}</span>
            </div>
            <span className="font-body text-[9px] font-semibold text-text-disabled tracking-wider">DATA</span>
          </div>
        </div>

        {grupo.categoria && (
          <div className="mt-2 pt-2 border-t border-surface-2">
            <span className="font-body text-[9px] font-semibold text-text-disabled tracking-wider">
              CATEGORIA: <span className="text-text-secondary">{grupo.categoria.toUpperCase()}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Cotacoes() {
  const navigate = useNavigate();

  const [grupos, setGrupos] = useState<GrupoEnriquecido[]>([]);
  const [obras, setObras] = useState<Pick<Obra, 'id' | 'nome'>[]>([]);
  const [tab, setTab] = useState<'ativos' | 'arquivados'>('ativos');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterObraId, setFilterObraId] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<GrupoEnriquecido | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    const [gruposRes, itensRes, propostasRes, obrasRes] = await Promise.all([
      supabase.from('cotacao_grupos')
        .select('*, obras(nome, codigo)')
        .order('created_at', { ascending: false }),
      supabase.from('cotacao_itens').select('id, grupo_id'),
      supabase.from('cotacao_propostas').select('grupo_id, fornecedor_id, item_id, preco_unitario'),
      supabase.from('obras').select('id, nome').order('nome'),
    ]);

    const rawGrupos = (gruposRes.data ?? []) as CotacaoGrupo[];
    const itens     = (itensRes.data    ?? []) as { id: string; grupo_id: string }[];
    const props     = (propostasRes.data ?? []) as { grupo_id: string; fornecedor_id: string; item_id: string; preco_unitario: number | null }[];

    const winnerIds = [...new Set(rawGrupos.map(g => g.fornecedor_vencedor_id).filter(Boolean) as string[])];
    let winnerMap: Record<string, string> = {};
    if (winnerIds.length > 0) {
      const { data: ws } = await supabase.from('fornecedores').select('id, nome').in('id', winnerIds);
      if (ws) winnerMap = Object.fromEntries(ws.map((w: { id: string; nome: string }) => [w.id, w.nome]));
    }

    const enriched: GrupoEnriquecido[] = rawGrupos.map(g => {
      const gItens  = itens.filter(i => i.grupo_id === g.id);
      const gProps  = props.filter(p => p.grupo_id === g.id);
      const fornIds = [...new Set(gProps.map(p => p.fornecedor_id))];

      const fornTotals = fornIds.map(fid =>
        gItens.reduce((acc, item) => {
          const p = gProps.find(pr => pr.fornecedor_id === fid && pr.item_id === item.id);
          return acc + (p?.preco_unitario ?? 0);
        }, 0)
      ).filter(t => t > 0);

      const economia = fornTotals.length >= 2
        ? Math.max(...fornTotals) - Math.min(...fornTotals)
        : null;

      return {
        ...g,
        fornCount: fornIds.length,
        itemCount: gItens.length,
        economia,
        winnerNome: g.fornecedor_vencedor_id ? winnerMap[g.fornecedor_vencedor_id] : undefined,
      };
    });

    setGrupos(enriched);
    setObras((obrasRes.data ?? []) as Pick<Obra, 'id' | 'nome'>[]);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('cotacao_grupos').delete().eq('id', deleteTarget.id);
    setGrupos(prev => prev.filter(g => g.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  // ── derived ─────────────────────────────────────────────────────────────────

  const ativos     = grupos.filter(g => g.status === 'aberta');
  const arquivados = grupos.filter(g => g.status === 'fechada');
  const tabList    = tab === 'ativos' ? ativos : arquivados;

  const categorias = useMemo(() =>
    [...new Set(grupos.map(g => g.categoria).filter(Boolean) as string[])].sort(),
    [grupos]);

  const filtered = tabList.filter(g => {
    if (filterStatus && g.status !== filterStatus) return false;
    if (filterObraId && g.obra_id !== filterObraId) return false;
    if (filterCategoria && g.categoria !== filterCategoria) return false;
    return true;
  });

  const economiaTotal = grupos
    .filter(g => g.status === 'fechada' && g.economia != null)
    .reduce((acc, g) => acc + (g.economia ?? 0), 0);

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const value = grupos
        .filter(g => g.status === 'fechada' && g.economia != null && monthKey(g.created_at) === key)
        .reduce((acc, g) => acc + (g.economia ?? 0), 0);
      return { label, value };
    });
  }, [grupos]);

  const activeFilters = [filterStatus, filterObraId, filterCategoria].filter(Boolean).length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Cotações" subtitle={`${ativos.length} cotações ativas`}>
      <div className="p-6 space-y-5">

        {/* ── Tabs + New button ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('ativos')}
              className={`px-4 py-2 rounded-lg font-body text-sm font-semibold transition-colors ${
                tab === 'ativos'
                  ? 'bg-mos-700 text-white shadow-card'
                  : 'bg-surface-0 border border-surface-3 text-text-secondary hover:bg-surface-2'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setTab('arquivados')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-semibold transition-colors ${
                tab === 'arquivados'
                  ? 'bg-mos-700 text-white shadow-card'
                  : 'bg-surface-0 border border-surface-3 text-text-secondary hover:bg-surface-2'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Arquivados
              {arquivados.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  tab === 'arquivados' ? 'bg-white/20 text-white' : 'bg-mos-700 text-white'
                }`}>
                  {arquivados.length}
                </span>
              )}
            </button>
          </div>

          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Cotação
          </button>
        </div>

        {/* ── Analytics row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Economia acumulada — usa o padrão mos-700 do sistema */}
          <div className="lg:col-span-1 rounded-xl p-5 bg-gradient-to-br from-mos-800 to-mos-700 shadow-card relative overflow-hidden">
            {/* Decorative circle */}
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -right-2 bottom-4 w-20 h-20 rounded-full bg-white/5" />

            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center mb-4">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <p className="font-body text-[10px] font-bold text-mos-200 tracking-[0.15em] mb-0.5">ECONOMIA ACUMULADA</p>
              <p className="font-body text-[10px] text-mos-300 tracking-wide mb-4">TOTAL ACUMULADO DE NEGOCIAÇÕES</p>
              <p className="font-display font-bold text-3xl text-white mb-4 leading-tight">
                {fmtCurrencyFull(economiaTotal)}
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-body text-[9px] font-bold text-mos-300 tracking-wider mb-0.5">COTAÇÕES FECHADAS</p>
                  <p className="font-data font-bold text-xl text-white">{arquivados.length}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="font-body text-[9px] font-bold text-mos-300 tracking-wider mb-0.5">COTAÇÕES ABERTAS</p>
                  <p className="font-data font-bold text-xl text-white">{ativos.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico mensal */}
          <div className="lg:col-span-3 card p-5 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-body text-[10px] font-bold text-text-secondary tracking-[0.15em]">ECONOMIA MENSAL</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">HISTÓRICO DOS ÚLTIMOS 12 MESES</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-mos-300" />
                  <span className="font-body text-[9px] font-semibold text-text-secondary">Meses anteriores</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-mos-700" />
                  <span className="font-body text-[9px] font-semibold text-text-secondary">Mês atual</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[120px] flex flex-col">
              <MiniBarChart data={chartData} />
            </div>
            {/* Total do período */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-2">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-mos-700" />
                <span className="font-body text-xs text-text-secondary font-semibold">Total no período</span>
              </div>
              <span className="font-data text-sm font-bold text-mos-700">{fmtCurrencyFull(economiaTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Filter panel ── */}
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-1 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-tertiary" />
              <span className="font-body text-xs font-bold text-text-secondary tracking-wider">PAINEL DE FILTROS</span>
              {activeFilters > 0 && (
                <span className="bg-mos-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {activeFilters}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="border-t border-surface-2 px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-body text-[10px] font-bold text-text-tertiary tracking-wider block mb-1.5">STATUS</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full rounded-md border border-surface-3 px-3 py-2 font-body text-sm text-text-primary focus:outline-none focus:border-mos-700 bg-white transition-colors">
                    <option value="">Todos os status</option>
                    <option value="aberta">Aberta</option>
                    <option value="fechada">Fechada</option>
                  </select>
                </div>
                <div>
                  <label className="font-body text-[10px] font-bold text-text-tertiary tracking-wider block mb-1.5">OBRA</label>
                  <select value={filterObraId} onChange={e => setFilterObraId(e.target.value)}
                    className="w-full rounded-md border border-surface-3 px-3 py-2 font-body text-sm text-text-primary focus:outline-none focus:border-mos-700 bg-white transition-colors">
                    <option value="">Todas as obras</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-body text-[10px] font-bold text-text-tertiary tracking-wider block mb-1.5">CATEGORIA</label>
                  <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
                    className="w-full rounded-md border border-surface-3 px-3 py-2 font-body text-sm text-text-primary focus:outline-none focus:border-mos-700 bg-white transition-colors">
                    <option value="">Todas as categorias</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="font-body text-xs text-text-tertiary">
                  {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => { setFilterStatus(''); setFilterObraId(''); setFilterCategoria(''); }}
                  className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Cards grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4 space-y-3 animate-skeleton">
                <div className="h-4 bg-surface-2 rounded w-3/4" />
                <div className="h-3 bg-surface-2 rounded w-1/2" />
                <div className="h-10 bg-surface-2 rounded" />
                <div className="h-8 bg-surface-2 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card py-20 text-center">
            <FileText className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary mb-4">
              {tabList.length === 0 ? 'Nenhuma cotação encontrada' : 'Nenhuma cotação corresponde ao filtro'}
            </p>
            {tabList.length === 0 && (
              <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />Nova Cotação
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(g => (
              <CotacaoCard
                key={g.id}
                grupo={g}
                onDelete={setDeleteTarget}
                onOpen={id => navigate(`/cotacoes/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NovaCotacaoModal
          onClose={() => setShowModal(false)}
          onSaved={newGrupo => {
            setGrupos(prev => [{ ...(newGrupo as CotacaoGrupo), fornCount: 0, itemCount: 0, economia: null }, ...prev]);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          titulo={deleteTarget.titulo}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          saving={deleting}
        />
      )}
    </AppLayout>
  );
}
