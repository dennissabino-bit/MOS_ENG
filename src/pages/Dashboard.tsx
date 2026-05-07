import { useState, useMemo, useRef, useEffect } from 'react';
import { DollarSign, Wallet, ClipboardList, ChevronDown, Calendar, X, TrendingUp } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { KpiCard } from '../components/dashboard/KpiCard';
import { FluxoBarChart } from '../components/shared/FluxoBarChart';
import { CustoRow } from '../components/dashboard/CustoRow';
import { formatCurrency } from '../lib/formatters';
import { useDashboardData } from '../hooks/useDashboardData';
import { useObras } from '../hooks/useObras';
import type { DashboardFilters, PeriodoFilter } from '../hooks/useDashboardData';

const PERIODO_OPTS: { id: PeriodoFilter; label: string }[] = [
  { id: '6M', label: '6M' },
  { id: '12M', label: '12M' },
  { id: 'ALL', label: 'Todos' },
];

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({
    obraId: null,
    periodo: '6M',
    dataInicio: null,
    dataFim: null,
  });

  const [obraDropdownOpen, setObraDropdownOpen] = useState(false);
  const obraDropdownRef = useRef<HTMLDivElement>(null);
  const dataInicioRef = useRef<HTMLInputElement>(null);
  const dataFimRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (obraDropdownRef.current && !obraDropdownRef.current.contains(e.target as Node)) {
        setObraDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function setFilter<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function setPeriodo(p: PeriodoFilter) {
    setFilters(prev => ({ ...prev, periodo: p, dataInicio: null, dataFim: null }));
  }

  function clearDates() {
    setFilters(prev => ({ ...prev, dataInicio: null, dataFim: null }));
  }

  const { obras } = useObras();
  const { fluxoData, kpis, loading } = useDashboardData(filters);

  const obraAtual = filters.obraId ? obras.find(o => o.id === filters.obraId) ?? null : null;

  const custoObras = useMemo(() => {
    return filters.obraId
      ? obras.filter(o => o.id === filters.obraId)
      : obras;
  }, [filters.obraId, obras]);

  const totalMax = useMemo(() => Math.max(...custoObras.map(o => o.orcado), 1), [custoObras]);

  const hasDateFilter = filters.dataInicio || filters.dataFim;

  const pctRealizado = kpis.totalOrcado > 0
    ? ((kpis.totalRealizado / kpis.totalOrcado) * 100).toFixed(1)
    : '0.0';

  return (
    <AppLayout title="Dashboard" subtitle="Visão consolidada de obras, orçamentos e KPIs">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div ref={obraDropdownRef} className="relative">
            <div className="flex items-center gap-2 bg-surface-0 border border-surface-3 rounded-lg px-3 py-2 shadow-card">
              <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-wider">OBRA</span>
              <button
                className="flex items-center gap-1.5 font-body text-sm font-medium text-text-primary"
                onClick={() => setObraDropdownOpen(v => !v)}
              >
                {obraAtual ? obraAtual.nome : 'Todas as obras'}
                <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-150 ${obraDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {obraDropdownOpen && (
              <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-surface-3 rounded-xl shadow-modal overflow-hidden min-w-[220px]">
                <button
                  className={`w-full text-left px-4 py-2.5 font-body text-sm transition-colors hover:bg-surface-1 ${filters.obraId === null ? 'text-mos-700 font-semibold bg-surface-1' : 'text-text-primary'}`}
                  onClick={() => { setFilter('obraId', null); setObraDropdownOpen(false); }}
                >
                  Todas as obras
                </button>
                {obras.map(obra => (
                  <button
                    key={obra.id}
                    className={`w-full text-left px-4 py-2.5 font-body text-sm transition-colors hover:bg-surface-1 border-t border-surface-2 ${filters.obraId === obra.id ? 'text-mos-700 font-semibold bg-surface-1' : 'text-text-primary'}`}
                    onClick={() => { setFilter('obraId', obra.id); setObraDropdownOpen(false); }}
                  >
                    {obra.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-surface-0 border border-surface-3 rounded-lg p-1 shadow-card">
            {PERIODO_OPTS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setPeriodo(opt.id)}
                className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                  filters.periodo === opt.id && !hasDateFilter
                    ? 'bg-mos-700 text-white shadow-card'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-1'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-surface-0 border border-surface-3 rounded-lg px-3 py-2 shadow-card">
            <label className="relative flex items-center gap-1.5 cursor-pointer" style={{ minHeight: '24px' }}>
              <Calendar className="w-3.5 h-3.5 text-text-tertiary pointer-events-none relative z-10" />
              <span className={`font-body text-sm pointer-events-none relative z-10 ${filters.dataInicio ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>
                {filters.dataInicio ? formatDateBR(filters.dataInicio) : 'Data Inicial'}
              </span>
              <input
                ref={dataInicioRef}
                type="date"
                className="absolute inset-0 w-full h-full cursor-pointer border-0 bg-transparent focus:outline-none"
                style={{ colorScheme: 'light', color: 'transparent', caretColor: 'transparent' }}
                value={filters.dataInicio ?? ''}
                onChange={e => setFilters(prev => ({ ...prev, dataInicio: e.target.value || null }))}
              />
            </label>
            <span className="text-text-tertiary mx-1">→</span>
            <label className="relative flex items-center gap-1.5 cursor-pointer" style={{ minHeight: '24px' }}>
              <Calendar className="w-3.5 h-3.5 text-text-tertiary pointer-events-none relative z-10" />
              <span className={`font-body text-sm pointer-events-none relative z-10 ${filters.dataFim ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>
                {filters.dataFim ? formatDateBR(filters.dataFim) : 'Data Final'}
              </span>
              <input
                ref={dataFimRef}
                type="date"
                className="absolute inset-0 w-full h-full cursor-pointer border-0 bg-transparent focus:outline-none"
                style={{ colorScheme: 'light', color: 'transparent', caretColor: 'transparent' }}
                value={filters.dataFim ?? ''}
                onChange={e => setFilters(prev => ({ ...prev, dataFim: e.target.value || null }))}
              />
            </label>
            {hasDateFilter && (
              <button onClick={clearDates} className="ml-1 p-0.5 rounded hover:bg-surface-2 transition-colors relative z-30">
                <X className="w-3 h-3 text-text-tertiary" />
              </button>
            )}
          </div>
        </div>

        <div className={`flex flex-wrap gap-4 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <KpiCard
            icon={<DollarSign className="w-4.5 h-4.5 text-mos-700" />}
            label="Orçamento Total (EAP)"
            value={formatCurrency(kpis.totalOrcado)}
            trend={0}
          />
          <KpiCard
            icon={<TrendingUp className="w-4.5 h-4.5 text-status-success" />}
            label={`Realizado · ${pctRealizado}% do orçado`}
            value={formatCurrency(kpis.totalRealizado)}
            trend={parseFloat(pctRealizado)}
          />
          <KpiCard
            icon={<Wallet className="w-4.5 h-4.5 text-status-warning" />}
            label="Saldo Disponível"
            value={formatCurrency(kpis.orcamentoDisponivel)}
            trend={kpis.orcamentoDisponivel >= 0 ? 0 : -1}
          />
          <KpiCard
            icon={<ClipboardList className="w-4.5 h-4.5 text-status-info" />}
            label="Fornecedores Ativos"
            value="34"
            trend={5}
          />
        </div>

        <div className={`card p-6 w-full transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="mb-4">
            <h2 className="font-display font-bold text-base text-text-primary">Fluxo Financeiro</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">
              Orçado vs. Realizado · {obraAtual ? obraAtual.nome : 'todas as obras'}
              {hasDateFilter && filters.dataInicio && filters.dataFim
                ? ` · ${formatDateBR(filters.dataInicio)} – ${formatDateBR(filters.dataFim)}`
                : !hasDateFilter
                ? ` · ${PERIODO_OPTS.find(p => p.id === filters.periodo)?.label ?? ''}`
                : ''}
            </p>
          </div>
          <FluxoBarChart
            data={fluxoData}
            showPeriodFilter={false}
            defaultPeriodo="ALL"
          />
        </div>

        <div className={`card p-6 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">Custo por Empreendimento</h2>
              <p className="font-body text-xs text-text-tertiary mt-0.5">% do orçamento consumido · barra proporcional ao total geral</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-xl text-text-primary">
                {formatCurrency(kpis.totalOrcado)}
              </span>
              <div className="text-right">
                <p className="font-body text-[10px] text-text-tertiary">
                  total · {obraAtual ? obraAtual.nome : 'todas as obras'}
                </p>
              </div>
              <button className="flex items-center gap-1 bg-surface-1 border border-surface-3 rounded-lg px-3 py-1.5">
                <span className="font-body text-xs font-medium text-text-primary">Por Obra</span>
                <ChevronDown className="w-3 h-3 text-text-tertiary" />
              </button>
            </div>
          </div>
          <div className="mt-4">
            {custoObras.map(obra => (
              <CustoRow key={obra.id} obra={obra} totalMax={totalMax} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
