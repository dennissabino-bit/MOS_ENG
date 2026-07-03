import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Receipt, Plus, Search, ChevronDown, Building2, CheckCircle2,
  Clock, AlertTriangle, FileText, Trash2, Zap, Loader2,
  ChevronRight, Square, CheckSquare, MinusSquare, Home, BarChart2,
} from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovaFaturaModal } from '../components/NovaFaturaModal';
import { FaturaDetalheModal } from '../components/FaturaDetalheModal';
import { AluguelBarChart } from '../components/AluguelBarChart';
import type { AluguelChartPoint } from '../components/AluguelBarChart';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatMesAno, getAnoAtual, getMesAtual } from '../utils/calculos';
import { gerarFaturaAutomatica } from '../utils/gerarFaturaAutomatica';
import type { EnergiaUnidade, EnergiaFatura, EnergiaFaturaStatus, EnergiaMedicao, EnergiaSala, EnergiaFaturaTipo } from '../types';
import { FATURA_STATUS_CONFIG } from '../types';

const MESES_OPTS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const STATUS_ORDER: EnergiaFaturaStatus[] = ['rascunho', 'enviada', 'visualizada', 'paga'];

function nextStatusFor(current: EnergiaFaturaStatus): EnergiaFaturaStatus | null {
  if (current === 'vencida') return 'paga';
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

export default function Faturas() {
  const { user, isAdmin } = useEnergiaAuth();

  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [faturas, setFaturas] = useState<EnergiaFatura[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [filterStatus, setFilterStatus] = useState<EnergiaFaturaStatus | ''>('');
  const [filterTipo, setFilterTipo] = useState<EnergiaFaturaTipo | ''>('');
  const [filterMes, setFilterMes] = useState<number>(0);
  const [filterAno, setFilterAno] = useState<number>(getAnoAtual());
  const [search, setSearch] = useState('');

  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [orphanedMedicoes, setOrphanedMedicoes] = useState<EnergiaMedicao[]>([]);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // Chart state
  type ChartPeriodo = '3' | '6' | '12' | 'custom';
  const [chartTipo, setChartTipo] = useState<'energia' | 'aluguel'>('energia');
  const [chartPeriodo, setChartPeriodo] = useState<ChartPeriodo>('12');
  const [chartInicio, setChartInicio] = useState(() => {
    const v = getAnoAtual() * 12 + getMesAtual() - 11;
    return { mes: ((v - 1) % 12) + 1, ano: Math.floor((v - 1) / 12) };
  });
  const [chartFim, setChartFim] = useState({ mes: getMesAtual(), ano: getAnoAtual() });
  const [chartUnidadeId, setChartUnidadeId] = useState('');
  const periodoRef = useRef<HTMLDivElement>(null);

  function applyChartPeriodo(months: number) {
    const v = getAnoAtual() * 12 + getMesAtual() - (months - 1);
    setChartInicio({ mes: ((v - 1) % 12) + 1, ano: Math.floor((v - 1) / 12) });
    setChartFim({ mes: getMesAtual(), ano: getAnoAtual() });
    setChartPeriodo(String(months) as ChartPeriodo);
  }

  function isInChartPeriodo(mes: number, ano: number) {
    const v = ano * 12 + mes;
    const s = chartInicio.ano * 12 + chartInicio.mes;
    const e = chartFim.ano * 12 + chartFim.mes;
    return v >= s && v <= e;
  }

  useEffect(() => { fetchData(); fetchOrphaned(); }, [isAdmin, user]);

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [filterUnidadeId, filterStatus, filterTipo, filterMes, filterAno, search]);

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

  async function fetchOrphaned() {
    const { data } = await supabase
      .from('energia_medicoes')
      .select('*')
      .eq('status', 'aprovado')
      .is('fatura_id', null);
    setOrphanedMedicoes((data as EnergiaMedicao[]) || []);
  }

  async function handleProcessBatch() {
    if (orphanedMedicoes.length === 0) return;
    setProcessingBatch(true);
    setBatchResult(null);

    const salaIds = [...new Set(orphanedMedicoes.map(m => m.sala_id))];
    const { data: salasData } = await supabase
      .from('energia_salas')
      .select('*')
      .in('id', salaIds);
    const salaMap = new Map(((salasData as EnergiaSala[]) || []).map(s => [s.id, s]));

    let ok = 0;
    let fail = 0;
    for (const medicao of orphanedMedicoes) {
      const sala = salaMap.get(medicao.sala_id);
      if (!sala) { fail++; continue; }
      try {
        await gerarFaturaAutomatica(medicao, sala);
        ok++;
      } catch {
        fail++;
      }
    }
    setProcessingBatch(false);
    setBatchResult(`${ok} fatura(s) gerada(s)${fail > 0 ? `, ${fail} com erro` : ''}.`);
    setTimeout(() => setBatchResult(null), 4000);
    setOrphanedMedicoes([]);
    fetchData();
  }

  const unidadeMap = useMemo(() => new Map(unidades.map(u => [u.id, u])), [unidades]);

  const filtered = useMemo(() => {
    return faturas.filter(f => {
      if (filterUnidadeId && f.unidade_id !== filterUnidadeId) return false;
      if (filterStatus && f.status !== filterStatus) return false;
      if (filterTipo && f.tipo !== filterTipo) return false;
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
  }, [faturas, filterUnidadeId, filterStatus, filterTipo, filterMes, filterAno, search, unidadeMap]);

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

  const chartData = useMemo((): AluguelChartPoint[] => {
    let base = faturas.filter(f => f.tipo === chartTipo);
    if (chartUnidadeId) base = base.filter(f => f.unidade_id === chartUnidadeId);
    base = base.filter(f => isInChartPeriodo(f.mes, f.ano));

    const map = new Map<string, AluguelChartPoint>();
    for (const f of base) {
      const key = `${f.ano}-${f.mes}`;
      const existing = map.get(key) ?? { mes: f.mes, ano: f.ano, cobrado: 0, pago: 0 };
      if (f.status !== 'rascunho') existing.cobrado += Number(f.valor_total);
      if (f.status === 'paga') existing.pago += Number(f.valor_total);
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  }, [faturas, chartTipo, chartUnidadeId, chartInicio, chartFim]);

  // Multi-select helpers
  const selectableIds = useMemo(
    () => filtered.filter(f => f.status !== 'paga').map(f => f.id),
    [filtered]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));
  const someSelected = selectableIds.some(id => selectedIds.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
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
      await supabase
        .from('energia_faturas')
        .update({ status: next, ...extra })
        .eq('id', f.id);
    }));

    setBulkSaving(false);
    setSelectedIds(new Set());
    fetchData();
  }

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
            <p className="font-body text-xs font-bold text-text-secondary tracking-widest mb-1">FINANCEIRO</p>
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
            <p className="font-body text-xs text-text-tertiary mt-0.5">{kpis.countPagas} fatura{kpis.countPagas !== 1 ? 's' : ''}</p>
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
              <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
                <FileText className="w-4 h-4 text-text-tertiary" />
              </div>
              <span className="font-body text-xs text-text-tertiary">Rascunhos</span>
            </div>
            <p className="font-display font-bold text-xl text-text-primary">{kpis.countRascunhos}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">em elaboração</p>
          </div>
        </div>

        {/* Chart — Evolução Mensal */}
        <div className="bg-white border border-surface-2 rounded-2xl shadow-card overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-surface-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-mos-700/10 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-[18px] h-[18px] text-mos-700" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-body text-[10px] font-bold text-text-secondary tracking-widest uppercase">Evolução Mensal</p>
                  <p className="font-display font-bold text-base text-text-primary leading-tight">Cobrado vs Recebido</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Tipo toggle */}
                <div className="flex items-center gap-0.5 bg-surface-1 rounded-lg p-1 border border-surface-2">
                  <button
                    onClick={() => setChartTipo('energia')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                      chartTipo === 'energia'
                        ? 'bg-white text-text-primary shadow-card border border-surface-3'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    Energia
                  </button>
                  <button
                    onClick={() => setChartTipo('aluguel')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                      chartTipo === 'aluguel'
                        ? 'bg-white text-text-primary shadow-card border border-surface-3'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    <Home className="w-3 h-3" />
                    Aluguel
                  </button>
                </div>

                {/* Unidade filter */}
                {isAdmin && (
                  <div className="relative">
                    <select
                      value={chartUnidadeId}
                      onChange={e => setChartUnidadeId(e.target.value)}
                      className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-7 py-1.5 font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
                    >
                      <option value="">Todas as Unidades</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                  </div>
                )}

                {/* Period pills */}
                <div ref={periodoRef} className="flex items-center gap-0.5 bg-surface-1 rounded-lg p-1 border border-surface-2">
                  {(['3', '6', '12'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => applyChartPeriodo(Number(p))}
                      className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                        chartPeriodo === p
                          ? 'bg-white text-text-primary shadow-card border border-surface-3'
                          : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      {p}M
                    </button>
                  ))}
                  <button
                    onClick={() => setChartPeriodo('custom')}
                    className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                      chartPeriodo === 'custom'
                        ? 'bg-white text-text-primary shadow-card border border-surface-3'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>
              </div>
            </div>

            {/* Custom period picker */}
            {chartPeriodo === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-surface-2">
                <span className="font-body text-xs text-text-secondary">De</span>
                <div className="relative">
                  <select value={chartInicio.mes} onChange={e => setChartInicio(p => ({ ...p, mes: Number(e.target.value) }))}
                    className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-2 pr-6 py-1 font-body text-xs text-text-primary focus:outline-none">
                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={chartInicio.ano} onChange={e => setChartInicio(p => ({ ...p, ano: Number(e.target.value) }))}
                    className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-2 pr-6 py-1 font-body text-xs text-text-primary focus:outline-none">
                    {Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
                </div>
                <span className="font-body text-xs text-text-secondary">até</span>
                <div className="relative">
                  <select value={chartFim.mes} onChange={e => setChartFim(p => ({ ...p, mes: Number(e.target.value) }))}
                    className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-2 pr-6 py-1 font-body text-xs text-text-primary focus:outline-none">
                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={chartFim.ano} onChange={e => setChartFim(p => ({ ...p, ano: Number(e.target.value) }))}
                    className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-2 pr-6 py-1 font-body text-xs text-text-primary focus:outline-none">
                    {Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Chart body */}
          <div className="px-5 py-5">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <BarChart2 className="w-8 h-8 text-text-disabled" />
                <p className="font-body text-sm text-text-tertiary">Sem dados para o período selecionado.</p>
              </div>
            ) : (
              <AluguelBarChart data={chartData} height={240} />
            )}
          </div>
        </div>

        {/* Batch recovery banner */}
        {(orphanedMedicoes.length > 0 || batchResult) && (
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${batchResult ? 'bg-status-successLight border-status-success/30' : 'bg-status-warningLight border-status-warning/30'}`}>
            {batchResult ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0" />
                <p className="font-body text-sm text-status-success font-medium flex-1">{batchResult}</p>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-status-warning flex-shrink-0" />
                <p className="font-body text-sm text-status-warning font-medium flex-1">
                  {orphanedMedicoes.length} medição{orphanedMedicoes.length > 1 ? 'ões aprovadas' : ' aprovada'} sem fatura vinculada.
                </p>
                <button
                  onClick={handleProcessBatch}
                  disabled={processingBatch}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-status-warning text-white font-body text-xs font-semibold hover:bg-status-warning/90 transition-colors disabled:opacity-50"
                >
                  {processingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {processingBatch ? 'Processando…' : 'Gerar Faturas'}
                </button>
              </>
            )}
          </div>
        )}

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
          <div className="relative">
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as EnergiaFaturaTipo | '')}
              className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
            >
              <option value="">Todos os Tipos</option>
              <option value="energia">Energia</option>
              <option value="aluguel">Aluguel</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          </div>
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

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-mos-700/5 border border-mos-700/20">
            <span className="font-body text-sm font-semibold text-mos-700">
              {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="font-body text-xs text-text-tertiary hover:text-text-primary transition-colors px-2 py-1.5 rounded"
            >
              Limpar seleção
            </button>
            <button
              onClick={handleBulkAdvance}
              disabled={bulkSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-mos-700 text-white font-body text-sm font-semibold hover:bg-mos-700/90 transition-colors disabled:opacity-50"
            >
              {bulkSaving
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ChevronRight className="w-3.5 h-3.5" />
              }
              {bulkSaving ? 'Processando…' : 'Avançar Status'}
            </button>
          </div>
        )}

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
                    {/* Select-all checkbox */}
                    <th className="py-3 pl-4 pr-2 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-text-tertiary hover:text-mos-700 transition-colors"
                        title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                      >
                        {allSelected
                          ? <CheckSquare className="w-4 h-4 text-mos-700" />
                          : someSelected
                            ? <MinusSquare className="w-4 h-4 text-mos-700" />
                            : <Square className="w-4 h-4" />
                        }
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">COMPETÊNCIA</th>
                    <th className="text-left py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden md:table-cell">UNIDADE</th>
                    <th className="text-left py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">DESTINATÁRIO</th>
                    <th className="text-left py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden xl:table-cell">TIPO</th>
                    <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden lg:table-cell">ENERGIA</th>
                    <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden lg:table-cell">ALUGUEL</th>
                    <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">TOTAL</th>
                    <th className="text-center py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">STATUS</th>
                    <th className="text-center py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-2">
                  {filtered.map(f => {
                    const unidade = unidadeMap.get(f.unidade_id);
                    const cfg = FATURA_STATUS_CONFIG[f.status];
                    const isOverdue = f.status === 'vencida';
                    const isSelected = selectedIds.has(f.id);
                    const isSelectable = f.status !== 'paga';
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setDetalheId(f.id)}
                        className={`hover:bg-surface-1 transition-colors cursor-pointer ${isOverdue ? 'bg-status-errorLight/30' : ''} ${isSelected ? 'bg-mos-700/5' : ''}`}
                      >
                        {/* Row checkbox */}
                        <td className="py-3 pl-4 pr-2" onClick={e => e.stopPropagation()}>
                          {isSelectable ? (
                            <button
                              onClick={() => toggleSelect(f.id)}
                              className="flex items-center justify-center text-text-tertiary hover:text-mos-700 transition-colors"
                            >
                              {isSelected
                                ? <CheckSquare className="w-4 h-4 text-mos-700" />
                                : <Square className="w-4 h-4" />
                              }
                            </button>
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-data text-sm text-text-primary font-semibold">{formatMesAno(f.mes, f.ano)}</span>
                          {f.data_vencimento && (
                            <p className="font-body text-xs text-text-tertiary mt-0.5">Venc. {new Date(f.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
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
                          {f.destinatario_email && <p className="font-body text-xs text-text-tertiary truncate max-w-[160px]">{f.destinatario_email}</p>}
                        </td>
                        <td className="py-3 px-4 hidden xl:table-cell">
                          {f.tipo === 'aluguel' ? (
                            <span className="inline-flex items-center gap-1 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                              <Home className="w-2.5 h-2.5" />
                              Aluguel
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
                              <Zap className="w-2.5 h-2.5" />
                              Energia
                            </span>
                          )}
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
