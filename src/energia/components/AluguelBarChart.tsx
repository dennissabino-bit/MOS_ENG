import { useState, useRef } from 'react';

export interface AluguelChartPoint {
  mes: number;
  ano: number;
  cobrado: number;
  pago: number;
}

interface TooltipState {
  item: AluguelChartPoint;
  x: number;
  y: number;
}

interface AluguelBarChartProps {
  data: AluguelChartPoint[];
  height?: number;
}

function formatVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function formatFull(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatMesAno(mes: number, ano: number): string {
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${MESES[(mes - 1) % 12]}/${String(ano).slice(-2)}`;
}

const BAR_W = 44;
const BAR_GAP = 8;
const GROUP_MARGIN = 20;
const GROUP_W = BAR_W * 2 + BAR_GAP + GROUP_MARGIN;

export function AluguelBarChart({ data, height = 240 }: AluguelBarChartProps) {
  const [showCobrado, setShowCobrado] = useState(true);
  const [showPago, setShowPago] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = [...data].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="font-body text-sm text-text-disabled">Sem dados para o período selecionado.</p>
      </div>
    );
  }

  const allVals = sorted.flatMap(d => {
    const v: number[] = [];
    if (showCobrado) v.push(d.cobrado);
    if (showPago) v.push(d.pago);
    return v;
  });
  const maxVal = Math.max(...allVals, 1);

  const ySteps = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));
  const totalWidth = sorted.length * GROUP_W;

  function barH(val: number) {
    return Math.max((val / maxVal) * height, val > 0 ? 3 : 0);
  }

  function onEnter(e: React.MouseEvent, item: AluguelChartPoint) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ item, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function onMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  }

  return (
    <div className="space-y-3">
      {/* Legends */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => setShowCobrado(v => !v)}
          className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showCobrado ? 'opacity-100' : 'opacity-40'}`}
        >
          <span className={`w-3 h-3 rounded-[3px] inline-block transition-colors ${showCobrado ? 'bg-[#d1d5db]' : 'bg-surface-3'}`} />
          <span className={`transition-colors ${showCobrado ? 'text-text-secondary' : 'text-text-disabled line-through'}`}>Cobrado</span>
        </button>
        <button
          onClick={() => setShowPago(v => !v)}
          className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showPago ? 'opacity-100' : 'opacity-40'}`}
        >
          <span className={`w-3 h-3 rounded-[3px] inline-block transition-colors ${showPago ? 'bg-[#610000]' : 'bg-surface-3'}`} />
          <span className={`transition-colors ${showPago ? 'text-text-secondary' : 'text-text-disabled line-through'}`}>Recebido</span>
        </button>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full overflow-x-auto relative select-none">
        <div style={{ minWidth: `${totalWidth + 60}px`, width: '100%' }}>
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between pr-3 pb-6 shrink-0" style={{ height: `${height + 24}px` }}>
              {[...ySteps].reverse().map((v, i) => (
                <span key={i} className="font-data text-[10px] text-text-tertiary text-right leading-none w-12">
                  {formatVal(v)}
                </span>
              ))}
            </div>

            {/* Bars area */}
            <div className="flex-1 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: `${height}px` }}>
                {ySteps.slice(1).map((_, i) => (
                  <div key={i} className="w-full border-t border-surface-2/60" />
                ))}
              </div>

              <div className="flex items-end" style={{ height: `${height}px` }}>
                {sorted.map((item, i) => {
                  const cobH = showCobrado ? barH(item.cobrado) : 0;
                  const pagH = showPago ? barH(item.pago) : 0;
                  const adimpl = item.cobrado > 0 ? Math.round((item.pago / item.cobrado) * 100) : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center cursor-pointer group"
                      style={{ flex: 1, minWidth: `${GROUP_W}px` }}
                      onMouseEnter={e => onEnter(e, item)}
                      onMouseMove={onMove}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div className="flex items-end" style={{ gap: `${BAR_GAP}px` }}>
                        {/* Cobrado bar */}
                        <div className="flex flex-col items-center">
                          {showCobrado && cobH > 0 && (
                            <span className="font-data text-[10px] text-text-tertiary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatVal(item.cobrado)}
                            </span>
                          )}
                          <div
                            className={`rounded-t-[5px] transition-all duration-300 ${showCobrado ? 'bg-[#d1d5db] group-hover:bg-[#b5b9c0]' : 'bg-transparent'}`}
                            style={{ width: `${BAR_W}px`, height: `${cobH}px` }}
                          />
                        </div>
                        {/* Pago bar */}
                        <div className="flex flex-col items-center">
                          {showPago && pagH > 0 && (
                            <span className="font-data text-[10px] text-mos-700 mb-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatVal(item.pago)}
                            </span>
                          )}
                          <div
                            className={`rounded-t-[5px] transition-all duration-300 ${showPago ? 'bg-[#610000] group-hover:opacity-85' : 'bg-transparent'}`}
                            style={{ width: `${BAR_W}px`, height: `${pagH}px` }}
                          />
                        </div>
                      </div>

                      {/* Adimplência badge on hover */}
                      {item.cobrado > 0 && (
                        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className={`font-data text-[9px] font-bold px-1 py-0.5 rounded ${adimpl >= 90 ? 'bg-green-100 text-green-700' : adimpl >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                            {adimpl}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="h-px bg-surface-3 w-full" />

              {/* X-axis labels */}
              <div className="flex pt-2">
                {sorted.map((item, i) => (
                  <div key={i} style={{ flex: 1, minWidth: `${GROUP_W}px` }} className="flex justify-center">
                    <span className="font-data text-[11px] text-text-tertiary">
                      {formatMesAno(item.mes, item.ano)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (() => {
          const { item } = tooltip;
          const diff = item.pago - item.cobrado;
          const adimpl = item.cobrado > 0 ? ((item.pago / item.cobrado) * 100).toFixed(1) : '0.0';
          const containerW = containerRef.current?.clientWidth ?? 500;
          const tooltipW = 220;
          const left = tooltip.x + 16 + tooltipW > containerW ? tooltip.x - tooltipW - 8 : tooltip.x + 16;
          const top = Math.max(tooltip.y - 140, 0);

          return (
            <div className="absolute z-20 pointer-events-none" style={{ left, top }}>
              <div className="bg-text-primary rounded-xl shadow-modal px-4 py-3 border border-white/5" style={{ width: tooltipW }}>
                <p className="font-display font-bold text-sm text-white mb-2.5">
                  {formatMesAno(item.mes, item.ano)}
                </p>
                <div className="space-y-2">
                  {showCobrado && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-[#d1d5db] inline-block shrink-0" />
                        <span className="font-body text-xs text-white/60">Cobrado</span>
                      </div>
                      <span className="font-data text-xs font-semibold text-white">{formatFull(item.cobrado)}</span>
                    </div>
                  )}
                  {showPago && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-[2px] bg-[#610000] inline-block shrink-0" />
                        <span className="font-body text-xs text-white/60">Recebido</span>
                      </div>
                      <span className="font-data text-xs font-semibold text-white">{formatFull(item.pago)}</span>
                    </div>
                  )}
                  {showCobrado && showPago && item.cobrado > 0 && (
                    <div className="border-t border-white/10 pt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-white/60">Inadimplência</span>
                        <span className={`font-data text-xs font-bold ${diff < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatFull(Math.abs(diff))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-body text-xs text-white/60">Adimplência</span>
                        <span className={`font-data text-xs font-bold ${Number(adimpl) >= 90 ? 'text-green-400' : Number(adimpl) >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {adimpl}%
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
