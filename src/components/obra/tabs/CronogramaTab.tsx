import { useState, useRef, useMemo } from 'react';
import { CheckCircle2, TrendingUp, AlertTriangle, Flag, RefreshCw, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CronogramaEtapa, CurvaS } from '../../../lib/database.types';
import { formatCurrency } from '../../../lib/formatters';
import { CurvaSChart } from '../../shared/CurvaSChart';

type StatusFilter = 'todos' | 'concluida' | 'em_andamento' | 'atrasada' | 'aguardando';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function isoToMonthYear(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  concluida: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />, color: 'text-status-success' },
  em_andamento: { icon: <TrendingUp className="w-3.5 h-3.5 text-mos-700" />, color: 'text-mos-700' },
  atrasada: { icon: <AlertTriangle className="w-3.5 h-3.5 text-status-error" />, color: 'text-status-error' },
  aguardando: { icon: <Flag className="w-3.5 h-3.5 text-status-warning" />, color: 'text-status-warning' },
};

interface CronogramaTabProps {
  etapas: CronogramaEtapa[];
  curvaS: CurvaS[];
}

export function CronogramaTab({ etapas, curvaS }: CronogramaTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const ganttRef = useRef<HTMLDivElement>(null);

  const hoje = new Date();
  const todayKey = monthKey(hoje);

  const months = useMemo(() => {
    const allDates: Date[] = [];
    etapas.forEach(e => {
      if (e.data_inicio_planejada) { const d = new Date(e.data_inicio_planejada); if (!isNaN(d.getTime())) allDates.push(d); }
      if (e.data_fim_planejada) { const d = new Date(e.data_fim_planejada); if (!isNaN(d.getTime())) allDates.push(d); }
    });

    if (!allDates.length) {
      const result: Date[] = [];
      for (let i = 0; i < 12; i++) {
        result.push(new Date(hoje.getFullYear(), hoje.getMonth() + i - 2, 1));
      }
      return result;
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    minDate.setDate(1);
    maxDate.setDate(1);

    const result: Date[] = [];
    const cur = new Date(minDate);
    while (cur <= maxDate || result.length < 6) {
      result.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
      if (result.length > 48) break;
    }
    return result;
  }, [etapas]);

  const monthKeys = useMemo(() => months.map(m => monthKey(m)), [months]);

  const counts = {
    concluida: etapas.filter(e => e.status === 'concluida').length,
    em_andamento: etapas.filter(e => e.status === 'em_andamento').length,
    atrasada: etapas.filter(e => e.status === 'atrasada').length,
    aguardando: etapas.filter(e => e.status === 'aguardando').length,
  };

  const filtered = statusFilter === 'todos' ? etapas : etapas.filter(e => e.status === statusFilter);
  const totalPercent = Math.round(etapas.reduce((s, e) => s + e.avanco_percent, 0) / (etapas.length || 1));

  const CELL_W = 72;
  const todayIdx = monthKeys.indexOf(todayKey);
  const todayLabel = `${MONTH_NAMES[hoje.getMonth()]}/${String(hoje.getFullYear()).slice(2)}`;

  const scrollGantt = (dir: number) => {
    if (ganttRef.current) ganttRef.current.scrollLeft += dir * CELL_W * 3;
  };

  const segWidth = (tipo: 'concluida' | 'em_andamento' | 'atrasada' | 'aguardando') =>
    etapas.length ? (counts[tipo] / etapas.length) * 100 : 0;

  function getBarPosition(etapa: CronogramaEtapa): { startIdx: number; endIdx: number } {
    const startStr = etapa.data_inicio_planejada;
    const endStr = etapa.data_fim_planejada;
    if (!startStr || !endStr) return { startIdx: -1, endIdx: -1 };
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { startIdx: -1, endIdx: -1 };
    const si = monthKeys.indexOf(monthKey(startDate));
    const ei = monthKeys.indexOf(monthKey(endDate));
    return { startIdx: si, endIdx: ei };
  }

  return (
    <div className="p-6 space-y-5">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-text-primary">Cronograma Físico</h3>
            <p className="font-body text-xs text-text-tertiary mt-0.5">
              Gantt mensal · Prazos definidos no{' '}
              <span className="text-mos-700 underline cursor-pointer">Orçamento</span>
              {' · Progresso calculado por tempo'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded hover:bg-surface-2 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 font-body text-xs text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-mos-700" />
              Hoje: {todayLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-4 border-b border-surface-2 pb-3">
          {(['todos', 'concluida', 'em_andamento', 'atrasada', 'aguardando'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md font-body text-xs font-medium transition-colors ${statusFilter === s ? 'bg-surface-2 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              {s === 'todos' ? 'Todos' : s === 'em_andamento' ? 'Em Andamento' : s === 'atrasada' ? 'Atrasada' : s === 'aguardando' ? 'Aguardando' : 'Concluída'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Etapas Concluídas', count: counts.concluida, sub: '100% de progresso', icon: <CheckCircle2 className="w-5 h-5 text-status-success" />, bg: 'bg-status-successLight' },
            { label: 'Em Andamento', count: counts.em_andamento, sub: 'Execução ativa', icon: <TrendingUp className="w-5 h-5 text-mos-700" />, bg: 'bg-mos-50' },
            { label: 'Etapas Atrasadas', count: counts.atrasada, sub: 'Requer atenção', icon: <AlertTriangle className="w-5 h-5 text-status-error" />, bg: 'bg-status-errorLight' },
            { label: 'Aguardando Início', count: counts.aguardando, sub: 'Não iniciadas', icon: <Flag className="w-5 h-5 text-status-warning" />, bg: 'bg-status-warningLight' },
          ].map((c, i) => (
            <div key={i} className="border border-surface-3 rounded-lg p-3 text-center">
              <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center mx-auto mb-2`}>
                {c.icon}
              </div>
              <p className="font-data font-bold text-2xl text-text-primary">{c.count}</p>
              <p className="font-body text-xs font-semibold text-text-secondary">{c.label}</p>
              <p className="font-body text-xs text-text-tertiary">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-display font-semibold text-sm text-text-primary">Avanço Físico Geral</p>
              <p className="font-body text-xs text-text-tertiary">{etapas.length} etapas · Orçamento total: {formatCurrency(etapas.reduce((s, e) => s + e.valor_total, 0))}</p>
            </div>
            <p className="font-data font-bold text-2xl text-text-primary">{totalPercent}%</p>
          </div>
          <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden flex">
            <div className="h-full bg-status-success transition-all" style={{ width: `${segWidth('concluida')}%` }} />
            <div className="h-full bg-mos-700 transition-all" style={{ width: `${segWidth('em_andamento')}%` }} />
            <div className="h-full bg-status-error transition-all" style={{ width: `${segWidth('atrasada')}%` }} />
            <div className="h-full bg-surface-3 transition-all" style={{ width: `${segWidth('aguardando')}%` }} />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {[
              { label: 'Concluídas', count: counts.concluida, color: 'bg-status-success' },
              { label: 'Em Andamento', count: counts.em_andamento, color: 'bg-mos-700' },
              { label: 'Atrasadas', count: counts.atrasada, color: 'bg-status-error' },
              { label: 'Aguardando', count: counts.aguardando, color: 'bg-surface-3 border border-surface-3' },
            ].map((l, i) => (
              <span key={i} className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                <span className={`w-2 h-2 rounded-full ${l.color} inline-block`} />
                {l.label} {l.count}
              </span>
            ))}
          </div>
        </div>

        {etapas.length === 0 ? (
          <div className="border border-surface-3 rounded-lg p-8 text-center">
            <p className="font-body text-sm text-text-tertiary">Nenhuma etapa macro com datas encontrada no orçamento.</p>
            <p className="font-body text-xs text-text-disabled mt-1">Adicione etapas com datas de início e fim no Orçamento para visualizar o Gantt.</p>
          </div>
        ) : (
          <div className="border border-surface-3 rounded-lg overflow-hidden">
            <div className="flex">
              <div className="w-64 shrink-0 border-r border-surface-3 bg-surface-1">
                <div className="h-10 border-b border-surface-3 flex items-center px-3">
                  <span className="font-body text-xs font-semibold text-text-tertiary tracking-wider">ETAPA (EAP)</span>
                </div>
                {filtered.map((e) => (
                  <div key={e.id} className="h-14 border-b border-surface-2 flex items-center gap-2 px-3">
                    {statusConfig[e.status]?.icon || <Flag className="w-3.5 h-3.5 text-text-disabled" />}
                    <div className="min-w-0">
                      <p className="font-body text-xs font-semibold text-text-primary truncate">{e.etapa_codigo} {e.etapa_nome}</p>
                      <p className="font-data text-xs text-text-tertiary">
                        {e.data_inicio_planejada ? isoToMonthYear(e.data_inicio_planejada) : '—'} → {e.data_fim_planejada ? isoToMonthYear(e.data_fim_planejada) : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-hidden relative">
                <button onClick={() => scrollGantt(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white shadow-card flex items-center justify-center hover:bg-surface-1 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-text-secondary" />
                </button>
                <button onClick={() => scrollGantt(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white shadow-card flex items-center justify-center hover:bg-surface-1 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                </button>

                <div ref={ganttRef} className="overflow-x-auto">
                  <div style={{ minWidth: months.length * CELL_W }}>
                    <div className="flex h-10 border-b border-surface-3 bg-surface-1">
                      {months.map((m, i) => {
                        const key = monthKeys[i];
                        const isToday = key === todayKey;
                        return (
                          <div
                            key={key}
                            style={{ width: CELL_W }}
                            className={`shrink-0 flex items-center justify-center border-r border-surface-2 font-data text-xs ${isToday ? 'text-mos-700 font-bold bg-mos-50' : 'text-text-tertiary'}`}
                          >
                            {MONTH_NAMES[m.getMonth()]}/{String(m.getFullYear()).slice(2)}
                            {isToday && <span className="ml-1 w-1 h-1 rounded-full bg-mos-700" />}
                          </div>
                        );
                      })}
                    </div>

                    {filtered.map((etapa) => {
                      const { startIdx, endIdx } = getBarPosition(etapa);
                      const barStart = startIdx >= 0 ? startIdx * CELL_W : -1;
                      const barWidth = (endIdx >= 0 && startIdx >= 0) ? (endIdx - startIdx + 1) * CELL_W : 0;

                      return (
                        <div key={etapa.id} className="h-14 border-b border-surface-2 relative flex">
                          {months.map((_, mi) => {
                            const key = monthKeys[mi];
                            const isToday = key === todayKey;
                            return (
                              <div
                                key={key}
                                style={{ width: CELL_W }}
                                className={`shrink-0 h-full border-r border-surface-2 ${isToday ? 'bg-mos-50/50' : ''}`}
                              />
                            );
                          })}
                          {barStart >= 0 && barWidth > 0 && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 rounded-sm"
                              style={{ left: barStart + 4, width: barWidth - 8, height: 20, background: '#e8e8e8' }}
                            >
                              <div
                                className="h-full rounded-sm bg-mos-700"
                                style={{ width: `${etapa.avanco_percent}%` }}
                              />
                              {etapa.avanco_percent > 0 && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-data text-[10px] font-bold text-white">
                                  {etapa.avanco_percent}%
                                </span>
                              )}
                            </div>
                          )}
                          {todayIdx >= 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-mos-700 opacity-40"
                              style={{ left: todayIdx * CELL_W + CELL_W / 2 }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2 bg-surface-1 border-t border-surface-3">
              <div className="flex items-center gap-4">
                <span className="font-body text-xs text-text-tertiary">| Linha vertical = hoje ({todayLabel})</span>
                <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                  <span className="inline-block w-6 h-3 rounded-sm bg-surface-3 border border-surface-3" /> Track cinza = prazo do orçamento
                </span>
                <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                  <span className="inline-block w-6 h-3 rounded-sm bg-mos-700" /> Fill = avanço calculado
                </span>
              </div>
              <button className="flex items-center gap-1.5 font-body text-xs text-mos-700 hover:underline">
                <Pencil className="w-3 h-3" />
                Editar prazos no Orçamento
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-3">
          <h3 className="font-display font-semibold text-sm text-text-primary">Curva S do Projeto</h3>
          <p className="font-body text-xs text-text-tertiary mt-0.5">Planejado vs Realizado acumulado (%)</p>
        </div>
        <CurvaSChart data={curvaS} showPeriodFilter defaultPeriodo="todos" height={240} />
      </div>
    </div>
  );
}
