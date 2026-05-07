import { useMemo } from 'react';
import type { EtapaEap, Medicao, FluxoFinanceiro, CurvaS, Obra } from '../lib/database.types';

export interface ObraKpis {
  totalOrcado: number;
  totalRealizado: number;
  desvio: number;
  desvioPercent: string;
  isOver: boolean;
  percentRealizado: number;
}

function parseDate(str: string | undefined): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function timeProgress(inicio: Date, fim: Date, hoje: Date): number {
  const total = fim.getTime() - inicio.getTime();
  if (total <= 0) return 100;
  const elapsed = hoje.getTime() - inicio.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function buildFluxoFromEtapasMedicoes(etapas: EtapaEap[], medicoes: Medicao[]): FluxoFinanceiro[] {
  const monthMap = new Map<string, { orcado: number; realizado: number; mes: number; ano: number }>();

  function getOrCreate(ano: number, mes: number) {
    const key = `${ano}-${mes}`;
    const cur = monthMap.get(key) ?? { orcado: 0, realizado: 0, mes, ano };
    monthMap.set(key, cur);
    return cur;
  }

  etapas
    .filter(e => e.nivel === 'sub' && e.data_inicio)
    .forEach(e => {
      const inicio = new Date(e.data_inicio!);
      if (isNaN(inicio.getTime())) return;
      const valor = e.valor_total ?? 0;
      const fim = e.data_fim ? new Date(e.data_fim) : null;

      if (!fim || isNaN(fim.getTime()) || fim < inicio) {
        getOrCreate(inicio.getFullYear(), inicio.getMonth() + 1).orcado += valor;
        return;
      }

      const startMonth = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      const endMonth = new Date(fim.getFullYear(), fim.getMonth(), 1);
      const totalMonths =
        (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
        (endMonth.getMonth() - startMonth.getMonth()) + 1;

      const perMonth = valor / totalMonths;
      const cur = new Date(startMonth);
      for (let i = 0; i < totalMonths; i++) {
        getOrCreate(cur.getFullYear(), cur.getMonth() + 1).orcado += perMonth;
        cur.setMonth(cur.getMonth() + 1);
      }
    });

  medicoes
    .filter(m => m.data_medicao && m.valor_total)
    .forEach(m => {
      const d = new Date(m.data_medicao!);
      if (isNaN(d.getTime())) return;
      getOrCreate(d.getFullYear(), d.getMonth() + 1).realizado += m.valor_total ?? 0;
    });

  return Array.from(monthMap.values())
    .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
    .map((v, i) => ({
      id: String(i),
      obra_id: 'computed',
      mes: v.mes,
      ano: v.ano,
      orcado: v.orcado,
      realizado: v.realizado,
      created_at: '',
    }));
}

export function buildCurvaSFromEtapasMedicoes(
  etapas: EtapaEap[],
  medicoes: Medicao[],
  obra: Obra,
): CurvaS[] {
  const hoje = new Date();
  const obraInicio = parseDate(obra.data_inicio);
  const obraFim = parseDate(obra.data_fim);
  if (!obraInicio || !obraFim) return [];

  const totalOrcado = etapas.filter(e => e.nivel === 'sub').reduce((s, e) => s + (e.valor_total ?? 0), 0);
  const totalRealizado = medicoes.filter(m => m.status === 'aprovada').reduce((s, m) => s + (m.valor_total ?? 0), 0);

  const months: CurvaS[] = [];
  const cur = new Date(obraInicio.getFullYear(), obraInicio.getMonth(), 1);
  const endMonth = new Date(obraFim.getFullYear(), obraFim.getMonth(), 1);

  let i = 0;
  while (cur <= endMonth && months.length < 36) {
    const endOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const planejadoAccum = totalOrcado > 0
      ? Math.min(100, (timeProgress(obraInicio, obraFim, endOfMonth) * 1))
      : 0;

    const realizadoAccum = cur <= hoje && totalOrcado > 0
      ? Math.min(100, (totalRealizado / totalOrcado) * planejadoAccum)
      : 0;

    months.push({
      id: `cs-${i}`,
      obra_id: obra.id,
      mes: cur.getMonth() + 1,
      ano: cur.getFullYear(),
      planejado_acum: Math.round(planejadoAccum * 10) / 10,
      realizado_acum: Math.round(realizadoAccum * 10) / 10,
      mensal: 0,
      created_at: '',
    });

    cur.setMonth(cur.getMonth() + 1);
    i++;
  }

  return months;
}

export function useObraData(obra: Obra, etapas: EtapaEap[], medicoes: Medicao[]) {
  const kpis = useMemo<ObraKpis>(() => {
    const totalOrcado = etapas.filter(e => e.nivel === 'sub').reduce((s, e) => s + (e.valor_total ?? 0), 0);
    const totalRealizado = medicoes
      .filter(m => m.status === 'aprovada')
      .reduce((s, m) => s + (m.valor_total ?? 0), 0);
    const desvio = totalRealizado - totalOrcado;
    const desvioAbs = Math.abs(desvio);
    const desvioPercent = totalOrcado > 0 ? ((desvioAbs / totalOrcado) * 100).toFixed(1) : '0.0';
    return {
      totalOrcado,
      totalRealizado,
      desvio,
      desvioPercent,
      isOver: desvio > 0,
      percentRealizado: totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0,
    };
  }, [etapas, medicoes]);

  const fluxo = useMemo(
    () => buildFluxoFromEtapasMedicoes(etapas, medicoes),
    [etapas, medicoes],
  );

  const curvaS = useMemo(
    () => buildCurvaSFromEtapasMedicoes(etapas, medicoes, obra),
    [etapas, medicoes, obra],
  );

  const cronogramaFromEtapas = useMemo(() => {
    const hoje = new Date();
    return etapas
      .map(e => {
        const inicio = parseDate(e.data_inicio);
        const fim = parseDate(e.data_fim);
        let avanco = 0;
        let status: 'concluida' | 'em_andamento' | 'atrasada' | 'aguardando' = 'aguardando';

        if (inicio && fim) {
          avanco = Math.round(timeProgress(inicio, fim, hoje));
          if (hoje < inicio) status = 'aguardando';
          else if (avanco >= 100) status = 'concluida';
          else if (hoje > fim) status = 'atrasada';
          else status = 'em_andamento';
        }

        return {
          id: e.id,
          obra_id: e.obra_id,
          etapa_codigo: e.codigo,
          etapa_nome: e.descricao,
          valor_total: e.valor_total ?? 0,
          status,
          avanco_percent: avanco,
          data_inicio_planejada: e.data_inicio,
          data_fim_planejada: e.data_fim,
          created_at: '',
        };
      });
  }, [etapas]);

  return { kpis, fluxo, curvaS, cronogramaFromEtapas };
}
