import { useState, useRef, useMemo } from 'react';
import { BarChart2, ChevronDown } from 'lucide-react';
import { getMesAtual, getAnoAtual } from '../utils/calculos';
import type { EnergiaSala, EnergiaUnidade } from '../types';

export interface ContratoSlim {
  sala_id: string;
  mes_inicio: number;
  ano_inicio: number;
  mes_fim: number;
  ano_fim: number;
}

interface VacanciaPoint {
  mes: number;
  ano: number;
  total: number;
  ocupadas: number;
  disponiveis: number;
  vacancia: number;
}

interface Props {
  salas: EnergiaSala[];
  contratos: ContratoSlim[];
  unidades: EnergiaUnidade[];
  isAdmin: boolean;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const BAR_H = 200;
const BAR_W = 44;
const BAR_GAP = 12;
const COL_W = BAR_W + BAR_GAP;

function fmtMesAno(mes: number, ano: number) {
  return `${MESES[mes - 1]}/${String(ano).slice(2)}`;
}

const selectCls =
  'appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-2 pr-6 py-1 font-body text-xs text-text-primary focus:outline-none';

export function VacanciaChart({ salas, contratos, unidades, isAdmin }: Props) {
  type Periodo = '3' | '6' | '12' | 'custom';

  const nowMes = getMesAtual();
  const nowAno = getAnoAtual();

  const [periodo, setPeriodo] = useState<Periodo>('12');
  const [inicio, setInicio] = useState(() => {
    const v = nowAno * 12 + nowMes - 11;
    return { mes: ((v - 1) % 12) + 1, ano: Math.floor((v - 1) / 12) };
  });
  const [fim, setFim] = useState({ mes: nowMes, ano: nowAno });
  const [unidadeId, setUnidadeId] = useState('');
  const [showOcupadas, setShowOcupadas] = useState(true);
  const [showDisponiveis, setShowDisponiveis] = useState(true);
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function quickPeriodo(months: number) {
    const v = nowAno * 12 + nowMes - (months - 1);
    setInicio({ mes: ((v - 1) % 12) + 1, ano: Math.floor((v - 1) / 12) });
    setFim({ mes: nowMes, ano: nowAno });
    setPeriodo(String(months) as Periodo);
  }

  const data = useMemo((): VacanciaPoint[] => {
    const activeSalas = salas.filter(
      s => !s.arquivada && (!unidadeId || s.unidade_id === unidadeId),
    );
    const start = inicio.ano * 12 + inicio.mes;
    const end = fim.ano * 12 + fim.mes;
    const result: VacanciaPoint[] = [];

    for (let v = start; v <= end; v++) {
      const ano = Math.floor((v - 1) / 12);
      const mes = ((v - 1) % 12) + 1;
      const total = activeSalas.length;

      let ocupadas: number;
      if (ano === nowAno && mes === nowMes) {
        ocupadas = activeSalas.filter(s => s.ativo).length;
      } else {
        ocupadas = activeSalas.filter(s =>
          contratos.some(
            c =>
              c.sala_id === s.id &&
              c.ano_inicio * 12 + c.mes_inicio <= v &&
              c.ano_fim * 12 + c.mes_fim >= v,
          ),
        ).length;
      }

      const disponiveis = total - ocupadas;
      result.push({
        mes, ano, total,
        ocupadas,
        disponiveis,
        vacancia: total > 0 ? Math.round((disponiveis / total) * 100) : 0,
      });
    }
    return result;
  }, [salas, contratos, unidadeId, inicio, fim, nowMes, nowAno]);

  const current = data[data.length - 1] ?? { total: 0, ocupadas: 0, disponiveis: 0, vacancia: 0 };
  const maxTotal = Math.max(...data.map(d => d.total), 1);

  const yearRange = Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i);

