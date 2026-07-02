import { useState, useEffect, useMemo } from 'react';
import {
  Receipt, Plus, Search, ChevronDown, Building2, CheckCircle2,
  TrendingDown, Clock, AlertTriangle, FileText, Trash2,
} from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovaFaturaModal } from '../components/NovaFaturaModal';
import { FaturaDetalheModal } from '../components/FaturaDetalheModal';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatMesAno, getAnoAtual, getMesAtual } from '../utils/calculos';
import type { EnergiaUnidade, EnergiaFatura, EnergiaFaturaStatus } from '../types';
import { FATURA_STATUS_CONFIG } from '../types';

const MESES_OPTS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function Faturas() {
  const { user, isAdmin } = useEnergiaAuth();

  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [faturas, setFaturas] = useState<EnergiaFatura[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [filterStatus, setFilterStatus] = useState<EnergiaFaturaStatus | ''>('');
  const [filterMes, setFilterMes] = useState<number>(0);
  const [filterAno, setFilterAno] = useState<number>(getAnoAtual());
  const [search, setSearch] = useState('');

  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchData(); }, [isAdmin, user]);

  async function fetchData() {
    setLoading(true);
    let uQuery = supabase.from('energia_unidades').select('*').order('nome');
    let fQuery = supabase.from('energia_faturas').select('*').order('ano', { ascending: false }).order('mes', { ascending: false });

    if (!isAdmin && user?.unidade_id) {
      uQuery = uQuery.eq('id', user.unidade_id);
      fQuery = fQuery.eq('unidade_id', user.unidade_id);
    }

    const [uRes, fRes] = await Promise.all([uQuery, fQuery]);
    setUnidades((uRes.data as EnergiaUnidade[]) || []);
    setFaturas((fRes.data as EnergiaFatura[]) || []);
    if (!isAdmin && user?.unidade_id) setFilterUnidadeId(user.unidade_id);
    setLoading(false);
  }

  const unidadeMap = useMemo(() => new Map(unidades.map(u => [u.id, u])), [unidades]);

  const filtered = useMemo(() => {
    return faturas.filter(f => {
      if (filterUnidadeId && f.unidade_id !== filterUnidadeId) return false;
      if (filterStatus && f.status !== filterStatus) return false;
      if (filterMes && f.mes !== filterMes) return false;
      if (filterAno && f.ano !== filterAno) return false;
      if (search) {
        const u = unidadeMap.get(f.unidade_id);
        const q = search.toLowerCase();
        if (!f.destinatario_nome.toLowerCase().includes(q) &&
            !(u?.nome || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [faturas, filterUnidadeId, filterStatus, filterMes, filterAno, search, unidadeMap]);

  const kpis = useMemo(() => {
    const toReceber = faturas.filter(f => f.status === 'enviada' || f.status === 'visualizada');
    const pagas = faturas.filter(f => f.status === 'paga');
    const vencidas = faturas.filter(f => f.status === 'vencida');
    const rascunhos = faturas.filter(f => f.status === 'rascunho');
    return {
      totalAReceber: toReceber.reduce((s, f) => s + Number(f.valor_total), 0),
      countAReceber: toReceber.length,
      totalRecebido: pagas.reduce((s, f) => s + Number(f.valor_total), 0),
      countPagas: pagas.length,
      countVencidas: vencidas.length,
      totalVencidas: vencidas.reduce((s, f) => s + Number(f.valor_total), 0),
      countRascunhos: rascunhos.length,
    };
  }, [faturas]);

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    await supabase.from('energia_faturas').delete().eq('id', deletingId);
    setDeleting(false);
    setDeletingId(null);
    fetchData();
  }

  const detalhe = detalheId ? faturas.find(f => f.id === detalheId) ?? null : null;

  return (
    <EnergiaLayout title="Faturas" subtitle={`${filtered.length} fatura${filtered.length !== 1 ? 's' : ''}`}>
      <div className="p-6 space-y-5">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">FINANCEIRO</p>
            <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">FATURAS</h1>
            <p className="font-body text-sm text-text-tertiary mt-1">Controle e envio de faturas de energia e aluguel</p>
          </div>
          <button
            onClick={() => setShowNovaFatura(true)}
            className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2.5 rounded-lg shadow-card transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nova Fatura
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <span className="font-body text-xs text-text-tertiary">A Receber</span>
            </div>
            <p className="font-display font-bold text-xl text-text-primary">{formatCurrencyBR(kpis.totalAReceber)}</p>
            <p className="font-body text-[10px] text-text-disabled mt-0.5">{kpis.countAReceber} fatura{kpis.countAReceber !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-status-successLight flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-status-success" />
              </div>
              <span className="font-body text-xs text-text-tertiary">Recebido</span>
            </div>
            <p className="font-display font-bold text-xl text-text-primary">{formatCurrencyBR(kpis.totalRecebido)}</p>
            <p className="font-body text-[10px] text-text-disabled mt-0.5">{kpis.countPagas} fatura{kpis.countPagas !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-status-errorLight flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-status-error" />
              </div>
              <span className="font-body text-xs text-text-tertiary">Vencidas</span>
            </div>
            <p className="font-display font-bold text-xl text-status-error">{kpis.countVencidas}</p>
            <p className="font-body text-[10px] text-text-disabled mt-0.5">{formatCurrencyBR(kpis.totalVencidas)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
                <FileText className="w-4 h-4 text-text-tertiary" />
              </div>
              <span className="font-body text-xs text-text-tertiary">Rascunhos</span>
            </div>
            <p className="font-display font-bold text-xl text-text-primary">{kpis.countRascunhos}</p>
            <p className="font-body text-[10px] text-text-disabled mt-0.5">em elaboração</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar destinatário ou unidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>
          {isAdmin && (
            <div className="relative">
              <select
                value={filterUnidadeId}
                onChange={e => setFilterUnidadeId(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
              >
                <option value="">Todas Unidades</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as EnergiaFaturaStatus | '')}
              className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
            >
              <option value="">Todos Status</option>
              {(Object.keys(FATURA_STATUS_CONFIG) as EnergiaFaturaStatus[]).map(s => (
                <option key={s} value={s}>{FATURA_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          </div>
          {/* Competencia */}
          <div className="flex items-center bg-surface-0 border border-surface-3 rounded-lg shadow-card overflow-hidden">
            <select
              value={filterMes}
              onChange={e => setFilterMes(Number(e.target.value))}
              className="appearance-none pl-3 pr-1 py-2 bg-transparent font-body text-sm text-text-primary focus:outline-none cursor-pointer"
            >
              <option value={0}>Todos meses</option>
              {MESES_OPTS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-text-disabled font-body text-sm select-none px-0.5">/</span>
            <select
              value={filterAno}
              onChange={e => setFilterAno(Number(e.target.value))}
              className="appearance-none pl-1 pr-7 py-2 bg-transparent font-body text-sm text-text-primary focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary -ml-5 mr-2 pointer-events-none flex-shrink-0" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Receipt className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary">Nenhuma fatura encontrada</p>
            <button onClick={() => setShowNovaFatura(true)} className="btn-primary mt-4 text-sm">
              Criar Primeira Fatura
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-2 bg-surface-1">
                    <th className="text-left py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">COMPETÊNCIA</th>
                    <th className="text-left py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest hidden md:table-cell">UNIDADE</th>
                    <th className="text-left py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">DESTINATÁRIO</th>
                    <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest hidden lg:table-cell">ENERGIA</th>
                    <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest hidden lg:table-cell">ALUGUEL</th>
                    <th className="text-right py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">TOTAL</th>
                    <th className="text-center py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">STATUS</th>
                    <th className="text-center py-3 px-4 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-2">
                  {filtered.map(f => {
                    const unidade = unidadeMap.get(f.unidade_id);
                    const cfg = FATURA_STATUS_CONFIG[f.status];
                    const isOverdue = f.status === 'vencida';
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setDetalheId(f.id)}
                        className={`hover:bg-surface-1 transition-colors cursor-pointer ${isOverdue ? 'bg-status-errorLight/30' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-data text-sm text-text-primary font-semibold">{formatMesAno(f.mes, f.ano)}</span>
                          {f.data_vencimento && (
                            <p className="font-body text-[10px] text-text-disabled mt-0.5">Venc. {new Date(f.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                            <span className="font-body text-sm text-text-tertiary">{unidade?.nome || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-body text-sm text-text-primary">{f.destinatario_nome || '—'}</p>
                          {f.destinatario_email && <p className="font-body text-[10px] text-text-disabled truncate max-w-[160px]">{f.destinatario_email}</p>}
                        </td>
                        <td className="py-3 px-4 text-right hidden lg:table-cell">
                          <span className="font-data text-sm text-text-tertiary">{formatCurrencyBR(Number(f.valor_energia))}</span>
                        </td>
                        <td className="py-3 px-4 text-right hidden lg:table-cell">
                          <span className="font-data text-sm text-text-tertiary">{formatCurrencyBR(Number(f.valor_aluguel))}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-data text-sm font-semibold text-text-primary">{formatCurrencyBR(Number(f.valor_total))}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setDetalheId(f.id)}
                              className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
                              title="Ver fatura"
                            >
                              <FileText className="w-3.5 h-3.5 text-text-tertiary hover:text-mos-700 transition-colors" />
                            </button>
                            {f.status === 'rascunho' && (
                              <button
                                onClick={() => setDeletingId(f.id)}
                                className="p-1.5 rounded-lg hover:bg-status-errorLight transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-status-error transition-colors" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNovaFatura && (
        <NovaFaturaModal
          unidades={unidades}
          isAdmin={isAdmin}
          userUnidadeId={user?.unidade_id || ''}
          onClose={() => setShowNovaFatura(false)}
          onSaved={() => { setShowNovaFatura(false); fetchData(); }}
        />
      )}

      {detalhe && (
        <FaturaDetalheModal
          fatura={detalhe}
          unidade={unidadeMap.get(detalhe.unidade_id)}
          onClose={() => setDetalheId(null)}
          onStatusChanged={updated => {
            setFaturas(prev => prev.map(f => f.id === updated.id ? updated : f));
            setDetalheId(null);
          }}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-text-primary">Excluir fatura</h3>
            <p className="font-body text-sm text-text-secondary">Tem certeza que deseja excluir esta fatura? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-status-error text-white font-body font-semibold text-sm rounded-lg hover:bg-status-error/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </EnergiaLayout>
  );
}
