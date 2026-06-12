import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Zap, DollarSign, Building2, DoorOpen, ChevronDown } from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatKWh, formatMesAno, getAnoAtual, getMesAtual } from '../utils/calculos';
import type { EnergiaMedicao, EnergiaSala, EnergiaUnidade, EnergiaAluguel } from '../types';
import { MESES_LABEL } from '../types';

type TabId = 'consumo' | 'custos' | 'exportar';
type ExportType = 'medicoes' | 'por-sala' | 'mensal';

const TABS = [
  { id: 'consumo' as TabId, label: 'Consumo', Icon: Zap },
  { id: 'custos' as TabId, label: 'Custos', Icon: DollarSign },
  { id: 'exportar' as TabId, label: 'Exportar', Icon: Download },
];

function formatShort(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function toMonthIndex(mes: number, ano: number) {
  return ano * 12 + mes;
}

function downloadCSV(rows: string[][], filename: string) {
  const content = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const { user, isAdmin } = useEnergiaAuth();
  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [medicoes, setMedicoes] = useState<EnergiaMedicao[]>([]);
  const [alugueis, setAlugueis] = useState<EnergiaAluguel[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabId>('consumo');
  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [filterSalaId, setFilterSalaId] = useState('');
  const [mesInicio, setMesInicio] = useState(1);
  const [anoInicio, setAnoInicio] = useState(() => getAnoAtual());
  const [mesFim, setMesFim] = useState(() => getMesAtual());
  const [anoFim, setAnoFim] = useState(() => getAnoAtual());
  const [exportType, setExportType] = useState<ExportType>('medicoes');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let uQ = supabase.from('energia_unidades').select('*').order('nome');
      let sQ = supabase.from('energia_salas').select('*').eq('ativo', true).order('nome');
      const mQ = supabase.from('energia_medicoes').select('*');
      const aQ = supabase.from('energia_alugueis').select('*');

      if (!isAdmin && user?.unidade_id) {
        uQ = uQ.eq('id', user.unidade_id);
        sQ = sQ.eq('unidade_id', user.unidade_id);
      }

      const [uRes, sRes, mRes, aRes] = await Promise.all([uQ, sQ, mQ, aQ]);
      const fetchedSalas = (sRes.data as EnergiaSala[]) || [];
      let fetchedMedicoes = (mRes.data as EnergiaMedicao[]) || [];
      let fetchedAlugueis = (aRes.data as EnergiaAluguel[]) || [];

      if (!isAdmin && user?.unidade_id) {
        const salaIds = new Set(fetchedSalas.map(s => s.id));
        fetchedMedicoes = fetchedMedicoes.filter(m => salaIds.has(m.sala_id));
        fetchedAlugueis = fetchedAlugueis.filter(a => salaIds.has(a.sala_id));
      }

      setUnidades((uRes.data as EnergiaUnidade[]) || []);
      setSalas(fetchedSalas);
      setMedicoes(fetchedMedicoes);
      setAlugueis(fetchedAlugueis);
      if (!isAdmin && user?.unidade_id) setFilterUnidadeId(user.unidade_id);
      setLoading(false);
    })();
  }, [isAdmin, user]);

  const salaMap = useMemo(() => new Map(salas.map(s => [s.id, s])), [salas]);
  const unidadeMap = useMemo(() => new Map(unidades.map(u => [u.id, u])), [unidades]);

  const salasForFilter = useMemo(() => {
    if (!filterUnidadeId) return salas;
    return salas.filter(s => s.unidade_id === filterUnidadeId);
  }, [salas, filterUnidadeId]);

  const filteredMedicoes = useMemo(() => {
    const idxInicio = toMonthIndex(mesInicio, anoInicio);
    const idxFim = toMonthIndex(mesFim, anoFim);
    return medicoes.filter(m => {
      const idx = toMonthIndex(m.mes, m.ano);
      if (idx < idxInicio || idx > idxFim) return false;
      const sala = salaMap.get(m.sala_id);
      if (!sala) return false;
      if (filterUnidadeId && sala.unidade_id !== filterUnidadeId) return false;
      if (filterSalaId && m.sala_id !== filterSalaId) return false;
      return true;
    });
  }, [medicoes, mesInicio, anoInicio, mesFim, anoFim, filterUnidadeId, filterSalaId, salaMap]);

  const filteredAlugueis = useMemo(() => {
    const idxInicio = toMonthIndex(mesInicio, anoInicio);
    const idxFim = toMonthIndex(mesFim, anoFim);
    return alugueis.filter(a => {
      const idx = toMonthIndex(a.mes, a.ano);
      if (idx < idxInicio || idx > idxFim) return false;
      const sala = salaMap.get(a.sala_id);
      if (!sala) return false;
      if (filterUnidadeId && sala.unidade_id !== filterUnidadeId) return false;
      if (filterSalaId && a.sala_id !== filterSalaId) return false;
      return true;
    });
  }, [alugueis, mesInicio, anoInicio, mesFim, anoFim, filterUnidadeId, filterSalaId, salaMap]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { mes: number; ano: number; consumo: number; custo: number; aluguel: number }>();
    for (const m of filteredMedicoes) {
      const key = `${m.ano}-${String(m.mes).padStart(2, '0')}`;
      const cur = map.get(key) || { mes: m.mes, ano: m.ano, consumo: 0, custo: 0, aluguel: 0 };
      cur.consumo += m.consumo;
      cur.custo += m.valor_total;
      map.set(key, cur);
    }
    for (const a of filteredAlugueis) {
      const key = `${a.ano}-${String(a.mes).padStart(2, '0')}`;
      const cur = map.get(key) || { mes: a.mes, ano: a.ano, consumo: 0, custo: 0, aluguel: 0 };
      cur.aluguel += a.valor;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  }, [filteredMedicoes, filteredAlugueis]);

  const bySalaData = useMemo(() => {
    const map = new Map<string, { salaId: string; consumo: number; custo: number; aluguel: number }>();
    for (const m of filteredMedicoes) {
      const cur = map.get(m.sala_id) || { salaId: m.sala_id, consumo: 0, custo: 0, aluguel: 0 };
      cur.consumo += m.consumo;
      cur.custo += m.valor_total;
      map.set(m.sala_id, cur);
    }
    for (const a of filteredAlugueis) {
      const cur = map.get(a.sala_id) || { salaId: a.sala_id, consumo: 0, custo: 0, aluguel: 0 };
      cur.aluguel += a.valor;
      map.set(a.sala_id, cur);
    }
    return [...map.values()].sort((a, b) => b.consumo - a.consumo);
  }, [filteredMedicoes, filteredAlugueis]);

  const totalKWh = useMemo(() => filteredMedicoes.reduce((s, m) => s + m.consumo, 0), [filteredMedicoes]);
  const mediaMensalKWh = monthlyData.length ? totalKWh / monthlyData.length : 0;
  const picoMes = monthlyData.reduce(
    (best, d) => d.consumo > best.consumo ? d : best,
    { mes: 0, ano: 0, consumo: 0, custo: 0, aluguel: 0 }
  );
  const custoEnergia = useMemo(() => filteredMedicoes.reduce((s, m) => s + m.valor_total, 0), [filteredMedicoes]);
  const custoAluguel = useMemo(() => filteredAlugueis.reduce((s, a) => s + a.valor, 0), [filteredAlugueis]);
  const custoTotal = custoEnergia + custoAluguel;
  const ticketMedio = bySalaData.length ? custoTotal / bySalaData.length : 0;

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    for (const m of medicoes) anos.add(m.ano);
    for (const a of alugueis) anos.add(a.ano);
    anos.add(getAnoAtual());
    return [...anos].sort((a, b) => a - b);
  }, [medicoes, alugueis]);

  const maxConsumoMes = Math.max(...monthlyData.map(d => d.consumo), 1);
  const maxCustoMes = Math.max(...monthlyData.map(d => d.custo + d.aluguel), 1);
  const maxConsumoSala = bySalaData.length > 0 ? bySalaData[0].consumo : 1;

  function buildExportRows(): string[][] {
    if (exportType === 'medicoes') {
      const header = ['Competência', 'Sala', 'Unidade', 'Leit. Anterior', 'Leit. Atual', 'Consumo (kWh)', 'Tarifa (R$/kWh)', 'Valor (R$)'];
      const rows = [...filteredMedicoes]
        .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
        .map(m => {
          const sala = salaMap.get(m.sala_id);
          const unidade = sala ? unidadeMap.get(sala.unidade_id) : undefined;
          return [
            formatMesAno(m.mes, m.ano),
            sala?.nome ?? m.sala_id,
            unidade?.nome ?? '',
            String(m.leitura_anterior),
            String(m.leitura_atual),
            m.consumo.toFixed(1),
            m.tarifa.toFixed(4),
            m.valor_total.toFixed(2),
          ];
        });
      return [header, ...rows];
    }
    if (exportType === 'por-sala') {
      const header = ['Sala', 'Unidade', 'Consumo (kWh)', 'Custo Energia (R$)', 'Aluguel (R$)', 'Total (R$)'];
      const rows = bySalaData.map(d => {
        const sala = salaMap.get(d.salaId);
        const unidade = sala ? unidadeMap.get(sala.unidade_id) : undefined;
        return [
          sala?.nome ?? d.salaId,
          unidade?.nome ?? '',
          d.consumo.toFixed(1),
          d.custo.toFixed(2),
          d.aluguel.toFixed(2),
          (d.custo + d.aluguel).toFixed(2),
        ];
      });
      return [header, ...rows];
    }
    const header = ['Mês/Ano', 'Consumo (kWh)', 'Custo Energia (R$)', 'Aluguel (R$)', 'Total (R$)'];
    const rows = monthlyData.map(d => [
      formatMesAno(d.mes, d.ano),
      d.consumo.toFixed(1),
      d.custo.toFixed(2),
      d.aluguel.toFixed(2),
      (d.custo + d.aluguel).toFixed(2),
    ]);
    return [header, ...rows];
  }

  function handleExportCSV() {
    const rows = buildExportRows();
    const label = exportType === 'medicoes' ? 'medicoes' : exportType === 'por-sala' ? 'resumo-sala' : 'resumo-mensal';
    downloadCSV(rows, `energia-${label}-${anoInicio}${String(mesInicio).padStart(2,'0')}-${anoFim}${String(mesFim).padStart(2,'0')}.csv`);
  }

  const exportRows = buildExportRows();
  const previewRows = exportRows.slice(0, 11);

  const selectCls = 'w-full px-2.5 py-2 text-xs font-body bg-surface-1 border border-surface-2 rounded-lg text-text-primary appearance-none focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700/50';
  const labelCls = 'block font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1';

  if (loading) {
    return (
      <EnergiaLayout title="Relatórios" subtitle="Análise e exportação de dados">
        <div className="p-6 space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </EnergiaLayout>
    );
  }

  return (
    <EnergiaLayout title="Relatórios" subtitle="Análise e exportação de dados de energia">
      <div className="p-6 space-y-6">

        {/* Filter bar */}
        <div className="card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className={labelCls}>Unidade</label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                <select
                  value={filterUnidadeId}
                  onChange={e => { setFilterUnidadeId(e.target.value); setFilterSalaId(''); }}
                  disabled={!isAdmin}
                  className={`${selectCls} pl-7 pr-7 disabled:opacity-60`}
                >
                  <option value="">Todas</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Sala</label>
              <div className="relative">
                <DoorOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                <select
                  value={filterSalaId}
                  onChange={e => setFilterSalaId(e.target.value)}
                  className={`${selectCls} pl-7 pr-7`}
                >
                  <option value="">Todas</option>
                  {salasForFilter.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Mês início</label>
              <select value={mesInicio} onChange={e => setMesInicio(Number(e.target.value))} className={selectCls}>
                {MESES_LABEL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Ano início</label>
              <select value={anoInicio} onChange={e => setAnoInicio(Number(e.target.value))} className={selectCls}>
                {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Mês fim</label>
              <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className={selectCls}>
                {MESES_LABEL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Ano fim</label>
              <select value={anoFim} onChange={e => setAnoFim(Number(e.target.value))} className={selectCls}>
                {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-surface-0 rounded-xl p-1 border border-surface-2 w-fit">
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-mos-700 text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-1'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── CONSUMO TAB ── */}
        {activeTab === 'consumo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="font-body text-xs text-text-tertiary mb-1">Total no período</p>
                <p className="font-data text-2xl font-bold text-text-primary">{formatShort(totalKWh)}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">kWh consumidos</p>
              </div>
              <div className="card p-4">
                <p className="font-body text-xs text-text-tertiary mb-1">Média mensal</p>
                <p className="font-data text-2xl font-bold text-text-primary">{formatShort(mediaMensalKWh)}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">kWh / mês</p>
              </div>
              <div className="card p-4">
                <p className="font-body text-xs text-text-tertiary mb-1">Pico de consumo</p>
                <p className="font-data text-2xl font-bold text-mos-700">{formatShort(picoMes.consumo)}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">
                  {picoMes.mes ? formatMesAno(picoMes.mes, picoMes.ano) : '—'}
                </p>
              </div>
              <div className="card p-4">
                <p className="font-body text-xs text-text-tertiary mb-1">Medições</p>
                <p className="font-data text-2xl font-bold text-text-primary">{filteredMedicoes.length}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">lançamentos</p>
              </div>
            </div>

            {monthlyData.length > 0 && (
              <div className="card p-5">
                <p className="font-display font-semibold text-sm text-text-primary mb-4">Consumo mensal (kWh)</p>
                <div className="overflow-x-auto">
                  <div
                    className="flex items-end gap-1.5 pt-6 pb-1"
                    style={{ minWidth: `${monthlyData.length * 56}px`, height: '200px' }}
                  >
                    {monthlyData.map((d, i) => {
                      const h = Math.max((d.consumo / maxConsumoMes) * 140, d.consumo > 0 ? 4 : 0);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[44px] group cursor-default">
                          <span className="font-data text-[9px] text-text-tertiary group-hover:text-text-secondary transition-colors leading-none">
                            {formatShort(d.consumo)}
                          </span>
                          <div className="flex flex-col justify-end flex-1 w-full px-1">
                            <div
                              className="rounded-t-[3px] bg-mos-700/75 group-hover:bg-mos-700 transition-all duration-200 w-full"
                              style={{ height: `${h}px` }}
                            />
                          </div>
                          <span className="font-data text-[9px] text-text-tertiary whitespace-nowrap">
                            {formatMesAno(d.mes, d.ano)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {bySalaData.length > 0 && (
              <div className="card p-5">
                <p className="font-display font-semibold text-sm text-text-primary mb-4">Ranking por consumo</p>
                <div className="space-y-3">
                  {bySalaData.slice(0, 10).map((d, i) => {
                    const sala = salaMap.get(d.salaId);
                    const unidade = sala ? unidadeMap.get(sala.unidade_id) : undefined;
                    const pct = (d.consumo / maxConsumoSala) * 100;
                    return (
                      <div key={d.salaId} className="flex items-center gap-3">
                        <span className={`font-data text-xs font-bold w-5 text-right shrink-0 ${
                          i === 0 ? 'text-yellow-500' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-600' : 'text-text-disabled'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-body text-xs font-medium text-text-primary truncate">
                              {sala?.nome ?? d.salaId}
                            </span>
                            <span className="font-data text-xs text-text-secondary ml-2 shrink-0">
                              {formatKWh(d.consumo)}
                            </span>
                          </div>
                          <div className="w-full bg-surface-2 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-mos-700/70 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {unidade && (
                            <p className="font-body text-[10px] text-text-tertiary mt-0.5">{unidade.nome}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredMedicoes.length === 0 && (
              <div className="card p-10 flex flex-col items-center gap-3 text-center">
                <Zap className="w-10 h-10 text-text-disabled" strokeWidth={1.4} />
                <p className="font-body text-sm text-text-secondary">
                  Nenhuma medição encontrada para os filtros selecionados.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOS TAB ── */}
        {activeTab === 'custos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="font-body text-xs text-text-tertiary mb-1">Custo energia</p>
                <p className="font-data text-xl font-bold text-text-primary">{formatShort(custoEnergia)}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">R$ medições</p>
              </div>
              <div className="card p-4">
                <p className="font-body text-xs text-text-tertiary mb-1">Custo aluguel</p>
                <p className="font-data text-xl font-bold text-text-primary">{formatShort(custoAluguel)}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">R$ aluguéis</p>
              </div>
              <div className="card p-4 border-l-2 border-mos-700">
                <p className="font-body text-xs text-text-tertiary mb-1">Custo total</p>
                <p className="font-data text-xl font-bold text-mos-700">{formatShort(custoTotal)}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">R$ no período</p>
              </div>
              <div className="card p-4">
                <p className="font-body text-xs text-text-tertiary mb-1">Ticket médio / sala</p>
                <p className="font-data text-xl font-bold text-text-primary">{formatShort(ticketMedio)}</p>
                <p className="font-body text-[10px] text-text-tertiary mt-0.5">R$ por sala</p>
              </div>
            </div>

            {monthlyData.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <p className="font-display font-semibold text-sm text-text-primary">Custo mensal (R$)</p>
                  <div className="flex items-center gap-4 font-body text-xs text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-mos-700 inline-block" /> Energia
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-mos-700/25 inline-block" /> Aluguel
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div
                    className="flex items-end gap-1.5 pb-1"
                    style={{ minWidth: `${monthlyData.length * 64}px`, height: '200px' }}
                  >
                    {monthlyData.map((d, i) => {
                      const hCusto = Math.max((d.custo / maxCustoMes) * 140, d.custo > 0 ? 4 : 0);
                      const hAluguel = Math.max((d.aluguel / maxCustoMes) * 140, d.aluguel > 0 ? 4 : 0);
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[52px] group cursor-default">
                          <div className="flex items-end gap-1 flex-1">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-data text-[9px] text-text-tertiary leading-none">
                                {d.custo > 0 ? formatShort(d.custo) : ''}
                              </span>
                              <div
                                className="rounded-t-[3px] bg-mos-700 group-hover:bg-mos-700/85 transition-colors w-5"
                                style={{ height: `${hCusto}px` }}
                              />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-data text-[9px] text-text-tertiary leading-none">
                                {d.aluguel > 0 ? formatShort(d.aluguel) : ''}
                              </span>
                              <div
                                className="rounded-t-[3px] bg-mos-700/25 group-hover:bg-mos-700/35 transition-colors w-5"
                                style={{ height: `${hAluguel}px` }}
                              />
                            </div>
                          </div>
                          <span className="font-data text-[9px] text-text-tertiary whitespace-nowrap">
                            {formatMesAno(d.mes, d.ano)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {bySalaData.length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-surface-2">
                  <p className="font-display font-semibold text-sm text-text-primary">Custos por sala</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-2 bg-surface-1">
                        <th className="px-4 py-3 text-left font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Sala</th>
                        <th className="px-4 py-3 text-left font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider hidden sm:table-cell">Unidade</th>
                        <th className="px-4 py-3 text-right font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Consumo</th>
                        <th className="px-4 py-3 text-right font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider hidden md:table-cell">Energia</th>
                        <th className="px-4 py-3 text-right font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider hidden md:table-cell">Aluguel</th>
                        <th className="px-4 py-3 text-right font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-2">
                      {bySalaData.map(d => {
                        const sala = salaMap.get(d.salaId);
                        const unidade = sala ? unidadeMap.get(sala.unidade_id) : undefined;
                        return (
                          <tr key={d.salaId} className="hover:bg-surface-1 transition-colors">
                            <td className="px-4 py-3 font-body text-xs text-text-primary">{sala?.nome ?? d.salaId}</td>
                            <td className="px-4 py-3 font-body text-xs text-text-secondary hidden sm:table-cell">{unidade?.nome ?? '—'}</td>
                            <td className="px-4 py-3 font-data text-xs text-text-secondary text-right">{formatKWh(d.consumo)}</td>
                            <td className="px-4 py-3 font-data text-xs text-text-secondary text-right hidden md:table-cell">{formatCurrencyBR(d.custo)}</td>
                            <td className="px-4 py-3 font-data text-xs text-text-secondary text-right hidden md:table-cell">{formatCurrencyBR(d.aluguel)}</td>
                            <td className="px-4 py-3 font-data text-xs font-semibold text-text-primary text-right">{formatCurrencyBR(d.custo + d.aluguel)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-surface-1 border-t-2 border-surface-2">
                      <tr>
                        <td className="px-4 py-3 font-display font-bold text-xs text-text-primary" colSpan={2}>Total geral</td>
                        <td className="px-4 py-3 font-data text-xs font-bold text-text-primary text-right">{formatKWh(totalKWh)}</td>
                        <td className="px-4 py-3 font-data text-xs font-bold text-text-primary text-right hidden md:table-cell">{formatCurrencyBR(custoEnergia)}</td>
                        <td className="px-4 py-3 font-data text-xs font-bold text-text-primary text-right hidden md:table-cell">{formatCurrencyBR(custoAluguel)}</td>
                        <td className="px-4 py-3 font-data text-xs font-bold text-mos-700 text-right">{formatCurrencyBR(custoTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {bySalaData.length === 0 && (
              <div className="card p-10 flex flex-col items-center gap-3 text-center">
                <DollarSign className="w-10 h-10 text-text-disabled" strokeWidth={1.4} />
                <p className="font-body text-sm text-text-secondary">
                  Nenhum dado de custo encontrado para os filtros selecionados.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── EXPORTAR TAB ── */}
        {activeTab === 'exportar' && (
          <div className="space-y-6">
            <div className="card p-5">
              <p className="font-display font-semibold text-sm text-text-primary mb-4">Tipo de relatório</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'medicoes' as ExportType,
                    label: 'Medições detalhadas',
                    desc: 'Todas as medições com leituras, consumo e valores por lançamento',
                  },
                  {
                    id: 'por-sala' as ExportType,
                    label: 'Resumo por sala',
                    desc: 'Consumo e custos totais agrupados por sala no período selecionado',
                  },
                  {
                    id: 'mensal' as ExportType,
                    label: 'Resumo mensal',
                    desc: 'Totais de consumo, energia e aluguel agrupados por mês',
                  },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setExportType(opt.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                      exportType === opt.id
                        ? 'border-mos-700 bg-mos-50'
                        : 'border-surface-2 hover:border-surface-3 bg-surface-0'
                    }`}
                  >
                    <p className={`font-body text-sm font-semibold mb-1 ${exportType === opt.id ? 'text-mos-700' : 'text-text-primary'}`}>
                      {opt.label}
                    </p>
                    <p className="font-body text-xs text-text-tertiary leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-surface-2 flex-wrap gap-3">
                <div>
                  <p className="font-display font-semibold text-sm text-text-primary">Pré-visualização</p>
                  <p className="font-body text-xs text-text-tertiary mt-0.5">
                    {exportRows.length - 1} {exportRows.length - 1 === 1 ? 'linha' : 'linhas'} ·{' '}
                    {exportType === 'medicoes' ? 'Medições detalhadas' : exportType === 'por-sala' ? 'Resumo por sala' : 'Resumo mensal'}
                  </p>
                </div>
                <button onClick={handleExportCSV} className="btn-primary flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>

              {previewRows.length > 1 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface-1 border-b border-surface-2">
                          {(previewRows[0] || []).map((col, j) => (
                            <th key={j} className="px-4 py-2.5 text-left font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-2">
                        {previewRows.slice(1).map((row, i) => (
                          <tr key={i} className="hover:bg-surface-1 transition-colors">
                            {row.map((cell, j) => (
                              <td key={j} className="px-4 py-2.5 font-data text-xs text-text-secondary whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {exportRows.length > 11 && (
                    <div className="px-4 py-3 bg-surface-1 border-t border-surface-2">
                      <p className="font-body text-xs text-text-tertiary">
                        + {exportRows.length - 11} {exportRows.length - 11 === 1 ? 'linha adicional' : 'linhas adicionais'} no arquivo exportado
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-10 flex flex-col items-center gap-3 text-center">
                  <FileText className="w-10 h-10 text-text-disabled" strokeWidth={1.4} />
                  <p className="font-body text-sm text-text-secondary">
                    Nenhum dado para exportar com os filtros selecionados.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </EnergiaLayout>
  );
}