  return (
    <div className="bg-white border border-surface-2 rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mos-700/10 flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-[18px] h-[18px] text-mos-700" strokeWidth={2} />
            </div>
            <div>
              <p className="font-body text-[10px] font-bold text-text-secondary tracking-widest uppercase">Evolução</p>
              <p className="font-display font-bold text-base text-text-primary leading-tight">Ocupação e Vacância</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <div className="relative">
                <select
                  value={unidadeId}
                  onChange={e => setUnidadeId(e.target.value)}
                  className="appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-7 py-1.5 font-body text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20"
                >
                  <option value="">Todas as Unidades</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
            )}

            <div className="flex items-center gap-0.5 bg-surface-1 rounded-lg p-1 border border-surface-2">
              {(['3', '6', '12'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => quickPeriodo(Number(p))}
                  className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                    periodo === p
                      ? 'bg-white text-text-primary shadow-card border border-surface-3'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {p}M
                </button>
              ))}
              <button
                onClick={() => setPeriodo('custom')}
                className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-all duration-150 ${
                  periodo === 'custom'
                    ? 'bg-white text-text-primary shadow-card border border-surface-3'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>
        </div>

        {periodo === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-surface-2">
            <span className="font-body text-xs text-text-secondary">De</span>
            <select value={inicio.mes} onChange={e => setInicio(p => ({ ...p, mes: Number(e.target.value) }))} className={selectCls}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={inicio.ano} onChange={e => setInicio(p => ({ ...p, ano: Number(e.target.value) }))} className={selectCls}>
              {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="font-body text-xs text-text-secondary">até</span>
            <select value={fim.mes} onChange={e => setFim(p => ({ ...p, mes: Number(e.target.value) }))} className={selectCls}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={fim.ano} onChange={e => setFim(p => ({ ...p, ano: Number(e.target.value) }))} className={selectCls}>
              {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* KPI chips */}
      <div className="px-5 pt-4 flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 rounded-full border border-surface-2">
          <span className="font-body text-[10px] font-bold text-text-tertiary tracking-widest">TOTAL</span>
          <span className="font-data text-xs font-bold text-text-primary">{current.total} imóveis</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-mos-700/5 rounded-full border border-mos-700/20">
          <span className="w-2 h-2 rounded-[2px] bg-mos-700 inline-block flex-shrink-0" />
          <span className="font-body text-[10px] font-bold text-text-tertiary tracking-widest">OCUPADOS</span>
          <span className="font-data text-xs font-bold text-mos-700">{current.ocupadas}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 rounded-full border border-surface-2">
          <span className="w-2 h-2 rounded-[2px] bg-[#d1d5db] inline-block flex-shrink-0" />
          <span className="font-body text-[10px] font-bold text-text-tertiary tracking-widest">DISPONÍVEIS</span>
          <span className="font-data text-xs font-bold text-text-secondary">{current.disponiveis}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          current.vacancia === 0
            ? 'bg-status-successLight border-status-success/20'
            : current.vacancia > 30
            ? 'bg-status-errorLight border-status-error/20'
            : 'bg-status-warningLight border-status-warning/20'
        }`}>
          <span className="font-body text-[10px] font-bold text-text-tertiary tracking-widest">VACÂNCIA</span>
          <span className={`font-data text-xs font-bold ${
            current.vacancia === 0 ? 'text-status-success' :
            current.vacancia > 30 ? 'text-status-error' : 'text-status-warning'
          }`}>{current.vacancia}%</span>
        </div>
      </div>

      {/* Legend toggles */}
      <div className="px-5 pt-3 flex items-center gap-5">
        <button
          onClick={() => setShowOcupadas(v => !v)}
          className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showOcupadas ? 'opacity-100' : 'opacity-40'}`}
        >
          <span className={`w-3 h-3 rounded-[3px] inline-block ${showOcupadas ? 'bg-[#610000]' : 'bg-surface-3'}`} />
          <span className={showOcupadas ? 'text-text-secondary' : 'text-text-disabled line-through'}>Ocupadas</span>
        </button>
        <button
          onClick={() => setShowDisponiveis(v => !v)}
          className={`flex items-center gap-1.5 font-body text-xs font-medium transition-all duration-150 ${showDisponiveis ? 'opacity-100' : 'opacity-40'}`}
        >
          <span className={`w-3 h-3 rounded-[3px] inline-block ${showDisponiveis ? 'bg-[#d1d5db]' : 'bg-surface-3'}`} />
          <span className={showDisponiveis ? 'text-text-secondary' : 'text-text-disabled line-through'}>Disponíveis</span>
        </button>
      </div>

      {/* Chart */}
      <div className="px-5 pt-3 pb-5">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <BarChart2 className="w-8 h-8 text-text-disabled" />
            <p className="font-body text-sm text-text-tertiary">Sem dados para o período selecionado.</p>
          </div>
        ) : (
          <div ref={containerRef} className="relative select-none">
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: `${data.length * COL_W + 60}px` }}>
                <div className="flex">
                  {/* Y-axis */}
                  <div
                    className="flex flex-col justify-between pr-3 pb-6 shrink-0"
                    style={{ height: `${BAR_H + 24}px` }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="font-data text-[10px] text-text-tertiary text-right w-8 leading-none">
                        {Math.round(maxTotal * (1 - i / 4))}
                      </span>
                    ))}
                  </div>

                  {/* Bars area */}
                  <div className="flex-1 relative">
                    {/* Grid lines */}
                    <div
                      className="absolute inset-0 flex flex-col justify-between pointer-events-none"
                      style={{ height: `${BAR_H}px` }}
                    >
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-full border-t border-surface-2/60" />
                      ))}
                    </div>

                    <div className="flex items-end" style={{ height: `${BAR_H}px` }}>
                      {data.map((pt, i) => {
                        const isHov = tooltip?.idx === i;
                        const isCurrent = pt.mes === nowMes && pt.ano === nowAno;
                        const ocupH = showOcupadas
                          ? Math.max((pt.ocupadas / maxTotal) * BAR_H, pt.ocupadas > 0 ? 3 : 0)
                          : 0;
                        const dispH = showDisponiveis
                          ? Math.max((pt.disponiveis / maxTotal) * BAR_H, pt.disponiveis > 0 ? 3 : 0)
                          : 0;
                        const hasOcup = ocupH > 0;
                        const hasDisp = dispH > 0;

                        return (
                          <div
                            key={i}
                            style={{ flex: 1, minWidth: `${COL_W}px` }}
                            className="flex flex-col items-center"
                            onMouseEnter={e => {
                              const rect = containerRef.current?.getBoundingClientRect();
                              if (rect) setTooltip({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                            }}
                            onMouseMove={e => {
                              const rect = containerRef.current?.getBoundingClientRect();
                              if (rect) setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <div
                              className="relative cursor-pointer"
                              style={{ width: BAR_W, height: BAR_H }}
                            >
                              {hasOcup && (
                                <div
                                  className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${!hasDisp ? 'rounded-t-[4px]' : ''} ${isHov ? 'opacity-90' : ''} bg-[#610000]`}
                                  style={{ height: ocupH }}
                                />
                              )}
                              {hasDisp && (
                                <div
                                  className={`absolute left-0 right-0 rounded-t-[4px] transition-all duration-300 ${isHov ? 'bg-[#b5b9c0]' : 'bg-[#d1d5db]'}`}
                                  style={{ height: dispH, bottom: hasOcup ? ocupH : 0 }}
                                />
                              )}
                            </div>

                            {/* Vacância % label */}
                            <div className="mt-1 h-4 flex items-center justify-center">
                              {(isHov || isCurrent) && pt.total > 0 && (
                                <span className={`font-data text-[9px] font-bold px-1 leading-none ${
                                  pt.vacancia === 0 ? 'text-status-success' :
                                  pt.vacancia > 30 ? 'text-status-error' : 'text-status-warning'
                                }`}>
                                  {pt.vacancia}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="h-px bg-surface-3 w-full" />

                    {/* X-axis labels */}
                    <div className="flex pt-2">
                      {data.map((pt, i) => (
                        <div
                          key={i}
                          style={{ flex: 1, minWidth: `${COL_W}px` }}
                          className="flex justify-center"
                        >
                          <span className={`font-data text-[11px] transition-colors ${
                            tooltip?.idx === i ? 'text-mos-700 font-bold' : 'text-text-tertiary'
                          }`}>
                            {fmtMesAno(pt.mes, pt.ano)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tooltip */}
            {tooltip !== null && (() => {
              const pt = data[tooltip.idx];
              if (!pt) return null;
              const containerW = containerRef.current?.clientWidth ?? 500;
              const TW = 200;
              const left = tooltip.x + 16 + TW > containerW ? tooltip.x - TW - 8 : tooltip.x + 16;
              const top = Math.max(tooltip.y - 120, 0);
              return (
                <div className="absolute z-20 pointer-events-none" style={{ left, top }}>
                  <div className="bg-text-primary rounded-xl shadow-modal px-4 py-3 border border-white/5" style={{ width: TW }}>
                    <p className="font-display font-bold text-sm text-white mb-2.5">
                      {fmtMesAno(pt.mes, pt.ano)}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-[2px] bg-[#610000] inline-block shrink-0" />
                          <span className="font-body text-xs text-white/60">Ocupadas</span>
                        </div>
                        <span className="font-data text-xs font-semibold text-white">{pt.ocupadas} / {pt.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-[2px] bg-[#d1d5db] inline-block shrink-0" />
                          <span className="font-body text-xs text-white/60">Disponíveis</span>
                        </div>
                        <span className="font-data text-xs font-semibold text-white">{pt.disponiveis}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                        <span className="font-body text-xs text-white/60">Vacância</span>
                        <span className={`font-data text-xs font-bold ${
                          pt.vacancia === 0 ? 'text-green-400' :
                          pt.vacancia > 30 ? 'text-red-400' : 'text-yellow-400'
                        }`}>{pt.vacancia}%</span>
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
  );
}
