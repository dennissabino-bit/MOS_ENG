import { useState, useRef, useMemo } from 'react';
import { Activity, ChevronDown, TrendingDown, Clock, Trophy } from 'lucide-react';
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

function fmtMesAno(mes: number, ano: number) {
  return `${MESES[mes - 1]}/${String(ano).slice(2)}`;
}

function vacanciaColor(pct: number): { bar: string; text: string; bg: string; border: string } {
  if (pct < 10) return { bar: 'bg-status-success', text: 'text-status-success', bg: 'bg-status-successLight', border: 'border-status-success/20' };
  if (pct <= 25) return { bar: 'bg-status-warning', text: 'text-status-warning', bg: 'bg-status-warningLight', border: 'border-status-warning/20' };
  return { bar: 'bg-status-error', text: 'text-status-error', bg: 'bg-status-errorLight', border: 'border-status-error/20' };
}

function faixaColor(faixa: number): { bar: string; badge: string } {
  // faixa: 0=0-30, 1=31-60, 2=61-90, 3=91-180, 4=+180
  switch (faixa) {
    case 0: return { bar: 'bg-status-success', badge: 'bg-status-successLight text-status-success border-status-success/30' };
    case 1: return { bar: 'bg-status-warning', badge: 'bg-status-warningLight text-status-warning border-status-warning/30' };
    case 2: return { bar: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-200' };
    case 3: return { bar: 'bg-status-error', badge: 'bg-status-errorLight text-status-error border-status-error/30' };
    default: return { bar: 'bg-mos-700', badge: 'bg-mos-700/10 text-mos-700 border-mos-700/30' };
  }
}

function diasParaFaixa(dias: number): number {
  if (dias <= 30) return 0;
  if (dias <= 60) return 1;
  if (dias <= 90) return 2;
  if (dias <= 180) return 3;
  return 4;
}

function formatarDuracao(dias: number): string {
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  const resto = dias % 30;
  if (meses < 12) return resto > 0 ? `${meses} meses e ${resto} dias` : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const mesesResto = meses % 12;
  return mesesResto > 0 ? `${anos} ano${anos > 1 ? 's' : ''} e ${mesesResto} meses` : `${anos} ano${anos > 1 ? 's' : ''}`;
}

const selectCls =
  'appearance-none bg-surface-1 border border-surface-3 rounded-lg pl-2 pr-6 py-1 font-body text-xs text-text-primary focus:outline-none';

export function VacanciaChart({ salas, contratos, unidades, isAdmin }: Props) {
  type Periodo = '3' | '6' | '12' | 'custom';

  const nowMes = getMesAtual();
  const nowAno = getAnoAtual();
  const today = new Date();
  const todayMs = new Date(nowAno, nowMes - 1, 1).getTime();

  const [periodo, setPeriodo] = useState<Periodo>('12');
  const [inicio, setInicio] = useState(() => {
    const v = nowAno * 12 + nowMes - 11;
    return { mes: ((v - 1) % 12) + 1, ano: Math.floor((v - 1) / 12) };
  });
  const [fim, setFim] = useState({ mes: nowMes, ano: nowAno });
  const [unidadeId, setUnidadeId] = useState('');
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [showAllRanking, setShowAllRanking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function quickPeriodo(months: number) {
    const v = nowAno * 12 + nowMes - (months - 1);
    setInicio({ mes: ((v - 1) % 12) + 1, ano: Math.floor((v - 1) / 12) });
    setFim({ mes: nowMes, ano: nowAno });
    setPeriodo(String(months) as Periodo);
  }

  // Salas filtradas por unidade (aplica-se a todas as seções)
  const activeSalas = useMemo(
    () => salas.filter(s => !s.arquivada && (!unidadeId || s.unidade_id === unidadeId)),
    [salas, unidadeId],
  );

  // === Seção 1: KPI Headline ===
  const current = useMemo(() => {
    const total = activeSalas.length;
    const ocupadas = activeSalas.filter(s => s.ativo).length;
    const disponiveis = total - ocupadas;
    return { total, ocupadas, disponiveis, vacancia: total > 0 ? Math.round((disponiveis / total) * 100) : 0 };
  }, [activeSalas]);

  // === Seção 2 coluna esquerda: evolução ===
  const evolucao = useMemo((): VacanciaPoint[] => {
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
      result.push({ mes, ano, total, ocupadas, disponiveis, vacancia: total > 0 ? Math.round((disponiveis / total) * 100) : 0 });
    }
    return result;
  }, [activeSalas, contratos, inicio, fim, nowMes, nowAno]);

  // === Seção 2 coluna direita: vacância por unidade ===
  const porUnidade = useMemo(() => {
    const map = new Map<string, { total: number; ocupadas: number }>();
    for (const s of activeSalas) {
      const cur = map.get(s.unidade_id) ?? { total: 0, ocupadas: 0 };
      cur.total++;
      if (s.ativo) cur.ocupadas++;
      map.set(s.unidade_id, cur);
    }
    return unidades
      .filter(u => map.has(u.id))
      .map(u => {
        const d = map.get(u.id)!;
        const vagos = d.total - d.ocupadas;
        return { id: u.id, nome: u.nome, total: d.total, ocupadas: d.ocupadas, vagos, vacancia: d.total > 0 ? Math.round((vagos / d.total) * 100) : 0 };
      })
      .sort((a, b) => b.vacancia - a.vacancia);
  }, [activeSalas, unidades]);

  // === Seção 3: tempo de vacância por sala ===
  const salasVagasComDias = useMemo(() => {
    const result: { sala: EnergiaSala; dias: number; unidadeNome: string }[] = [];
    for (const s of activeSalas) {
      if (s.ativo) continue;
      // último contrato dessa sala
      const contratosSala = contratos
        .filter(c => c.sala_id === s.id)
        .sort((a, b) => (b.ano_fim * 12 + b.mes_fim) - (a.ano_fim * 12 + a.mes_fim));
      let inicioVacanciaMs: number;
      if (contratosSala.length > 0) {
        const last = contratosSala[0];
        // primeiro dia do mês seguinte ao fim do último contrato
        const mesFim = last.mes_fim;
        const anoFim = last.ano_fim;
        const proxMes = mesFim === 12 ? 1 : mesFim + 1;
        const proxAno = mesFim === 12 ? anoFim + 1 : anoFim;
        inicioVacanciaMs = new Date(proxAno, proxMes - 1, 1).getTime();
      } else {
        // nunca teve contrato: usa created_at
        inicioVacanciaMs = new Date(s.created_at).getTime();
      }
      const dias = Math.max(0, Math.floor((todayMs - inicioVacanciaMs) / (1000 * 60 * 60 * 24)));
      const unidade = unidades.find(u => u.id === s.unidade_id);
      result.push({ sala: s, dias, unidadeNome: unidade?.nome ?? '—' });
    }
    return result.sort((a, b) => b.dias - a.dias);
  }, [activeSalas, contratos, unidades, todayMs]);

  // histograma por faixa
  const histograma = useMemo(() => {
    const faixas = [
      { label: '0–30 dias', count: 0 },
      { label: '31–60 dias', count: 0 },
      { label: '61–90 dias', count: 0 },
      { label: '91–180 dias', count: 0 },
      { label: '+180 dias', count: 0 },
    ];
    for (const item of salasVagasComDias) {
      faixas[diasParaFaixa(item.dias)].count++;
    }
    const max = Math.max(...faixas.map(f => f.count), 1);
    return { faixas, max };
  }, [salasVagasComDias]);

  const rankingLimit = showAllRanking ? salasVagasComDias.length : 10;
  const ranking = salasVagasComDias.slice(0, rankingLimit);

  // SVG evolução
  const W = 600;
  const H = 200;
  const PAD_L = 28;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const yearRange = Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i);

  const headlineColor = vacanciaColor(current.vacancia);

  return (
    <div className="space-y-4">
      {/* ===== Seção 1: KPI Headline ===== */}
      <div className="bg-white border border-surface-2 rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mos-700/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-[18px] h-[18px] text-mos-700" strokeWidth={2} />
            </div>
            <div>
              <p className="font-body text-[10px] font-bold text-text-secondary tracking-widest uppercase">Estratégico</p>
              <p className="font-display font-bold text-base text-text-primary leading-tight">Vacância Atual</p>
            </div>
          </div>
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
        </div>

        <div className="px-5 pb-5">
          {/* Barra de progresso */}
          <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${headlineColor.bar}`}
              style={{ width: `${current.vacancia}%` }}
            />
          </div>

          {/* Número grande + fichas */}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className={`font-data font-extrabold text-5xl leading-none ${headlineColor.text}`}>
                {current.vacancia}%
              </span>
              <span className="font-body text-sm text-text-tertiary">de vacância</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 rounded-full border border-surface-2">
                <span className="font-body text-[10px] font-bold text-text-tertiary tracking-widest">TOTAL</span>
                <span className="font-data text-xs font-bold text-text-primary">{current.total}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-status-successLight rounded-full border border-status-success/20">
                <span className="font-body text-[10px] font-bold text-status-success tracking-widest">OCUPADOS</span>
                <span className="font-data text-xs font-bold text-status-success">{current.ocupadas}</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${headlineColor.bg} ${headlineColor.border}`}>
                <span className={`font-body text-[10px] font-bold tracking-widest ${headlineColor.text}`}>VAGOS</span>
                <span className={`font-data text-xs font-bold ${headlineColor.text}`}>{current.disponiveis}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Seção 2: Evolução + Por Unidade ===== */}
      <div className="bg-white border border-surface-2 rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-2">
          {/* Coluna esquerda (2/3): Evolução */}
          <div className="md:col-span-2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-mos-700" />
                <div>
                  <p className="font-body text-[10px] font-bold text-text-secondary tracking-widest uppercase">Temporal</p>
                  <p className="font-display font-bold text-sm text-text-primary leading-tight">Evolução da Vacância</p>
                </div>
              </div>
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

            {periodo === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-surface-2">
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

            {evolucao.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <TrendingDown className="w-8 h-8 text-text-disabled" />
                <p className="font-body text-sm text-text-tertiary">Sem dados para o período selecionado.</p>
              </div>
            ) : (
              <div ref={containerRef} className="relative select-none">
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full"
                    style={{ minWidth: `${Math.max(evolucao.length * 40, 300)}px` }}
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines + Y labels */}
                    {[0, 25, 50, 75, 100].map((yVal, i) => {
                      const y = PAD_T + plotH - (yVal / 100) * plotH;
                      return (
                        <g key={i}>
                          <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f0f0f0" strokeWidth={1} />
                          <text x={PAD_L - 6} y={y + 3} textAnchor="end" className="font-data" fontSize={9} fill="#8c9196">
                            {yVal}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Área + linha */}
                    {(() => {
                      const pts = evolucao.map((d, i) => {
                        const x = PAD_L + (evolucao.length === 1 ? plotW / 2 : (i / (evolucao.length - 1)) * plotW);
                        const y = PAD_T + plotH - (d.vacancia / 100) * plotH;
                        return { x, y, d };
                      });
                      const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                      const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${PAD_T + plotH} L ${pts[0].x.toFixed(1)} ${PAD_T + plotH} Z`;
                      return (
                        <>
                          <path d={areaPath} fill="#610000" fillOpacity={0.1} />
                          <path d={linePath} fill="none" stroke="#610000" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                          {pts.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={tooltip?.idx === i ? 4 : 2.5} fill="#610000" className="transition-all" />
                              <rect
                                x={p.x - (plotW / evolucao.length) / 2}
                                y={PAD_T}
                                width={plotW / evolucao.length}
                                height={plotH}
                                fill="transparent"
                                onMouseEnter={e => {
                                  const rect = containerRef.current?.getBoundingClientRect();
                                  if (rect) setTooltip({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                                }}
                                onMouseMove={e => {
                                  const rect = containerRef.current?.getBoundingClientRect();
                                  if (rect) setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
                                }}
                                onMouseLeave={() => setTooltip(null)}
                              />
                            </g>
                          ))}
                        </>
                      );
                    })()}

                    {/* X labels */}
                    {evolucao.map((d, i) => {
                      const x = PAD_L + (evolucao.length === 1 ? plotW / 2 : (i / (evolucao.length - 1)) * plotW);
                      return (
                        <text key={i} x={x} y={H - 6} textAnchor="middle" className="font-data" fontSize={9} fill={tooltip?.idx === i ? '#610000' : '#8c9196'} fontWeight={tooltip?.idx === i ? 700 : 400}>
                          {fmtMesAno(d.mes, d.ano)}
                        </text>
                      );
                    })}
                  </svg>
                </div>

                {/* Tooltip */}
                {tooltip !== null && evolucao[tooltip.idx] && (() => {
                  const pt = evolucao[tooltip.idx];
                  const containerW = containerRef.current?.clientWidth ?? 500;
                  const TW = 200;
                  const left = tooltip.x + 16 + TW > containerW ? tooltip.x - TW - 8 : tooltip.x + 16;
                  const top = Math.max(tooltip.y - 120, 0);
                  return (
                    <div className="absolute z-20 pointer-events-none" style={{ left, top }}>
                      <div className="bg-text-primary rounded-xl shadow-modal px-4 py-3 border border-white/5" style={{ width: TW }}>
                        <p className="font-display font-bold text-sm text-white mb-2.5">{fmtMesAno(pt.mes, pt.ano)}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-white/60">Vacância</span>
                            <span className={`font-data text-xs font-bold ${pt.vacancia === 0 ? 'text-green-400' : pt.vacancia > 25 ? 'text-red-400' : 'text-yellow-400'}`}>{pt.vacancia}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-white/60">Ocupados</span>
                            <span className="font-data text-xs font-semibold text-white">{pt.ocupadas} / {pt.total}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-white/60">Vagos</span>
                            <span className="font-data text-xs font-semibold text-white">{pt.disponiveis}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Coluna direita (1/3): Por Unidade */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-text-secondary" />
              <div>
                <p className="font-body text-[10px] font-bold text-text-secondary tracking-widest uppercase">Geográfico</p>
                <p className="font-display font-bold text-sm text-text-primary leading-tight">Vacância por Unidade</p>
              </div>
            </div>

            {porUnidade.length === 0 ? (
              <p className="font-body text-sm text-text-tertiary py-8 text-center">Nenhuma unidade com salas.</p>
            ) : (
              <div className="space-y-3">
                {porUnidade.map(u => {
                  const c = vacanciaColor(u.vacancia);
                  return (
                    <div key={u.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-xs font-medium text-text-primary truncate">{u.nome}</span>
                        <span className={`font-data text-xs font-bold ${c.text}`}>{u.vacancia}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${u.vacancia}%` }} />
                      </div>
                      <p className="font-body text-[10px] text-text-tertiary mt-0.5">{u.ocupadas} ocp / {u.total} total</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Seção 3: Histograma + Ranking ===== */}
      <div className="bg-white border border-surface-2 rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-2">
          {/* Coluna esquerda: Histograma */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-mos-700" />
              <div>
                <p className="font-body text-[10px] font-bold text-text-secondary tracking-widest uppercase">Operacional</p>
                <p className="font-display font-bold text-sm text-text-primary leading-tight">Tempo dos Imóveis Vagos</p>
              </div>
            </div>

            {salasVagasComDias.length === 0 ? (
              <p className="font-body text-sm text-text-tertiary py-8 text-center">Nenhum imóvel vago no momento.</p>
            ) : (
              <div className="space-y-3">
                {histograma.faixas.map((f, i) => {
                  const c = faixaColor(i);
                  const pct = histograma.max > 0 ? (f.count / histograma.max) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-body text-xs text-text-secondary w-20 flex-shrink-0">{f.label}</span>
                      <div className="flex-1 h-5 rounded-md bg-surface-1 overflow-hidden">
                        <div className={`h-full rounded-md transition-all duration-300 ${c.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-data text-xs font-bold text-text-primary w-6 text-right flex-shrink-0">{f.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna direita: Ranking */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-mos-700" />
              <div>
                <p className="font-body text-[10px] font-bold text-text-secondary tracking-widest uppercase">Operacional</p>
                <p className="font-display font-bold text-sm text-text-primary leading-tight">Imóveis Mais Tempo Vagos</p>
              </div>
            </div>

            {salasVagasComDias.length === 0 ? (
              <p className="font-body text-sm text-text-tertiary py-8 text-center">Nenhum imóvel vago no momento.</p>
            ) : (
              <div className="space-y-2">
                {ranking.map((item, i) => {
                  const faixa = diasParaFaixa(item.dias);
                  const c = faixaColor(faixa);
                  return (
                    <div key={item.sala.id} className="flex items-center gap-3 py-1.5">
                      <span className="font-data text-xs font-bold text-text-tertiary w-5 text-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-medium text-text-primary truncate">{item.sala.nome}</p>
                        <p className="font-body text-[10px] text-text-tertiary truncate">{item.unidadeNome}</p>
                      </div>
                      <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded-xs border ${c.badge} flex-shrink-0`}>
                        {formatarDuracao(item.dias)}
                      </span>
                    </div>
                  );
                })}
                {!showAllRanking && salasVagasComDias.length > 10 && (
                  <button
                    onClick={() => setShowAllRanking(true)}
                    className="w-full text-center font-body text-xs text-mos-700 hover:text-mos-600 font-medium py-1.5 transition-colors"
                  >
                    ver mais ({salasVagasComDias.length - 10})
                  </button>
                )}
                {showAllRanking && salasVagasComDias.length > 10 && (
                  <button
                    onClick={() => setShowAllRanking(false)}
                    className="w-full text-center font-body text-xs text-mos-700 hover:text-mos-600 font-medium py-1.5 transition-colors"
                  >
                    ver menos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
