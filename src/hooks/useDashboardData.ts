import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { EtapaEap, Medicao, FluxoFinanceiro } from '../lib/database.types';

export type PeriodoFilter = '6M' | '12M' | 'ALL';

export interface DashboardFilters {
  obraId: string | null;
  periodo: PeriodoFilter;
  dataInicio: string | null;
  dataFim: string | null;
}

export interface DashboardKpis {
  totalOrcado: number;
  totalRealizado: number;
  orcamentoDisponivel: number;
  percentRealizado: number;
}

function buildFluxoFromData(etapas: EtapaEap[], medicoes: Medicao[]): FluxoFinanceiro[] {
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

  return Array.from(monthMap.values()).map((v, i) => ({
    id: String(i),
    obra_id: 'computed',
    mes: v.mes,
    ano: v.ano,
    orcado: v.orcado,
    realizado: v.realizado,
    created_at: '',
  }));
}

function applyPeriodo(
  data: FluxoFinanceiro[],
  periodo: PeriodoFilter,
  dataInicio: string | null,
  dataFim: string | null,
): FluxoFinanceiro[] {
  const sorted = [...data].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  if (dataInicio || dataFim) {
    return sorted.filter(d => {
      const dt = new Date(d.ano, d.mes - 1, 1);
      if (dataInicio && dt < new Date(dataInicio)) return false;
      if (dataFim && dt > new Date(dataFim)) return false;
      return true;
    });
  }
  if (periodo === 'ALL') return sorted;
  return sorted.slice(-(periodo === '6M' ? 6 : 12));
}

export function useDashboardData(filters: DashboardFilters) {
  const [etapas, setEtapas] = useState<EtapaEap[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let etapasQuery = supabase.from('etapas_eap').select('*').eq('nivel', 'sub');
    let medicoesQuery = supabase.from('medicoes').select('*');
    if (filters.obraId) {
      etapasQuery = etapasQuery.eq('obra_id', filters.obraId);
      medicoesQuery = medicoesQuery.eq('obra_id', filters.obraId);
    }
    Promise.all([etapasQuery, medicoesQuery]).then(([etRes, medRes]) => {
      setEtapas(etRes.data ?? []);
      setMedicoes(medRes.data ?? []);
      setLoading(false);
    });
  }, [filters.obraId]);

  const rawFluxo = useMemo(() => buildFluxoFromData(etapas, medicoes), [etapas, medicoes]);

  const fluxoData = useMemo(
    () => applyPeriodo(rawFluxo, filters.periodo, filters.dataInicio, filters.dataFim),
    [rawFluxo, filters.periodo, filters.dataInicio, filters.dataFim],
  );

  const kpis = useMemo<DashboardKpis>(() => {
    const totalOrcado = etapas.reduce((s, e) => s + (e.valor_total ?? 0), 0);
    const totalRealizado = medicoes
      .filter(m => m.status === 'aprovada')
      .reduce((s, m) => s + (m.valor_total ?? 0), 0);
    return {
      totalOrcado,
      totalRealizado,
      orcamentoDisponivel: totalOrcado - totalRealizado,
      percentRealizado: totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0,
    };
  }, [etapas, medicoes]);

  return { fluxoData, kpis, loading, etapas, medicoes };
}
