import { useState, useRef } from 'react';
import { formatMonthYear } from '../../lib/formatters';
import type { FluxoFinanceiro } from '../../lib/database.types';

type PeriodoFilter = '6M' | '12M' | 'todos' | 'ALL';

interface FluxoBarChartProps {
  data: FluxoFinanceiro[];
  showPeriodFilter?: boolean;
  defaultPeriodo?: PeriodoFilter;
  height?: number;
}

function formatVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function formatFull(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface TooltipState {
  item: FluxoFinanceiro;
  x: number;
  y: number;
}

const PERIODO_OPTS: { id: PeriodoFilter; label: string }[] = [
  { id: '6M', label: '6M' },
  { id: '12M', label: '12M' },
  { id: 'todos', label: 'Todos' },
];

export function FluxoBarChart({
  data,
  showPeriodFilter = true,
  defaultPeriodo = '6M',
  height = 200,
  fullWidth = false,
}: FluxoBarChartProps & { fullWidth?: boolean }) {
  const [periodo, setPeriodo] = useState<PeriodoFilter>(defaultPeriodo);
  const [showOrcado, setShowOrcado] = useState(true);
  const [showRealizado, setShowRealizado] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = [...data].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);

  const filtered: FluxoFinanceiro[] = (() => {
    if (periodo === 'todos' || periodo === 'ALL') return sorted;
    const count = periodo === '6M' ? 6 : 12;
    return sorted.slice(-count);
  })();

  if (!filtered.length) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="font-body text-sm text-text-disabled">Sem dados para o período selecionado.</p>
      </div>
    );
  }

  const activeValues = filtered.flatMap(d => {
    const vals: number[] = [];
    if (showOrcado) vals.push(d.orcado);
    if (showRealizado) vals.push(d.realizado);
    return vals;
  });
  const maxVal = Math.max(...activeValues, 1);

  const barWidth = 26;
  const groupGap = 6;
  const groupWidth = barWidth * 2 + groupGap + 24;
  const totalWidth = filtered.length * groupWidth;
  const ySteps = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  function getBarH(val: number) {
    return Math.max((val / maxVal) * height, val > 0 ? 3 : 0);
  }

  function handleMouseEnter(e: React.MouseEvent, item: FluxoFinanceiro) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ item, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowOrcado(v => !v)}
            className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 group ${showOrcado ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className={`w-3 h-3 rounded-[3px] inline-block transition-colors ${showOrcado ? 'bg-chart-orcado' : 'bg-surface-3'}`} />
            <span className={`transition-colors ${showOrcado ? 'text-text-secondary' : 'text-text-disabled line-through'}`}>Orçado</span>
          </button>
          <button
            onClick={() => setShowRealizado(v => !v)}
            className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showRealizado ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className={`w-3 h-3 rounded-[3px] inline-block transition-colors ${showRealizado ? 'bg-chart-realizado' : 'bg-surface-3'}`} />
            <span className={`transition-colors ${showRealizado ? 'text-text-secondary' : 'text-text-disabled line-through'}`}>Realizado</span>
          </button>
        </div>

        {showPeriodFilter && (
          <div className="flex items-center gap-0.5 bg-surface-1 rounded-lg p-1 border border-surface-2">
            {PERIODO_OPTS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setPeriodo(opt.id)}
                className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                  periodo === opt.id
                    ? 'bg-white text-text-primary shadow-card border border-surface-3'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={containerRef} className="w-full overflow-x-auto relative select-none">
        <div style={{ minWidth: `${totalWidth + 60}px`, width: '100%' }}>
          <div className="flex">
            <div className="flex flex-col justify-between pr-3 pb-6 shrink-0" style={{ height: `${height + 24}px` }}>
              {[...ySteps].reverse().map((v, i) => (
                <span key={i} className="font-data text-[10px] text-text-tertiary text-right leading-none w-10">
                  {formatVal(v)}
                </span>
              ))}
            </div>

            <div className="flex-1 relative">
              <div className="flex items-end" style={{ height: `${height}px` }}>
                {filtered.map((item, i) => {
                  const orcH = showOrcado ? getBarH(item.orcado) : 0;
                  const realH = showRealizado ? getBarH(item.realizado) : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center cursor-pointer group"
                      style={!showPeriodFilter ? { flex: 1, minWidth: `${groupWidth}px` } : { width: `${groupWidth}px` }}
                      onMouseEnter={e => handleMouseEnter(e, item)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div className="flex items-end" style={{ gap: `${groupGap}px` }}>
                        <div className="flex flex-col items-center">
                          {showOrcado && orcH > 0 && (
                            <span className="font-data text-[10px] text-text-tertiary mb-1 group-hover:text-text-secondary transition-colors">
                              {formatVal(item.orcado)}
                            </span>
                          )}
                          <div
                            className={`rounded-t-[4px] transition-all duration-300 ${showOrcado ? 'bg-chart-orcado group-hover:bg-[#b5b9c0]' : 'bg-transparent'}`}
                            style={{ width: `${barWidth}px`, height: `${orcH}px` }}
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          {showRealizado && realH > 0 && (
                            <span className="font-data text-[10px] text-mos-700 mb-1 font-medium group-hover:opacity-75 transition-opacity">
                              {formatVal(item.realizado)}
                            </span>
                          )}
                          <div
                            className={`rounded-t-[4px] transition-all duration-300 ${showRealizado ? 'bg-chart-realizado group-hover:opacity-85' : 'bg-transparent'}`}
                            style={{ width: `${barWidth}px`, height: `${realH}px` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="h-px bg-surface-3 w-full" />

              <div className="flex pt-2">
                {filtered.map((item, i) => (
                  <div key={i} style={!showPeriodFilter ? { flex: 1, minWidth: `${groupWidth}px` } : { width: `${groupWidth}px` }} className="flex justify-center">
                    <span className="font-data text-[10px] text-text-tertiary">
                      {formatMonthYear(item.mes, item.ano)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {tooltip && (() => {
          const diff = tooltip.item.realizado - tooltip.item.orcado;
          const pct = tooltip.item.orcado > 0 ? ((diff / tooltip.item.orcado) * 100).toFixed(1) : '0.0';
          const over = diff > 0;
          const containerW = containerRef.current?.clientWidth ?? 500;
          const tooltipW = 210;
          const left = tooltip.x + 14 + tooltipW > containerW ? tooltip.x - tooltipW - 8 : tooltip.x + 14;
          const top = Math.max(tooltip.y - 130, 0);

          return (
            <div className="absolute z-20 pointer-events-none" style={{ left, top }}>
              <div className="bg-text-primary rounded-xl shadow-modal px-4 py-3 border border-white/5" style={{ width: tooltipW }}>
                <p className="font-display font-bold text-sm text-white mb-2.5">
                  {formatMonthYear(tooltip.item.mes, tooltip.item.ano)}
                </p>
                <div className="space-y-2">
                  {showOrcado && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-[#d1d5db] inline-block shrink-0" />
                        <span className="font-body text-xs text-white/60">Orçado</span>
                      </div>
                      <span className="font-data text-xs font-semibold text-white">{formatFull(tooltip.item.orcado)}</span>
                    </div>
                  )}
                  {showRealizado && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-chart-realizado inline-block shrink-0" />
                        <span className="font-body text-xs text-white/60">Realizado</span>
                      </div>
                      <span className="font-data text-xs font-semibold text-white">{formatFull(tooltip.item.realizado)}</span>
                    </div>
                  )}
                  {showOrcado && showRealizado && (
                    <div className="border-t border-white/10 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-white/60">Diferença</span>
                        <span className={`font-data text-xs font-bold ${over ? 'text-red-400' : 'text-green-400'}`}>
                          {over ? '+' : ''}{formatFull(diff)}
                        </span>
                      </div>
                      <div className="flex justify-end mt-0.5">
                        <span className={`font-data text-[10px] ${over ? 'text-red-400/80' : 'text-green-400/80'}`}>
                          ({over ? '+' : ''}{pct}% vs orçado)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
