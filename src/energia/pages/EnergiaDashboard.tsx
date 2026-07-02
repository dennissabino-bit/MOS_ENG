import { useState, useEffect, useMemo, useRef } from 'react';
import { Zap, TrendingUp, TrendingDown, DoorOpen, ChevronDown, Home, Calendar, Receipt, DollarSign, AlertCircle, CheckCircle2, Minus } from 'lucide-react';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatKWh, getAnoAtual, getMesAtual, formatMesAno } from '../utils/calculos';
import type { EnergiaMedicao, EnergiaSala, EnergiaUnidade, EnergiaAluguel } from '../types';
import { MESES_LABEL } from '../types';

type TipoFilter = 'todos' | 'energia' | 'aluguel';

interface MonthData {
  mes: number;
  ano: number;
  consumo: number;
  custo: number;
  aluguel: number;
}

interface ChartTooltip {
  item: MonthData;
  prevItem: MonthData | null;
  x: number;
  y: number;
}

function formatVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function varPct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function EnergiaDashboard() {
  const { user, isAdmin } = useEnergiaAuth();
  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [medicoes, setMedicoes] = useState<EnergiaMedicao[]>([]);
  const [alugueis, setAlugueis] = useState<EnergiaAluguel[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart filters
  const [chartUnidadeId, setChartUnidadeId] = useState('');
  const [chartSalaId, setChartSalaId] = useState('');
  const [chartTipo, setChartTipo] = useState<TipoFilter>('todos');
  const [periodoAtivo, setPeriodoAtivo] = useState<'1' | '3' | '6' | '12' | 'custom'>('12');
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const m = getMesAtual();
    const a = getAnoAtual();
    const totalMes = a * 12 + m - 11;
    return { mes: ((totalMes - 1) % 12) + 1, ano: Math.floor((totalMes - 1) / 12) };
  });
  const [periodoFim, setPeriodoFim] = useState({ mes: getMesAtual(), ano: getAnoAtual() });
  const [showPeriodoPicker, setShowPeriodoPicker] = useState(false);
  const [chartTooltip, setChartTooltip] = useState<ChartTooltip | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const periodoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [uRes, sRes, mRes, aRes] = await Promise.all([
        supabase.from('energia_unidades').select('*'),
        supabase.from('energia_salas').select('*').eq('arquivada', false),
        supabase.from('energia_medicoes').select('*'),
        supabase.from('energia_alugueis').select('*'),
      ]);
      setUnidades((uRes.data as EnergiaUnidade[]) || []);
      setSalas((sRes.data as EnergiaSala[]) || []);
      setMedicoes((mRes.data as EnergiaMedicao[]) || []);
      setAlugueis((aRes.data as EnergiaAluguel[]) || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) {
        setShowPeriodoPicker(false);
      }
    }
    if (showPeriodoPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPeriodoPicker]);

  const filteredSalas = useMemo(() => {
    if (isAdmin) return salas;
    return salas.filter(s => s.unidade_id === user?.unidade_id);
  }, [salas, isAdmin, user]);

  const filteredMedicoes = useMemo(() => {
    const salaIds = new Set(filteredSalas.map(s => s.id));
    return medicoes.filter(m => salaIds.has(m.sala_id));
  }, [medicoes, filteredSalas]);

  const filteredAlugueis = useMemo(() => {
    const salaIds = new Set(filteredSalas.map(s => s.id));
    return alugueis.filter(a => salaIds.has(a.sala_id));
  }, [alugueis, filteredSalas]);

  function applyQuickPeriod(months: number) {
    const m = getMesAtual();
    const a = getAnoAtual();
    const totalMes = a * 12 + m - (months - 1);
    setPeriodoInicio({ mes: ((totalMes - 1) % 12) + 1, ano: Math.floor((totalMes - 1) / 12) });
    setPeriodoFim({ mes: m, ano: a });
    setPeriodoAtivo(String(months) as '1' | '3' | '6' | '12');
  }

  function isInPeriod(mes: number, ano: number) {
    const val = ano * 12 + mes;
    const start = periodoInicio.ano * 12 + periodoInicio.mes;
    const end = periodoFim.ano * 12 + periodoFim.mes;
    return val >= start && val <= end;
  }

  // Previous period helper for variance
  function prevPeriodMonths(): number {
    const start = periodoInicio.ano * 12 + periodoInicio.mes;
    const end = periodoFim.ano * 12 + periodoFim.mes;
    return end - start + 1;
  }

  function isInPrevPeriod(mes: number, ano: number): boolean {
    const months = prevPeriodMonths();
    const val = ano * 12 + mes;
    const end = periodoInicio.ano * 12 + periodoInicio.mes - 1;
    const start = end - months + 1;
    return val >= start && val <= end;
  }

  // Chart data: monthly aggregation with filters
  const chartData = useMemo(() => {
    let relevantMedicoes = filteredMedicoes;
    let relevantAlugueis = filteredAlugueis;
    if (chartUnidadeId) {
      const salasInUnidade = new Set(filteredSalas.filter(s => s.unidade_id === chartUnidadeId).map(s => s.id));
      relevantMedicoes = relevantMedicoes.filter(m => salasInUnidade.has(m.sala_id));
      relevantAlugueis = relevantAlugueis.filter(a => salasInUnidade.has(a.sala_id));
    }
    if (chartSalaId) {
      relevantMedicoes = relevantMedicoes.filter(m => m.sala_id === chartSalaId);
      relevantAlugueis = relevantAlugueis.filter(a => a.sala_id === chartSalaId);
    }
    relevantMedicoes = relevantMedicoes.filter(m => isInPeriod(m.mes, m.ano));
    relevantAlugueis = relevantAlugueis.filter(a => isInPeriod(a.mes, a.ano));

    const monthMap = new Map<string, MonthData>();

    if (chartTipo !== 'aluguel') {
      for (const m of relevantMedicoes) {
        const key = `${m.ano}-${m.mes}`;
        const existing = monthMap.get(key);
        if (existing) {
          existing.consumo += Number(m.consumo);
          existing.custo += Number(m.valor_total);
        } else {
          monthMap.set(key, { mes: m.mes, ano: m.ano, consumo: Number(m.consumo), custo: Number(m.valor_total), aluguel: 0 });
        }
      }
    }
    if (chartTipo !== 'energia') {
      for (const a of relevantAlugueis) {
        const key = `${a.ano}-${a.mes}`;
        const existing = monthMap.get(key);
        if (existing) {
          existing.aluguel += Number(a.valor);
        } else {
          monthMap.set(key, { mes: a.mes, ano: a.ano, consumo: 0, custo: 0, aluguel: Number(a.valor) });
        }
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  }, [filteredMedicoes, filteredAlugueis, filteredSalas, chartUnidadeId, chartSalaId, chartTipo, periodoInicio, periodoFim]);

  const chartSalasForFilter = useMemo(() => {
    if (!chartUnidadeId) return filteredSalas;
    return filteredSalas.filter(s => s.unidade_id === chartUnidadeId);
  }, [filteredSalas, chartUnidadeId]);

  // KPI totals derived from chart data (same filters)
  const consumoTotal = chartData.reduce((s, d) => s + d.consumo, 0);
  const custoTotal = chartData.reduce((s, d) => s + d.custo, 0);
  const aluguelTotal = chartData.reduce((s, d) => s + d.aluguel, 0);

  // Previous period KPIs for variance
  const prevKpis = useMemo(() => {
    let relevantMedicoes = filteredMedicoes.filter(m => isInPrevPeriod(m.mes, m.ano));
    let relevantAlugueis = filteredAlugueis.filter(a => isInPrevPeriod(a.mes, a.ano));
    if (chartUnidadeId) {
      const salasInUnidade = new Set(filteredSalas.filter(s => s.unidade_id === chartUnidadeId).map(s => s.id));
      relevantMedicoes = relevantMedicoes.filter(m => salasInUnidade.has(m.sala_id));
      relevantAlugueis = relevantAlugueis.filter(a => salasInUnidade.has(a.sala_id));
    }
    if (chartSalaId) {
      relevantMedicoes = relevantMedicoes.filter(m => m.sala_id === chartSalaId);
      relevantAlugueis = relevantAlugueis.filter(a => a.sala_id === chartSalaId);
    }
    return {
      consumo: relevantMedicoes.reduce((s, m) => s + Number(m.consumo), 0),
      custo: relevantMedicoes.reduce((s, m) => s + Number(m.valor_total), 0),
      aluguel: relevantAlugueis.reduce((s, a) => s + Number(a.valor), 0),
    };
  }, [filteredMedicoes, filteredAlugueis, filteredSalas, chartUnidadeId, chartSalaId, periodoInicio]);

  // Filtered alugueis for pago count within chart period
  const chartMonthKeys = useMemo(() => new Set(chartData.map(d => `${d.ano}-${d.mes}`)), [chartData]);
  const alugueisInPeriod = useMemo(() => {
    let relevant = filteredAlugueis;
    if (chartUnidadeId) {
      const salasInUnidade = new Set(filteredSalas.filter(s => s.unidade_id === chartUnidadeId).map(s => s.id));
      relevant = relevant.filter(a => salasInUnidade.has(a.sala_id));
    }
    if (chartSalaId) {
      relevant = relevant.filter(a => a.sala_id === chartSalaId);
    }
    return relevant.filter(a => chartMonthKeys.has(`${a.ano}-${a.mes}`));
  }, [filteredAlugueis, filteredSalas, chartUnidadeId, chartSalaId, chartMonthKeys]);
  const aluguelPago = alugueisInPeriod.filter(a => a.pago).length;
  const aluguelPendente = alugueisInPeriod.length - aluguelPago;

  // Pending alugueis for current month
  const mesAtual = getMesAtual();
  const anoAtual = getAnoAtual();
  const alugueisPendentesHoje = useMemo(() => {
    return filteredAlugueis
      .filter(a => a.mes === mesAtual && a.ano === anoAtual && !a.pago)
      .map(a => {
        const sala = filteredSalas.find(s => s.id === a.sala_id);
        const unidade = unidades.find(u => u.id === sala?.unidade_id);
        return { ...a, salaNome: sala?.nome || '', unidadeNome: unidade?.nome || '' };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [filteredAlugueis, filteredSalas, unidades, mesAtual, anoAtual]);

  // Salas counted in chart filters
  const chartFilteredSalas = useMemo(() => {
    let s = filteredSalas;
    if (chartUnidadeId) s = s.filter(x => x.unidade_id === chartUnidadeId);
    if (chartSalaId) s = s.filter(x => x.id === chartSalaId);
    return s;
  }, [filteredSalas, chartUnidadeId, chartSalaId]);

  // Consumo por unidade within chart period
  const consumoPorUnidade = useMemo(() => {
    let relevantMedicoes = filteredMedicoes;
    if (chartUnidadeId) {
      const salasInUnidade = new Set(filteredSalas.filter(s => s.unidade_id === chartUnidadeId).map(s => s.id));
      relevantMedicoes = relevantMedicoes.filter(m => salasInUnidade.has(m.sala_id));
    }
    if (chartSalaId) {
      relevantMedicoes = relevantMedicoes.filter(m => m.sala_id === chartSalaId);
    }
    relevantMedicoes = relevantMedicoes.filter(m => chartMonthKeys.has(`${m.ano}-${m.mes}`));
    const map = new Map<string, number>();
    for (const m of relevantMedicoes) {
      const sala = filteredSalas.find(s => s.id === m.sala_id);
      if (!sala) continue;
      map.set(sala.unidade_id, (map.get(sala.unidade_id) || 0) + Number(m.consumo));
    }
    return unidades
      .filter(u => isAdmin || u.id === user?.unidade_id)
      .map(u => ({ unidade: u.nome, consumo: map.get(u.id) || 0 }))
      .filter(u => u.consumo > 0)
      .sort((a, b) => b.consumo - a.consumo);
  }, [filteredMedicoes, filteredSalas, unidades, isAdmin, user, chartUnidadeId, chartSalaId, chartMonthKeys]);

  // Ranking salas within chart period
  const rankingSalas = useMemo(() => {
    let relevantMedicoes = filteredMedicoes;
    if (chartUnidadeId) {
      const salasInUnidade = new Set(filteredSalas.filter(s => s.unidade_id === chartUnidadeId).map(s => s.id));
      relevantMedicoes = relevantMedicoes.filter(m => salasInUnidade.has(m.sala_id));
    }
    if (chartSalaId) {
      relevantMedicoes = relevantMedicoes.filter(m => m.sala_id === chartSalaId);
    }
    relevantMedicoes = relevantMedicoes.filter(m => chartMonthKeys.has(`${m.ano}-${m.mes}`));
    const salaMap = new Map<string, { consumo: number; valor: number }>();
    for (const m of relevantMedicoes) {
      const existing = salaMap.get(m.sala_id);
      if (existing) {
        existing.consumo += Number(m.consumo);
        existing.valor += Number(m.valor_total);
      } else {
        salaMap.set(m.sala_id, { consumo: Number(m.consumo), valor: Number(m.valor_total) });
      }
    }
    return Array.from(salaMap.entries())
      .map(([salaId, data]) => {
        const sala = filteredSalas.find(s => s.id === salaId);
        const unidade = unidades.find(u => u.id === sala?.unidade_id);
        return { salaNome: sala?.nome || '', unidadeNome: unidade?.nome || '', ...data };
      })
      .sort((a, b) => b.consumo - a.consumo)
      .slice(0, 8);
  }, [filteredMedicoes, filteredSalas, unidades, chartUnidadeId, chartSalaId, chartMonthKeys]);

  const maxRankingConsumo = rankingSalas.length > 0 ? rankingSalas[0].consumo : 1;

  const chartMaxVal = useMemo(() => {
    if (chartData.length === 0) return 1;
    if (chartTipo === 'energia') return Math.max(...chartData.map(d => d.custo), 1);
    if (chartTipo === 'aluguel') return Math.max(...chartData.map(d => d.aluguel), 1);
    return Math.max(...chartData.map(d => Math.max(d.custo, d.aluguel)), 1);
  }, [chartData, chartTipo]);

  const chartHeight = 260;
  const barWidth = chartTipo === 'todos' ? 22 : 36;
  const groupWidth = chartTipo === 'todos' ? barWidth * 2 + 44 : barWidth + 32;
  const totalChartWidth = chartData.length * groupWidth;
  const ySteps = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(chartMaxVal * f));

  const maxConsumo = consumoPorUnidade.length > 0 ? Math.max(...consumoPorUnidade.map(c => c.consumo)) : 1;

  function getBarH(val: number) {
    return Math.max((val / chartMaxVal) * chartHeight, val > 0 ? 3 : 0);
  }

  function handleChartMouseEnter(e: React.MouseEvent, item: MonthData, idx: number) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const prevItem = idx > 0 ? chartData[idx - 1] : null;
    setChartTooltip({ item, prevItem, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleChartMouseMove(e: React.MouseEvent) {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    setChartTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  }

  // Welcome greeting based on time
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nomeExibido = user?.nome?.split(' ')[0] || 'usuário';

  // Date display
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <EnergiaLayout title="Dashboard" subtitle="Resumo de imóveis">
        <div className="p-6 space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="skeleton h-4 w-32 rounded-lg" />
            <div className="skeleton h-8 w-64 rounded-xl" />
            <div className="skeleton h-4 w-48 rounded-lg" />
          </div>
          {/* KPI skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-9 w-9 rounded-lg" />
                  <div className="skeleton h-4 w-12 rounded-full" />
                </div>
                <div className="skeleton h-7 w-28 rounded-lg" />
                <div className="skeleton h-3 w-20 rounded-lg" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="skeleton h-4 w-24 rounded-lg" />
                <div className="skeleton h-3 w-36 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-28 rounded-lg" />
                <div className="skeleton h-8 w-28 rounded-lg" />
              </div>
            </div>
            <div className="skeleton rounded-xl" style={{ height: chartHeight }} />
          </div>
          {/* Bottom grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-4 w-32 rounded-lg" />
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="skeleton h-6 w-6 rounded-full" />
                    <div className="flex-1 skeleton h-3 rounded-full" />
                    <div className="skeleton h-3 w-16 rounded-lg" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </EnergiaLayout>
    );
  }

  return (
    <EnergiaLayout title="Dashboard" subtitle="Resumo de imóveis e locação">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1 capitalize">{dataFormatada}</p>
            <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">
              {saudacao}, {nomeExibido}
            </h1>
            <p className="font-body text-sm text-text-tertiary mt-1">
              {filteredSalas.length} salas ativas &middot; {unidades.filter(u => isAdmin || u.id === user?.unidade_id).length} unidades
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {alugueisPendentesHoje.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-status-warningLight border border-status-warning/20 rounded-full">
                <AlertCircle className="w-3 h-3 text-status-warning" />
                <span className="font-body text-xs font-semibold text-status-warning">
                  {alugueisPendentesHoje.length} aluguel{alugueisPendentesHoje.length > 1 ? 'is' : ''} pendente{alugueisPendentesHoje.length > 1 ? 's' : ''} este mês
                </span>
              </div>
            )}
            {aluguelPendente === 0 && alugueisInPeriod.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-status-successLight border border-status-success/20 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-status-success" />
                <span className="font-body text-xs font-semibold text-status-success">Todos aluguéis pagos</span>
              </div>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Consumo */}
          {(() => {
            const vPct = varPct(consumoTotal, prevKpis.consumo);
            return (
              <div className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4.5 h-4.5 text-text-secondary" />
                  </div>
                  {vPct !== null && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-data ${
                      vPct > 5 ? 'bg-status-errorLight text-status-error' :
                      vPct < -5 ? 'bg-status-successLight text-status-success' :
                      'bg-surface-2 text-text-tertiary'
                    }`}>
                      {vPct > 5 ? <TrendingUp className="w-2.5 h-2.5" /> : vPct < -5 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                      {vPct > 0 ? '+' : ''}{vPct.toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="font-display font-bold text-xl text-text-primary leading-tight">{formatKWh(consumoTotal)}</p>
                <p className="font-body text-xs text-text-tertiary mt-1">Consumo no período</p>
              </div>
            );
          })()}

          {/* Custo Energia */}
          {(() => {
            const vPct = varPct(custoTotal, prevKpis.custo);
            return (
              <div className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-mos-50 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4.5 h-4.5 text-mos-700" />
                  </div>
                  {vPct !== null && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-data ${
                      vPct > 5 ? 'bg-status-errorLight text-status-error' :
                      vPct < -5 ? 'bg-status-successLight text-status-success' :
                      'bg-surface-2 text-text-tertiary'
                    }`}>
                      {vPct > 5 ? <TrendingUp className="w-2.5 h-2.5" /> : vPct < -5 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                      {vPct > 0 ? '+' : ''}{vPct.toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="font-display font-bold text-xl text-text-primary leading-tight">{formatCurrencyBR(custoTotal)}</p>
                <p className="font-body text-xs text-text-tertiary mt-1">Custo de energia</p>
              </div>
            );
          })()}

          {/* Aluguel */}
          {(() => {
            const vPct = varPct(aluguelTotal, prevKpis.aluguel);
            const allPaid = aluguelPendente === 0 && alugueisInPeriod.length > 0;
            return (
              <div className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center flex-shrink-0">
                    <Home className="w-4.5 h-4.5 text-[#0ea5e9]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {vPct !== null && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-data ${
                        vPct > 5 ? 'bg-status-errorLight text-status-error' :
                        vPct < -5 ? 'bg-status-successLight text-status-success' :
                        'bg-surface-2 text-text-tertiary'
                      }`}>
                        {vPct > 5 ? <TrendingUp className="w-2.5 h-2.5" /> : vPct < -5 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                        {vPct > 0 ? '+' : ''}{vPct.toFixed(1)}%
                      </div>
                    )}
                    {allPaid && <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />}
                  </div>
                </div>
                <p className="font-display font-bold text-xl text-text-primary leading-tight">{formatCurrencyBR(aluguelTotal)}</p>
                <p className="font-body text-xs mt-1">
                  <span className="text-text-tertiary">Aluguel — </span>
                  <span className={aluguelPendente > 0 ? 'text-status-warning font-semibold' : 'text-status-success font-semibold'}>
                    {aluguelPago}/{alugueisInPeriod.length} pagos
                  </span>
                </p>
              </div>
            );
          })()}

          {/* Custo Total */}
          <div className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-status-warningLight flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4.5 h-4.5 text-status-warning" />
              </div>
              {(() => {
                const total = custoTotal + aluguelTotal;
                const prevTotal = prevKpis.custo + prevKpis.aluguel;
                const vPct = varPct(total, prevTotal);
                return vPct !== null ? (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-data ${
                    vPct > 5 ? 'bg-status-errorLight text-status-error' :
                    vPct < -5 ? 'bg-status-successLight text-status-success' :
                    'bg-surface-2 text-text-tertiary'
                  }`}>
                    {vPct > 5 ? <TrendingUp className="w-2.5 h-2.5" /> : vPct < -5 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                    {vPct > 0 ? '+' : ''}{vPct.toFixed(1)}%
                  </div>
                ) : null;
              })()}
            </div>
            <p className="font-display font-bold text-xl text-text-primary leading-tight">{formatCurrencyBR(custoTotal + aluguelTotal)}</p>
            <p className="font-body text-xs text-text-tertiary mt-1">Custo total no período</p>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="card overflow-hidden">
          {/* Chart header */}
          <div className="px-5 pt-5 pb-4 border-b border-surface-2 bg-surface-1/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-sm text-text-primary">Histórico Mensal</h3>
                <p className="font-body text-xs text-text-tertiary mt-0.5">Energia vs Aluguel em R$</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Unidade filter */}
                <div className="relative">
                  <select
                    value={chartUnidadeId}
                    onChange={e => { setChartUnidadeId(e.target.value); setChartSalaId(''); }}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors cursor-pointer"
                  >
                    <option value="">Todas Unidades</option>
                    {unidades.filter(u => isAdmin || u.id === user?.unidade_id).map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
                </div>
                {/* Sala filter */}
                <div className="relative">
                  <select
                    value={chartSalaId}
                    onChange={e => setChartSalaId(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors cursor-pointer"
                  >
                    <option value="">Todas Salas</option>
                    {chartSalasForFilter.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
                </div>
                {/* Tipo filter */}
                <div className="flex items-center gap-0.5 bg-surface-1 rounded-lg p-1 border border-surface-2">
                  {([['todos', 'Todos'], ['energia', 'Energia'], ['aluguel', 'Aluguel']] as [TipoFilter, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setChartTipo(val)}
                      className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                        chartTipo === val
                          ? 'bg-white text-text-primary shadow-card border border-surface-3'
                          : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Quick period */}
                <div className="flex items-center gap-0.5 bg-surface-1 rounded-lg p-1 border border-surface-2">
                  {([['1', '1M'], ['3', '3M'], ['6', '6M'], ['12', '12M']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => applyQuickPeriod(Number(val))}
                      className={`px-2.5 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                        periodoAtivo === val
                          ? 'bg-white text-text-primary shadow-card border border-surface-3'
                          : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Period picker */}
                <div className="relative" ref={periodoRef}>
                  <button
                    onClick={() => setShowPeriodoPicker(!showPeriodoPicker)}
                    className={`flex items-center gap-1.5 pl-3 pr-3 py-1.5 border rounded-lg font-body text-xs text-text-primary hover:border-mos-700/40 focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors cursor-pointer ${
                      periodoAtivo === 'custom' ? 'bg-mos-50 border-mos-700/30 text-mos-700' : 'bg-surface-0 border-surface-3'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-current opacity-60" />
                    <span>{formatMesAno(periodoInicio.mes, periodoInicio.ano)} — {formatMesAno(periodoFim.mes, periodoFim.ano)}</span>
                  </button>
                  {showPeriodoPicker && (
                    <div className="absolute right-0 top-full mt-2 z-30 bg-surface-0 border border-surface-3 rounded-xl shadow-modal p-4 w-[320px]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1.5">INÍCIO</label>
                          <div className="flex gap-1.5">
                            <select
                              value={periodoInicio.mes}
                              onChange={e => { setPeriodoInicio(p => ({ ...p, mes: Number(e.target.value) })); setPeriodoAtivo('custom'); }}
                              className="flex-1 appearance-none px-2 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors cursor-pointer"
                            >
                              {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                            </select>
                            <select
                              value={periodoInicio.ano}
                              onChange={e => { setPeriodoInicio(p => ({ ...p, ano: Number(e.target.value) })); setPeriodoAtivo('custom'); }}
                              className="w-[70px] appearance-none px-2 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors cursor-pointer"
                            >
                              {Array.from({ length: 6 }, (_, i) => getAnoAtual() - 4 + i).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block font-body text-[10px] font-semibold text-text-tertiary tracking-widest mb-1.5">FIM</label>
                          <div className="flex gap-1.5">
                            <select
                              value={periodoFim.mes}
                              onChange={e => { setPeriodoFim(p => ({ ...p, mes: Number(e.target.value) })); setPeriodoAtivo('custom'); }}
                              className="flex-1 appearance-none px-2 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors cursor-pointer"
                            >
                              {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                            </select>
                            <select
                              value={periodoFim.ano}
                              onChange={e => { setPeriodoFim(p => ({ ...p, ano: Number(e.target.value) })); setPeriodoAtivo('custom'); }}
                              className="w-[70px] appearance-none px-2 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors cursor-pointer"
                            >
                              {Array.from({ length: 6 }, (_, i) => getAnoAtual() - 4 + i).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end mt-3 pt-3 border-t border-surface-2">
                        <button onClick={() => setShowPeriodoPicker(false)} className="btn-primary text-xs px-3 py-1.5">
                          Aplicar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Legend row */}
            <div className="flex items-center gap-4 mt-3">
              {chartTipo !== 'aluguel' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-[3px] inline-block bg-chart-realizado" />
                  <span className="font-body text-xs text-text-secondary font-medium">Energia (R$)</span>
                </div>
              )}
              {chartTipo !== 'energia' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-[3px] inline-block bg-[#0ea5e9]" />
                  <span className="font-body text-xs text-text-secondary font-medium">Aluguel (R$)</span>
                </div>
              )}
              <div className="ml-auto">
                <span className="font-body text-[10px] text-text-disabled">
                  {chartData.length} {chartData.length === 1 ? 'mês' : 'meses'} · {chartFilteredSalas.length} {chartFilteredSalas.length === 1 ? 'sala' : 'salas'}
                </span>
              </div>
            </div>
          </div>

          {/* Chart body */}
          <div className="p-5">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3" style={{ height: chartHeight }}>
                <div className="w-12 h-12 rounded-full bg-surface-1 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-text-disabled" />
                </div>
                <div className="text-center">
                  <p className="font-body text-sm font-medium text-text-secondary">Sem dados para o período</p>
                  <p className="font-body text-xs text-text-disabled mt-0.5">Ajuste os filtros ou registre medições</p>
                </div>
              </div>
            ) : (
              <div ref={chartRef} className="w-full overflow-x-auto relative select-none">
                <div style={{ minWidth: `${totalChartWidth + 60}px`, width: '100%' }}>
                  <div className="flex">
                    {/* Y-axis */}
                    <div className="flex flex-col justify-between pr-3 pb-6 shrink-0" style={{ height: `${chartHeight + 24}px` }}>
                      {[...ySteps].reverse().map((v, i) => (
                        <span key={i} className="font-data text-[10px] text-text-tertiary text-right leading-none w-12">
                          {formatVal(v)}
                        </span>
                      ))}
                    </div>

                    {/* Bars + grid */}
                    <div className="flex-1 relative">
                      {/* Horizontal grid lines */}
                      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: `${chartHeight}px` }}>
                        {[0.25, 0.5, 0.75].map((f, i) => (
                          <div
                            key={i}
                            className="absolute w-full border-t border-surface-2 border-dashed"
                            style={{ top: `${(1 - f) * 100}%` }}
                          />
                        ))}
                        <div className="absolute bottom-0 w-full border-t border-surface-3" />
                      </div>

                      <div className="flex items-end" style={{ height: `${chartHeight}px` }}>
                        {chartData.map((item, i) => {
                          const energiaH = chartTipo !== 'aluguel' ? getBarH(item.custo) : 0;
                          const aluguelH = chartTipo !== 'energia' ? getBarH(item.aluguel) : 0;
                          return (
                            <div
                              key={i}
                              className="flex flex-col items-center cursor-pointer group"
                              style={{ flex: 1, minWidth: `${groupWidth}px` }}
                              onMouseEnter={e => handleChartMouseEnter(e, item, i)}
                              onMouseMove={handleChartMouseMove}
                              onMouseLeave={() => setChartTooltip(null)}
                            >
                              <div className="flex items-end gap-1.5">
                                {chartTipo !== 'aluguel' && (
                                  <div className="flex flex-col items-center">
                                    {energiaH > 0 && (
                                      <span className="font-data text-[9px] text-mos-700 mb-0.5 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                        {formatVal(item.custo)}
                                      </span>
                                    )}
                                    <div
                                      className="rounded-t-[4px] transition-all duration-300 bg-chart-realizado group-hover:opacity-80"
                                      style={{ width: `${barWidth}px`, height: `${energiaH}px` }}
                                    />
                                  </div>
                                )}
                                {chartTipo !== 'energia' && (
                                  <div className="flex flex-col items-center">
                                    {aluguelH > 0 && (
                                      <span className="font-data text-[9px] text-[#0ea5e9] mb-0.5 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                        {formatVal(item.aluguel)}
                                      </span>
                                    )}
                                    <div
                                      className="rounded-t-[4px] transition-all duration-300 bg-[#0ea5e9] group-hover:opacity-80"
                                      style={{ width: `${barWidth}px`, height: `${aluguelH}px` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* X-axis labels */}
                      <div className="flex pt-2">
                        {chartData.map((item, i) => (
                          <div key={i} style={{ flex: 1, minWidth: `${groupWidth}px` }} className="flex justify-center">
                            <span className="font-data text-[10px] text-text-tertiary">
                              {MESES_ABREV[item.mes - 1]}/{String(item.ano).slice(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tooltip */}
                {chartTooltip && (() => {
                  const containerW = chartRef.current?.clientWidth ?? 500;
                  const tooltipW = 220;
                  const left = chartTooltip.x + 14 + tooltipW > containerW ? chartTooltip.x - tooltipW - 8 : chartTooltip.x + 14;
                  const top = Math.max(chartTooltip.y - 110, 0);
                  const prev = chartTooltip.prevItem;
                  const custoPct = prev ? varPct(chartTooltip.item.custo, prev.custo) : null;
                  const aluguelPctVal = prev ? varPct(chartTooltip.item.aluguel, prev.aluguel) : null;

                  return (
                    <div className="absolute z-20 pointer-events-none" style={{ left, top }}>
                      <div className="bg-text-primary rounded-xl shadow-modal px-4 py-3 border border-white/5" style={{ width: tooltipW }}>
                        <p className="font-display font-bold text-sm text-white mb-2.5">
                          {MESES_ABREV[chartTooltip.item.mes - 1]} / {chartTooltip.item.ano}
                        </p>
                        <div className="space-y-2">
                          {chartTipo !== 'aluguel' && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-[2px] bg-chart-realizado inline-block shrink-0" />
                                <span className="font-body text-xs text-white/60">Energia</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {custoPct !== null && (
                                  <span className={`font-data text-[10px] font-semibold ${custoPct > 5 ? 'text-red-300' : custoPct < -5 ? 'text-green-300' : 'text-white/40'}`}>
                                    {custoPct > 0 ? '+' : ''}{custoPct.toFixed(1)}%
                                  </span>
                                )}
                                <span className="font-data text-xs font-semibold text-white">{formatCurrencyBR(chartTooltip.item.custo)}</span>
                              </div>
                            </div>
                          )}
                          {chartTipo !== 'energia' && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-[2px] bg-[#0ea5e9] inline-block shrink-0" />
                                <span className="font-body text-xs text-white/60">Aluguel</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {aluguelPctVal !== null && (
                                  <span className={`font-data text-[10px] font-semibold ${aluguelPctVal > 5 ? 'text-red-300' : aluguelPctVal < -5 ? 'text-green-300' : 'text-white/40'}`}>
                                    {aluguelPctVal > 0 ? '+' : ''}{aluguelPctVal.toFixed(1)}%
                                  </span>
                                )}
                                <span className="font-data text-xs font-semibold text-white">{formatCurrencyBR(chartTooltip.item.aluguel)}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                            <span className="font-body text-xs text-white/60">Consumo kWh</span>
                            <span className="font-data text-xs font-semibold text-white">{formatKWh(chartTooltip.item.consumo)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Bottom grid: 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Consumo por Unidade */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-text-primary">Consumo por Unidade</h3>
              {consumoPorUnidade.length > 0 && (
                <span className="font-data text-xs text-text-tertiary">{formatKWh(consumoTotal)}</span>
              )}
            </div>
            {consumoPorUnidade.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-surface-1 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-text-disabled" />
                </div>
                <p className="font-body text-sm text-text-tertiary">Sem dados para este período</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consumoPorUnidade.map((item, i) => {
                  const pct = Math.max(2, (item.consumo / maxConsumo) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-body text-sm text-text-primary font-medium truncate mr-2">{item.unidade}</span>
                        <span className="font-data text-sm font-semibold text-text-primary shrink-0">{formatKWh(item.consumo)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-mos-700 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="font-data text-[10px] text-text-tertiary mt-1">
                        {((item.consumo / maxConsumo) * 100).toFixed(1)}% do total
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ranking de Salas */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-text-primary">Top Salas — Consumo</h3>
              {rankingSalas.length > 0 && (
                <span className="font-body text-[10px] text-text-disabled">{rankingSalas.length} salas</span>
              )}
            </div>
            {rankingSalas.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-surface-1 flex items-center justify-center">
                  <DoorOpen className="w-4.5 h-4.5 text-text-disabled" />
                </div>
                <p className="font-body text-sm text-text-tertiary">Sem dados para este período</p>
              </div>
            ) : (
              <div className="space-y-1">
                {rankingSalas.map((item, i) => {
                  const medalColors = [
                    'bg-yellow-50 text-yellow-600 border border-yellow-200',
                    'bg-gray-100 text-gray-500 border border-gray-200',
                    'bg-orange-50 text-orange-500 border border-orange-200',
                  ];
                  const pct = Math.max(4, (item.consumo / maxRankingConsumo) * 100);
                  return (
                    <div key={i} className="group py-2 px-2 rounded-lg hover:bg-surface-1 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                          i < 3 ? medalColors[i] : 'bg-surface-1 text-text-tertiary border border-surface-2'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs text-text-primary font-medium truncate">{item.salaNome}</p>
                          <p className="font-body text-[10px] text-text-disabled truncate">{item.unidadeNome}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-data text-xs font-semibold text-text-primary">{formatKWh(item.consumo)}</p>
                          <p className="font-data text-[10px] text-text-tertiary">{formatCurrencyBR(item.valor)}</p>
                        </div>
                      </div>
                      <div className="mt-1.5 ml-7 h-1 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-mos-700/60 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aluguéis Pendentes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-text-primary">Aluguéis Pendentes</h3>
              <span className="font-body text-[10px] text-text-disabled">
                {MESES_ABREV[mesAtual - 1]}/{anoAtual}
              </span>
            </div>
            {alugueisPendentesHoje.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-status-successLight flex items-center justify-center">
                  <CheckCircle2 className="w-4.5 h-4.5 text-status-success" />
                </div>
                <p className="font-body text-sm font-medium text-status-success">Tudo em dia!</p>
                <p className="font-body text-xs text-text-tertiary">Nenhum aluguel pendente este mês</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest">SALA</span>
                  <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest">VALOR</span>
                </div>
                <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
                  {alugueisPendentesHoje.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-surface-1 transition-colors group">
                      <div className="w-1.5 h-1.5 rounded-full bg-status-warning flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-text-primary font-medium truncate">{item.salaNome}</p>
                        <p className="font-body text-[10px] text-text-disabled truncate">{item.unidadeNome}</p>
                      </div>
                      <span className="font-data text-xs font-semibold text-status-warning shrink-0">
                        {formatCurrencyBR(item.valor)}
                      </span>
                    </div>
                  ))}
                </div>
                {alugueisPendentesHoje.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-surface-2 flex items-center justify-between px-2">
                    <span className="font-body text-xs text-text-tertiary">Total pendente</span>
                    <span className="font-data text-sm font-bold text-status-warning">
                      {formatCurrencyBR(alugueisPendentesHoje.reduce((s, a) => s + a.valor, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </EnergiaLayout>
  );
}
