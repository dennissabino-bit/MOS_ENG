import { useState } from 'react';
import { formatMonthYear } from '../../lib/formatters';
import type { CurvaS } from '../../lib/database.types';

type PeriodoFilter = '6M' | '12M' | 'todos';

interface CurvaSChartProps {
  data: CurvaS[];
  showPeriodFilter?: boolean;
  defaultPeriodo?: PeriodoFilter;
  showMensal?: boolean;
  height?: number;
}

const PERIODO_OPTS: { id: PeriodoFilter; label: string }[] = [
  { id: '6M', label: '6M' },
  { id: '12M', label: '12M' },
  { id: 'todos', label: 'Todos' },
];

export function CurvaSChart({
  data,
  showPeriodFilter = true,
  defaultPeriodo = 'todos',
  showMensal: showMensalDefault = true,
  height = 220,
}: CurvaSChartProps) {
  const [periodo, setPeriodo] = useState<PeriodoFilter>(defaultPeriodo);
  const [showPlanejado, setShowPlanejado] = useState(true);
  const [showRealizado, setShowRealizado] = useState(true);
  const [showMensal, setShowMensal] = useState(showMensalDefault);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="font-body text-sm text-text-disabled">Sem dados de curva S para esta obra.</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  const filtered: CurvaS[] = (() => {
    if (periodo === 'todos') return sorted;
    const count = periodo === '6M' ? 6 : 12;
    return sorted.slice(-count);
  })();

  if (!filtered.length) return null;

  const W = 800;
  const H = height + 20;
  const pL = 52; const pR = 24; const pT = 20; const pB = 36;
  const cW = W - pL - pR;
  const cH = H - pT - pB;

  const toY = (v: number) => pT + cH - (v / 100) * cH;
  const toX = (i: number) => pL + (i / Math.max(filtered.length - 1, 1)) * cW;

  const planPath = filtered.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.planejado_acum).toFixed(1)}`).join(' ');

  const realData = filtered.filter(d => d.realizado_acum > 0);
  const realPath = realData.map((d) => {
    const i = filtered.indexOf(d);
    const cmd = d === realData[0] ? 'M' : 'L';
    return `${cmd}${toX(i).toFixed(1)},${toY(d.realizado_acum).toFixed(1)}`;
  }).join(' ');

  const lastReal = realData.at(-1);
  const lastRealIdx = lastReal ? filtered.indexOf(lastReal) : -1;

  const maxMensal = Math.max(...filtered.map(d => d.mensal || 0), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowPlanejado(v => !v)}
            className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showPlanejado ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className="flex items-center">
              <span className={`inline-block w-7 border-t-2 border-dashed transition-colors ${showPlanejado ? 'border-[#d1d5db]' : 'border-surface-3'}`} />
            </span>
            <span className={`ml-1.5 transition-colors ${showPlanejado ? 'text-text-secondary' : 'text-text-disabled line-through'}`}>Planejado</span>
          </button>
          <button
            onClick={() => setShowRealizado(v => !v)}
            className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showRealizado ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className={`inline-block w-7 border-t-2 transition-colors ${showRealizado ? 'border-[#610000]' : 'border-surface-3'}`} />
            <span className={`ml-1.5 transition-colors ${showRealizado ? 'text-text-secondary' : 'text-text-disabled line-through'}`}>Realizado</span>
          </button>
          {showMensalDefault && (
            <button
              onClick={() => setShowMensal(v => !v)}
              className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showMensal ? 'opacity-100' : 'opacity-40'}`}
            >
              <span className={`w-4 h-3 rounded-sm inline-block transition-colors ${showMensal ? 'bg-mos-700 opacity-20' : 'bg-surface-3'}`} />
              <span className={`transition-colors ${showMensal ? 'text-text-secondary' : 'text-text-disabled line-through'}`}>Mensal</span>
            </button>
          )}
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

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line x1={pL} y1={toY(v)} x2={W - pR} y2={toY(v)} stroke="#e8e8e8" strokeWidth="1" />
              <text x={pL - 8} y={toY(v) + 4} textAnchor="end" fontSize="11" fill="#8c9196">{v}%</text>
            </g>
          ))}

          {filtered.map((d, i) => {
            if (i % Math.ceil(filtered.length / 8) !== 0 && i !== filtered.length - 1) return null;
            return (
              <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#8c9196">
                {formatMonthYear(d.mes, d.ano)}
              </text>
            );
          })}

          {showMensalDefault && showMensal && filtered.map((d, i) => {
            if (!d.mensal || d.mensal <= 0) return null;
            const barH = ((d.mensal / maxMensal) * (cH * 0.25));
            const x = toX(i);
            return (
              <rect
                key={`m${i}`}
                x={x - 6}
                y={toY(0) - barH}
                width="12"
                height={barH}
                fill="#610000"
                opacity="0.12"
                rx="2"
              />
            );
          })}

          {showPlanejado && planPath && (
            <path d={planPath} fill="none" stroke="#d1d5db" strokeWidth="2" strokeDasharray="7 5" />
          )}

          {showRealizado && realPath && (
            <path d={realPath} fill="none" stroke="#610000" strokeWidth="2.5" />
          )}

          {showRealizado && lastReal && lastRealIdx >= 0 && (
            <>
              <line
                x1={toX(lastRealIdx)}
                y1={pT}
                x2={toX(lastRealIdx)}
                y2={H - pB}
                stroke="#610000"
                strokeWidth="1"
                strokeDasharray="4 3"
                opacity="0.4"
              />
              <text
                x={toX(lastRealIdx) + 6}
                y={pT + 14}
                fontSize="11"
                fill="#610000"
                fontWeight="600"
              >
                Atual {lastReal.realizado_acum}%
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
