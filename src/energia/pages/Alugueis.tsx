import { useState, useEffect, useMemo } from 'react';
import {
  Home, Plus, Search, ChevronDown, Building2, CheckCircle2,
  Clock, AlertTriangle, FileText, Loader2, DoorOpen,
  Square, CheckSquare, MinusSquare, Calendar, Receipt,
} from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { FaturaDetalheModal } from '../components/FaturaDetalheModal';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatMesAno, getAnoAtual, getMesAtual } from '../utils/calculos';
import type {
  EnergiaUnidade, EnergiaSala, EnergiaFatura, EnergiaFaturaStatus,
  EnergiaContratoLocacao, EnergiaAluguel,
} from '../types';
import { FATURA_STATUS_CONFIG, MESES_ABREV, MESES_LABEL } from '../types';

const MESES_OPTS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const STATUS_ORDER: EnergiaFaturaStatus[] = ['rascunho', 'enviada', 'visualizada', 'paga'];

function nextStatusFor(current: EnergiaFaturaStatus): EnergiaFaturaStatus | null {
  if (current === 'vencida') return 'paga';
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

function buildVencimento(ano: number, mes: number, dia: number): string {
  const d = String(dia).padStart(2, '0');
  const m = String(mes).padStart(2, '0');
  return `${ano}-${m}-${d}`;
}

// ─── Geração de faturas de aluguel ──────────────────────────────────────────

interface GerarResult { ok: number; skip: number; err: number }

async function gerarFaturasAluguel(
  unidadeId: string,
  mes: number,
  ano: number,
): Promise<GerarResult> {
  let ok = 0; let skip = 0; let err = 0;

  // Busca todas as salas ativas da unidade com contrato vigente
  const { data: salasData } = await supabase
    .from('energia_salas')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .eq('arquivada', false);

  const salas = (salasData as EnergiaSala[]) || [];
  if (salas.length === 0) return { ok, skip, err };

  const salaIds = salas.map(s => s.id);

  // Busca contratos vigentes
  const { data: contratosData } = await supabase
    .from('energia_contratos_locacao')
    .select('*')
    .in('sala_id', salaIds)
    .eq('ativo', true);

  const contratos = (contratosData as EnergiaContratoLocacao[]) || [];
  const contratoMap = new Map(contratos.map(c => [c.sala_id, c]));

  // Busca alugueis do período
  const { data: alugueisData } = await supabase
    .from('energia_alugueis')
    .select('*')
    .in('sala_id', salaIds)
    .eq('mes', mes)
    .eq('ano', ano);

  const alugueis = (alugueisData as EnergiaAluguel[]) || [];
  const aluguelMap = new Map(alugueis.map(a => [a.sala_id, a]));

  // Busca faturas de aluguel já geradas para este período/unidade
  const { data: faturasExistentes } = await supabase
    .from('energia_faturas')
    .select('sala_id, id')
    .eq('unidade_id', unidadeId)
    .eq('tipo', 'aluguel')
    .eq('mes', mes)
    .eq('ano', ano);

  const faturaExistenteSalaIds = new Set(
    (faturasExistentes || []).map((f: { sala_id: string }) => f.sala_id).filter(Boolean)
  );

  for (const sala of salas) {
    const contrato = contratoMap.get(sala.id);
    if (!contrato) { skip++; continue; }

    // Verifica se o contrato cobre o período
    const contratoInicio = contrato.ano_inicio * 12 + contrato.mes_inicio;
    const contratoFim = contrato.ano_fim * 12 + contrato.mes_fim;
    const periodoAtual = ano * 12 + mes;
    if (periodoAtual < contratoInicio || periodoAtual > contratoFim) { skip++; continue; }

    // Fatura já existe para esta sala
    if (faturaExistenteSalaIds.has(sala.id)) { skip++; continue; }

    const aluguel = aluguelMap.get(sala.id);
    const valor = aluguel ? Number(aluguel.valor) : Number(contrato.valor_mensal);
    const diaVenc = contrato.dia_vencimento ?? 10;

    try {
      const { data: novaFatura, error: faturaErr } = await supabase
        .from('energia_faturas')
        .insert({
          unidade_id: unidadeId,
          sala_id: sala.id,
          tipo: 'aluguel',
          mes,
          ano,
          status: 'rascunho',
          valor_energia: 0,
          valor_aluguel: valor,
          destinatario_nome: sala.responsavel || '',
          destinatario_email: sala.email_fatura || sala.email || '',
          destinatario_cpf_cnpj: sala.cpf_cnpj || '',
          data_vencimento: buildVencimento(ano, mes, diaVenc),
          observacoes: '',
        })
        .select()
        .single();

      if (faturaErr || !novaFatura) { err++; continue; }
      const fatura = novaFatura as EnergiaFatura;

      // Insere item de aluguel
      await supabase.from('energia_fatura_itens').insert({
        fatura_id: fatura.id,
        sala_id: sala.id,
        medicao_id: null,
        tipo: 'aluguel',
        descricao: `Aluguel — ${sala.nome} — ${MESES_ABREV[mes - 1]}/${ano}`,
        valor,
        mes,
        ano,
      });

      // Marca aluguel como faturado
      if (aluguel) {
        await supabase
          .from('energia_alugueis')
          .update({ status: 'faturado', fatura_id: fatura.id })
          .eq('id', aluguel.id);
      }

      ok++;
    } catch {
      err++;
    }
  }

  return { ok, skip, err };
}

// ─── Modal de geração de faturas ────────────────────────────────────────────

interface GerarModalProps {
  unidades: EnergiaUnidade[];
  isAdmin: boolean;
  userUnidadeId: string;
  onClose: () => void;
  onDone: () => void;
}

function GerarFaturasAluguelModal({ unidades, isAdmin, userUnidadeId, onClose, onDone }: GerarModalProps) {
  const [unidadeId, setUnidadeId] = useState(isAdmin ? (unidades[0]?.id || '') : userUnidadeId);
  const [mes, setMes] = useState(getMesAtual());
  const [ano, setAno] = useState(getAnoAtual());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GerarResult | null>(null);
  const [error, setError] = useState('');

  const YEAR_RANGE = Array.from({ length: 5 }, (_, i) => getAnoAtual() - 1 + i);

  const inputClass = 'w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors';

  async function handleGerar() {
    if (!unidadeId) { setError('Selecione uma unidade.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await gerarFaturasAluguel(unidadeId, mes, ano);
      setResult(res);
    } catch {
      setError('Erro ao gerar faturas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-surface-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-status-warningLight flex items-center justify-center">
              <Receipt className="w-4 h-4 text-status-warning" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-text-primary">Gerar Faturas de Aluguel</h3>
              <p className="font-body text-xs text-text-tertiary">Uma fatura por sala com contrato vigente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <span className="text-text-tertiary text-lg leading-none">×</span>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${result.err > 0 ? 'bg-status-warningLight border-status-warning/30' : 'bg-status-successLight border-status-success/30'}`}>
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${result.err > 0 ? 'text-status-warning' : 'text-status-success'}`} />
                <div>
                  <p className={`font-body text-sm font-semibold ${result.err > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                    Processamento concluído
                  </p>
                  <p className="font-body text-xs text-text-secondary mt-1">
                    {result.ok} fatura{result.ok !== 1 ? 's' : ''} gerada{result.ok !== 1 ? 's' : ''}
                    {result.skip > 0 && ` · ${result.skip} sala${result.skip !== 1 ? 's' : ''} sem contrato ou já faturada${result.skip !== 1 ? 's' : ''}`}
                    {result.err > 0 && ` · ${result.err} com erro`}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="btn-secondary">Fechar</button>
                <button onClick={onDone} className="btn-primary">Ver Faturas</button>
              </div>
            </div>
          ) : (
            <>
              {isAdmin && (
                <div>
                  <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">UNIDADE</label>
                  <select value={unidadeId} onChange={e => setUnidadeId(e.target.value)} className={inputClass}>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">MÊS</label>
                  <select value={mes} onChange={e => setMes(Number(e.target.value))} className={inputClass}>
                    {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">ANO</label>
                  <select value={ano} onChange={e => setAno(Number(e.target.value))} className={inputClass}>
                    {YEAR_RANGE.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-surface-1 border border-surface-3 rounded-lg">
                <Calendar className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5" />
                <p className="font-body text-xs text-text-secondary">
                  Serão geradas faturas individuais para cada sala ativa com contrato vigente em <strong>{MESES_OPTS[mes - 1]}/{ano}</strong>.
                  Salas já faturadas no período serão ignoradas.
                </p>
              </div>

              {error && <p className="font-body text-xs text-status-error">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleGerar}
                  disabled={loading || !unidadeId}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mos-700 text-white font-body font-semibold text-sm hover:bg-mos-700/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                  Gerar Faturas
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Alugueis() {
  const { user, isAdmin } = useEnergiaAuth();

  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [faturas, setFaturas] = useState<EnergiaFatura[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [filterSalaId, setFilterSalaId] = useState('');
  const [filterStatus, setFilterStatus] = useState<EnergiaFaturaStatus | ''>('');
  const [filterMes, setFilterMes] = useState<number>(0);
  const [filterAno, setFilterAno] = useState<number>(getAnoAtual());
  const [search, setSearch] = useState('');

  const [showGerarModal, setShowGerarModal] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => { fetchData(); }, [isAdmin, user]);
  useEffect(() => { setSelectedIds(new Set()); }, [filterUnidadeId, filterSalaId, filterStatus, filterMes, filterAno, search]);

  async function fetchData() {
    setLoading(true);
    let uQuery = supabase.from('energia_unidades').select('*').order('nome');
    let sQuery = supabase.from('energia_salas').select('*').order('nome');
    let fQuery = supabase
      .from('energia_faturas')
      .select('*')
      .eq('tipo', 'aluguel')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false });

    if (!isAdmin && user?.unidade_id) {
      uQuery = uQuery.eq('id', user.unidade_id);
      sQuery = sQuery.eq('unidade_id', user.unidade_id);
      fQuery = fQuery.eq('unidade_id', user.unidade_id);
    }

    const [uRes, sRes, fRes] = await Promise.all([uQuery, sQuery, fQuery]);
    setUnidades((uRes.data as EnergiaUnidade[]) || []);
    setSalas((sRes.data as EnergiaSala[]) || []);
    setFaturas((fRes.data as EnergiaFatura[]) || []);
    if (!isAdmin && user?.unidade_id) setFilterUnidadeId(user.unidade_id);
    setLoading(false);
  }

  const unidadeMap = useMemo(() => new Map(unidades.map(u => [u.id, u])), [unidades]);
  const salaMap = useMemo(() => new Map(salas.map(s => [s.id, s])), [salas]);

  const filteredSalas = useMemo(() => {
    if (!filterUnidadeId) return salas;
    return salas.filter(s => s.unidade_id === filterUnidadeId);
  }, [salas, filterUnidadeId]);

  const filtered = useMemo(() => {
    return faturas.filter(f => {
      if (filterUnidadeId && f.unidade_id !== filterUnidadeId) return false;
      if (filterSalaId && f.sala_id !== filterSalaId) return false;
      if (filterStatus && f.status !== filterStatus) return false;
      if (filterMes && f.mes !== filterMes) return false;
      if (filterAno && f.ano !== filterAno) return false;
      if (search) {
        const q = search.toLowerCase();
        const sala = f.sala_id ? salaMap.get(f.sala_id) : undefined;
        if (
          !f.destinatario_nome.toLowerCase().includes(q) &&
          !(sala?.nome || '').toLowerCase().includes(q) &&
          !(unidadeMap.get(f.unidade_id)?.nome || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [faturas, filterUnidadeId, filterSalaId, filterStatus, filterMes, filterAno, search, unidadeMap, salaMap]);

  const kpis = useMemo(() => {
    const toReceber = faturas.filter(f => f.status === 'enviada' || f.status === 'visualizada');
    const pagas = faturas.filter(f => f.status === 'paga');
    const vencidas = faturas.filter(f => f.status === 'vencida');
    const totalGeral = faturas.filter(f => f.status !== 'rascunho');
    const adimplentes = pagas.length;
    const totalComCobr = totalGeral.length;
    return {
      totalAReceber: toReceber.reduce((s, f) => s + Number(f.valor_total), 0),
      countAReceber: toReceber.length,
      totalRecebido: pagas.reduce((s, f) => s + Number(f.valor_total), 0),
      countPagas: pagas.length,
      countVencidas: vencidas.length,
      totalVencidas: vencidas.reduce((s, f) => s + Number(f.valor_total), 0),
      adimplencia: totalComCobr > 0 ? Math.round((adimplentes / totalComCobr) * 100) : 100,
    };
  }, [faturas]);

  const selectableIds = useMemo(
    () => filtered.filter(f => f.status !== 'paga').map(f => f.id),
    [filtered]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));
  const someSelected = selectableIds.some(id => selectedIds.has(id));

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableIds));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkAdvance() {
    const toAdvance = filtered.filter(f => selectedIds.has(f.id));
    if (toAdvance.length === 0) return;
    setBulkSaving(true);
    await Promise.all(toAdvance.map(async f => {
      const next = nextStatusFor(f.status);
      if (!next) return;
      const extra: Record<string, string> = {};
      if (next === 'enviada') extra.data_envio = new Date().toISOString();
      if (next === 'paga') extra.data_pagamento = new Date().toISOString().split('T')[0];
      await supabase.from('energia_faturas').update({ status: next, ...extra }).eq('id', f.id);
    }));
    setBulkSaving(false);
    setSelectedIds(new Set());
    fetchData();
  }

  const detalhe = detalheId ? faturas.find(f => f.id === detalheId) ?? null : null;

  return (
    <EnergiaLayout title="Aluguéis" subtitle={`${filtered.length} fatura${filtered.length !== 1 ? 's' : ''}`}>
      <div className="p-6 space-y-5">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-xs font-bold text-text-secondary tracking-widest mb-1">FINANCEIRO</p>
            <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">ALUGUÉIS</h1>
            <p className="font-body text-sm text-text-tertiary mt-1">Controle de cobranças e faturas de locação</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowGerarModal(true)}
              className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2.5 rounded-lg shadow-card transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Gerar Faturas
            </button>
          )}
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
            <p className="font-body text-xs text-text-tertiary mt-0.5">{kpis.countAReceber} fatura{kpis.countAReceber !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-status-successLight flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-status-success" />
              </div>
              <span className="font-body text-xs text-text-tertiary">Recebido</span>
            </div>
            <p className="font-display font-bold text-xl text-text-primary">{formatCurrencyBR(kpis.totalRecebido)}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">{kpis.countPagas} paga{kpis.countPagas !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-status-errorLight flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-status-error" />
              </div>
              <span className="font-body text-xs text-text-tertiary">Vencidas</span>
            </div>
            <p className="font-display font-bold text-xl text-status-error">{kpis.countVencidas}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">{formatCurrencyBR(kpis.totalVencidas)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-status-successLight flex items-center justify-center">
                <Home className="w-4 h-4 text-status-success" />
              </div>
              <span className="font-body text-xs text-text-tertiary">Adimplência</span>
            </div>
            <p className="font-display font-bold text-xl text-text-primary">{kpis.adimplencia}%</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">do total cobrado</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-surface-1 border border-surface-3 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar locatário ou sala..."
                className="flex-1 bg-transparent font-body text-sm text-text-primary placeholder-text-disabled focus:outline-none"
              />
            </div>

            {/* Unidade */}
            {isAdmin && (
              <div className="relative">
                <select
                  value={filterUnidadeId}
                  onChange={e => { setFilterUnidadeId(e.target.value); setFilterSalaId(''); }}
                  className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-8 py-2 font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
                >
                  <option value="">Todas as Unidades</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              </div>
            )}

            {/* Sala */}
            <div className="relative">
              <select
                value={filterSalaId}
                onChange={e => setFilterSalaId(e.target.value)}
                className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-8 py-2 font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
              >
                <option value="">Todas as Salas</option>
                {filteredSalas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>

            {/* Status */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as EnergiaFaturaStatus | '')}
                className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-8 py-2 font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
              >
                <option value="">Todos os Status</option>
                {Object.entries(FATURA_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>

            {/* Mês */}
            <div className="relative">
              <select
                value={filterMes}
                onChange={e => setFilterMes(Number(e.target.value))}
                className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-8 py-2 font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
              >
                <option value={0}>Todo mês</option>
                {MESES_OPTS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>

            {/* Ano */}
            <div className="relative">
              <select
                value={filterAno}
                onChange={e => setFilterAno(Number(e.target.value))}
                className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-8 py-2 font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
              >
                {Array.from({ length: 5 }, (_, i) => getAnoAtual() - 1 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-mos-700/10 border border-mos-700/30 rounded-xl">
            <span className="font-body text-sm font-semibold text-mos-700">{selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}</span>
            <button
              onClick={handleBulkAdvance}
              disabled={bulkSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-mos-700 text-white rounded-md font-body text-sm font-medium hover:bg-mos-700/90 transition-colors disabled:opacity-50"
            >
              {bulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Avançar Status
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancelar
            </button>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Home className="w-10 h-10 text-text-disabled" />
              <p className="font-body text-sm text-text-tertiary">Nenhuma fatura de aluguel encontrada</p>
              {isAdmin && (
                <button onClick={() => setShowGerarModal(true)} className="btn-primary text-sm px-4 py-2 mt-1">
                  Gerar Faturas
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-2 bg-surface-1">
                    <th className="w-10 px-4 py-3">
                      <button onClick={toggleSelectAll} className="text-text-tertiary hover:text-text-primary transition-colors">
                        {allSelected
                          ? <CheckSquare className="w-4 h-4 text-mos-700" />
                          : someSelected
                          ? <MinusSquare className="w-4 h-4 text-mos-700" />
                          : <Square className="w-4 h-4" />
                        }
                      </button>
                    </th>
                    <th className="text-left px-3 py-3 font-body text-xs font-bold text-text-secondary uppercase tracking-wider">Sala / Locatário</th>
                    {isAdmin && <th className="text-left px-3 py-3 font-body text-xs font-bold text-text-secondary uppercase tracking-wider hidden md:table-cell">Unidade</th>}
                    <th className="text-left px-3 py-3 font-body text-xs font-bold text-text-secondary uppercase tracking-wider">Competência</th>
                    <th className="text-left px-3 py-3 font-body text-xs font-bold text-text-secondary uppercase tracking-wider hidden sm:table-cell">Vencimento</th>
                    <th className="text-right px-3 py-3 font-body text-xs font-bold text-text-secondary uppercase tracking-wider">Valor</th>
                    <th className="text-left px-3 py-3 font-body text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-1">
                  {filtered.map(f => {
                    const sala = f.sala_id ? salaMap.get(f.sala_id) : undefined;
                    const unidade = unidadeMap.get(f.unidade_id);
                    const cfg = FATURA_STATUS_CONFIG[f.status];
                    const isSelectable = f.status !== 'paga';
                    return (
                      <tr
                        key={f.id}
                        className="hover:bg-surface-1/60 transition-colors cursor-pointer"
                        onClick={() => setDetalheId(f.id)}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {isSelectable ? (
                            <button onClick={() => toggleSelect(f.id)} className="text-text-tertiary hover:text-mos-700 transition-colors">
                              {selectedIds.has(f.id)
                                ? <CheckSquare className="w-4 h-4 text-mos-700" />
                                : <Square className="w-4 h-4" />
                              }
                            </button>
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                              <DoorOpen className="w-3.5 h-3.5 text-text-tertiary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-body text-sm font-semibold text-text-primary truncate">
                                {sala?.nome || '—'}
                              </p>
                              <p className="font-body text-xs text-text-tertiary truncate">
                                {f.destinatario_nome || sala?.responsavel || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-3 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                              <span className="font-body text-sm text-text-secondary truncate max-w-[120px]">
                                {unidade?.nome || '—'}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-3">
                          <span className="font-data text-sm font-semibold text-text-primary">
                            {formatMesAno(f.mes, f.ano)}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          {f.data_vencimento ? (
                            <span className={`font-data text-sm ${f.status === 'vencida' ? 'text-status-error font-semibold' : 'text-text-secondary'}`}>
                              {new Date(f.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span className="font-body text-xs text-text-disabled">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-data text-sm font-bold text-text-primary">
                            {formatCurrencyBR(Number(f.valor_total))}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 font-body text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <FileText className="w-4 h-4 text-text-tertiary" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showGerarModal && (
        <GerarFaturasAluguelModal
          unidades={unidades}
          isAdmin={isAdmin}
          userUnidadeId={user?.unidade_id || ''}
          onClose={() => setShowGerarModal(false)}
          onDone={() => { setShowGerarModal(false); fetchData(); }}
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
    </EnergiaLayout>
  );
}
