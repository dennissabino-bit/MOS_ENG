import { DollarSign, TrendingUp, AlertTriangle, ShoppingCart, TrendingDown } from 'lucide-react';
import type { Obra, FluxoFinanceiro, CurvaS } from '../../../lib/database.types';
import type { ObraKpis } from '../../../hooks/useObraData';
import { formatCurrency, formatCurrencyMi } from '../../../lib/formatters';
import { FluxoBarChart } from '../../shared/FluxoBarChart';
import { CurvaSChart } from '../../shared/CurvaSChart';

interface VisaoGeralTabProps {
  obra: Obra;
  kpis: ObraKpis;
  fluxo: FluxoFinanceiro[];
  curvaS: CurvaS[];
  cotacoesAbertas: number;
}

export function VisaoGeralTab({ obra, kpis, fluxo, curvaS, cotacoesAbertas }: VisaoGeralTabProps) {
  const { totalOrcado, totalRealizado, desvio, desvioPercent, isOver } = kpis;
  const desvioAbs = Math.abs(desvio);
  const pctRealizado = totalOrcado > 0 ? Math.round((totalRealizado / totalOrcado) * 100) : 0;

  const kpiCards = [
    {
      icon: <DollarSign className="w-5 h-5 text-white" />,
      iconBg: 'bg-mos-700',
      label: 'Orçamento Total',
      value: formatCurrencyMi(totalOrcado),
      sub: obra.codigo,
      trend: null as string | null,
      trendUp: false,
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      iconBg: 'bg-status-success',
      label: 'Realizado Total',
      value: formatCurrencyMi(totalRealizado),
      sub: `${pctRealizado}% do orçamento · via Medições`,
      trend: `+${desvioPercent}%`,
      trendUp: true,
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      iconBg: isOver ? 'bg-status-error' : 'bg-status-warning',
      label: 'Desvio Acumulado',
      value: formatCurrency(desvioAbs),
      sub: isOver ? 'Estouro de custo' : 'Dentro do orçamento',
      trend: `${isOver ? '+' : '-'}${desvioPercent}%`,
      trendUp: !isOver,
    },
    {
      icon: <ShoppingCart className="w-5 h-5 text-white" />,
      iconBg: 'bg-text-secondary',
      label: 'Cotações Abertas',
      value: String(cotacoesAbertas),
      sub: cotacoesAbertas === 0 ? 'Nenhuma em aberto' : `${cotacoesAbertas} em aberto`,
      trend: null as string | null,
      trendUp: false,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.iconBg}`}>
                {k.icon}
              </div>
              {k.trend && (
                <span className={`flex items-center gap-0.5 font-data text-xs font-semibold ${k.trendUp ? 'text-status-success' : 'text-status-error'}`}>
                  {k.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {k.trend}
                </span>
              )}
            </div>
            <p className="font-display font-bold text-xl text-text-primary mb-0.5">{k.value}</p>
            <p className="font-body text-xs font-semibold text-text-secondary mb-1">{k.label}</p>
            <p className="font-body text-xs text-text-tertiary leading-snug">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card p-5 w-full">
        <div className="mb-3">
          <h3 className="font-display font-semibold text-sm text-text-primary">Fluxo Financeiro Acumulado</h3>
          <p className="font-body text-xs text-text-tertiary mt-0.5">Orçado vs. Realizado · {obra.nome}</p>
        </div>
        <FluxoBarChart
          data={fluxo}
          showPeriodFilter
          defaultPeriodo="todos"
          height={180}
          fullWidth
        />
      </div>

      <div className="card p-5 w-full">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-sm text-text-primary">Curva S — Avanço Físico Acumulado</h3>
          <p className="font-body text-xs text-text-tertiary mt-0.5">Progresso planejado vs. realizado (%) · {obra.nome}</p>
        </div>
        <CurvaSChart data={curvaS} showPeriodFilter defaultPeriodo="todos" showMensal={false} height={240} />
      </div>
    </div>
  );
}
