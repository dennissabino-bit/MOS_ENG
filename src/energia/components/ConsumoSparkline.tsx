import { useState, useRef, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { formatCurrencyBR, formatMesAno } from '../utils/calculos';

interface DataPoint {
  mes: number;
  ano: number;
  consumo: number;
  valor_total: number;
}

interface Props {
  data: DataPoint[];
}

const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const W = 800;
const H = 200;
const PAD_LEFT = 56;
const PAD_RIGHT = 20;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;
const INNER_W = W - PAD_LEFT - PAD_RIGHT;
const INNER_H = H - PAD_TOP - PAD_BOTTOM;

function formatKWhShort(v: number) {
  if (v >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function ConsumoSparkline({ data }: Props) {
  const sorted = useMemo(() =>
    [...data]
      .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
      .slice(-12),
    [data]
  );

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      setPathLen(pathRef.current.getTotalLength());
    }
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, [sorted]);

  if (sorted.length < 2) return null;

  const consumos = sorted.map(d => Number(d.consumo));
  const maxVal = Math.max(...consumos, 1);
  const minVal = Math.min(...consumos);
  const range = maxVal - minVal || 1;

  // Y-axis grid ticks (4 lines)
  const TICKS = 4;
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const frac = i / TICKS;
    const val = minVal + frac * range;
    const y = PAD_TOP + INNER_H - frac * INNER_H;
    return { val, y };
  });

  // Points
  const pts = sorted.map((d, i) => ({
    x: PAD_LEFT + (i / (sorted.length - 1)) * INNER_W,
    y: PAD_TOP + INNER_H - ((Number(d.consumo) - minVal) / range) * INNER_H,
    d,
    consumo: Number(d.consumo),
    valor: Number(d.valor_total),
  }));

  // Smooth path (catmull-rom style via bezier)
  function smoothPath(points: typeof pts) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx.toFixed(2)} ${prev.y.toFixed(2)}, ${cpx.toFixed(2)} ${curr.y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
    }
    return d;
  }

  const linePath = smoothPath(pts);
  const fillPath = linePath
    + ` L ${pts[pts.length - 1].x.toFixed(2)} ${(PAD_TOP + INNER_H).toFixed(2)}`
    + ` L ${pts[0].x.toFixed(2)} ${(PAD_TOP + INNER_H).toFixed(2)} Z`;

  // KPI chips
  const avgConsumo = consumos.reduce((s, v) => s + v, 0) / consumos.length;
  const maxIdx = consumos.indexOf(Math.max(...consumos));
  const lastIdx = sorted.length - 1;
  const prevIdx = lastIdx - 1;
  const lastConsumo = consumos[lastIdx];
  const prevConsumo = consumos[prevIdx];
  const varPct = prevConsumo > 0 ? ((lastConsumo - prevConsumo) / prevConsumo) * 100 : null;

  // Tooltip positioning
  const hov = hoveredIdx !== null ? pts[hoveredIdx] : null;
  const hovData = hoveredIdx !== null ? sorted[hoveredIdx] : null;
  const hovPrev = hoveredIdx !== null && hoveredIdx > 0 ? sorted[hoveredIdx - 1] : null;
  const hovVarPct = (hovPrev && Number(hovPrev.consumo) > 0)
    ? ((Number(hovData!.consumo) - Number(hovPrev.consumo)) / Number(hovPrev.consumo)) * 100
    : null;

  // Tooltip x clamp so it doesn't overflow
  const tooltipX = hov
    ? Math.min(Math.max(hov.x / W * 100, 10), 75)
    : 50;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-surface-2 bg-surface-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-mos-700" />
          <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">CONSUMO MENSAL</p>
        </div>
        <p className="font-body text-[10px] text-text-disabled">{sorted.length} meses</p>
      </div>

      {/* KPI chips */}
      <div className="px-5 pt-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 rounded-full border border-surface-2">
          <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest">MÉDIA</span>
          <span className="font-data text-xs font-bold text-text-primary">{formatKWhShort(avgConsumo)} kWh</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 rounded-full border border-surface-2">
          <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest">PICO</span>
          <span className="font-data text-xs font-bold text-mos-700">
            {formatKWhShort(consumos[maxIdx])} kWh — {MESES_ABREV[sorted[maxIdx].mes - 1]}/{sorted[maxIdx].ano}
          </span>
        </div>
        {varPct !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
            varPct > 10 ? 'bg-status-errorLight border-status-error/20' :
            varPct < -5 ? 'bg-status-successLight border-status-success/20' :
            'bg-surface-1 border-surface-2'
          }`}>
            {varPct > 5 ? <TrendingUp className="w-3 h-3 text-status-error" /> :
             varPct < -5 ? <TrendingDown className="w-3 h-3 text-status-success" /> :
             <Minus className="w-3 h-3 text-text-tertiary" />}
            <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest">ÚLT. MÊS</span>
            <span className={`font-data text-xs font-bold ${
              varPct > 10 ? 'text-status-error' :
              varPct < -5 ? 'text-status-success' :
              'text-text-secondary'
            }`}>
              {varPct > 0 ? '+' : ''}{varPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="pt-3 pb-1 relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ display: 'block', minHeight: 160 }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="csFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#610000" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#610000" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id="csClip">
              <rect x={PAD_LEFT} y={PAD_TOP} width={INNER_W} height={INNER_H + 2} />
            </clipPath>
          </defs>

          {/* Grid lines + Y-axis labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT} y1={tick.y}
                x2={PAD_LEFT + INNER_W} y2={tick.y}
                stroke="#e5e7eb" strokeWidth="1"
                strokeDasharray={i === 0 ? undefined : '3 4'}
              />
              <text
                x={PAD_LEFT - 6} y={tick.y + 4}
                textAnchor="end"
                className="font-data"
                style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'Inter, sans-serif' }}
              >
                {formatKWhShort(tick.val)}
              </text>
            </g>
          ))}

          {/* Hover column highlight */}
          {hoveredIdx !== null && (
            <rect
              x={pts[hoveredIdx].x - INNER_W / sorted.length / 2}
              y={PAD_TOP}
              width={INNER_W / sorted.length}
              height={INNER_H}
              fill="#610000"
              fillOpacity="0.05"
              rx="2"
            />
          )}

          {/* Fill area */}
          <path d={fillPath} fill="url(#csFill)" clipPath="url(#csClip)" />

          {/* Line */}
          <path
            ref={pathRef}
            d={linePath}
            fill="none"
            stroke="#610000"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath="url(#csClip)"
            style={pathLen > 0 ? {
              strokeDasharray: pathLen,
              strokeDashoffset: animated ? 0 : pathLen,
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)',
            } : undefined}
          />

          {/* Crosshair vertical line */}
          {hoveredIdx !== null && hov && (
            <line
              x1={hov.x} y1={PAD_TOP}
              x2={hov.x} y2={PAD_TOP + INNER_H}
              stroke="#610000"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
          )}

          {/* Data points */}
          {pts.map((p, i) => {
            const isHov = hoveredIdx === i;
            const isMax = i === maxIdx;
            const r = isHov ? 6 : isMax ? 5 : 3.5;
            return (
              <g key={i}>
                {/* Invisible wide hit area */}
                <rect
                  x={PAD_LEFT + (i / (sorted.length - 1)) * INNER_W - INNER_W / sorted.length / 2}
                  y={PAD_TOP}
                  width={INNER_W / sorted.length}
                  height={INNER_H}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                />
                {/* Outer glow ring on hover */}
                {isHov && (
                  <circle cx={p.x} cy={p.y} r={12} fill="#610000" fillOpacity="0.1" />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={isHov || isMax ? '#610000' : '#fff'}
                  stroke="#610000"
                  strokeWidth={isHov ? 2.5 : 1.5}
                  style={{
                    transition: 'r 150ms ease, fill 150ms ease',
                    opacity: animated ? 1 : 0,
                    cursor: 'crosshair',
                  }}
                />
                {/* Value label always shown on max, hovered on others */}
                {(isMax || isHov) && (
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    style={{
                      fontSize: isHov ? 11 : 10,
                      fill: '#610000',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                    }}
                  >
                    {formatKWhShort(p.consumo)}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {pts.map((p, i) => {
            const show = sorted.length <= 6 || i === 0 || i === sorted.length - 1 || i % Math.ceil(sorted.length / 6) === 0;
            if (!show) return null;
            return (
              <text
                key={i}
                x={p.x}
                y={H - 6}
                textAnchor="middle"
                style={{
                  fontSize: 9,
                  fill: hoveredIdx === i ? '#610000' : '#9ca3af',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: hoveredIdx === i ? 700 : 400,
                  transition: 'fill 100ms ease',
                }}
              >
                {MESES_ABREV[sorted[i].mes - 1]}/{String(sorted[i].ano).slice(2)}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIdx !== null && hov && hovData && (
          <div
            className="absolute pointer-events-none z-10 transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${tooltipX}%`,
              top: `${(hov.y / H) * 100}%`,
              marginTop: -12,
              animation: 'tooltipIn 120ms ease forwards',
            }}
          >
            <style>{`
              @keyframes tooltipIn {
                from { opacity: 0; transform: translate(-50%, calc(-100% - 4px)); }
                to   { opacity: 1; transform: translate(-50%, calc(-100% - 10px)); }
              }
            `}</style>
            <div className="bg-text-primary text-white rounded-xl shadow-modal px-3.5 py-2.5 min-w-[140px]">
              <p className="font-display font-bold text-xs text-white/80 mb-1.5">
                {MESES_ABREV[hovData.mes - 1]} / {hovData.ano}
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-body text-[10px] text-white/60">Consumo</span>
                  <span className="font-data text-xs font-bold text-white">
                    {Number(hovData.consumo).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-body text-[10px] text-white/60">Valor</span>
                  <span className="font-data text-xs font-bold text-white">{formatCurrencyBR(Number(hovData.valor_total))}</span>
                </div>
                {hovVarPct !== null && (
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10 mt-1">
                    <span className="font-body text-[10px] text-white/60">Var. mês ant.</span>
                    <span className={`font-data text-xs font-bold ${
                      hovVarPct > 10 ? 'text-red-300' :
                      hovVarPct < -5 ? 'text-green-300' :
                      'text-white/80'
                    }`}>
                      {hovVarPct > 0 ? '+' : ''}{hovVarPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              {/* Arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-text-primary rotate-45 rounded-[1px]" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom axis guide */}
      <div className="px-5 pb-3 flex justify-between items-center">
        <p className="font-body text-[10px] text-text-disabled">
          {formatMesAno(sorted[0].mes, sorted[0].ano)}
        </p>
        <p className="font-body text-[10px] text-text-disabled italic">Passe o mouse sobre o gráfico</p>
        <p className="font-body text-[10px] text-text-disabled">
          {formatMesAno(sorted[sorted.length - 1].mes, sorted[sorted.length - 1].ano)}
        </p>
      </div>
    </div>
  );
}
