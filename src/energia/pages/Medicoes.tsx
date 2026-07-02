import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Zap, Plus, Search, ChevronDown, ChevronUp, Building2, DoorOpen,
  Pencil, Trash2, Download, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Clock, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovaMedicaoModal } from '../components/NovaMedicaoModal';
import { EnergiaMedicaoDetalheModal } from '../components/EnergiaMedicaoDetalheModal';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { usePendencias } from '../hooks/usePendencias';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatKWh, formatMesAno, getMesAtual, getAnoAtual } from '../utils/calculos';
import type { EnergiaUnidade, EnergiaSala, EnergiaMedicao } from '../types';
import { MEDICAO_STATUS_CONFIG } from '../types';

const PAGE_SIZE = 20;
const MESES_OPTS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Medicoes() {
  const { user, isAdmin } = useEnergiaAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedSala = searchParams.get('sala') || '';

  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [medicoes, setMedicoes] = useState<EnergiaMedicao[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [filterSalaId, setFilterSalaId] = useState('');
  const [filterMes, setFilterMes] = useState<number | 0>(0);
  const [filterAno, setFilterAno] = useState<number>(getAnoAtual());
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalSalaId, setModalSalaId] = useState('');
  const [editingMedicao, setEditingMedicao] = useState<EnergiaMedicao | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [detalheModal, setDetalheModal] = useState<EnergiaMedicao | null>(null);

  const [showPendentes, setShowPendentes] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { pendentes, refetch: refetchPendencias } = usePendencias(user, isAdmin);

  useEffect(() => { fetchData(); }, [isAdmin, user]);

  async function fetchData() {
    setLoading(true);
    let uQuery = supabase.from('energia_unidades').select('*').order('nome');
    let sQuery = supabase.from('energia_salas').select('*').eq('ativo', true).order('nome');
    let mQuery = supabase.from('energia_medicoes').select('*').order('ano', { ascending: false }).order('mes', { ascending: false });

    if (!isAdmin && user?.unidade_id) {
      uQuery = uQuery.eq('id', user.unidade_id);
      sQuery = sQuery.eq('unidade_id', user.unidade_id);
    }

    const [uRes, sRes, mRes] = await Promise.all([uQuery, sQuery, mQuery]);
    const fetchedUnidades = (uRes.data as EnergiaUnidade[]) || [];
    const fetchedSalas = (sRes.data as EnergiaSala[]) || [];
    let fetchedMedicoes = (mRes.data as EnergiaMedicao[]) || [];

    if (!isAdmin && user?.unidade_id) {
      const salaIds = new Set(fetchedSalas.map(s => s.id));
      fetchedMedicoes = fetchedMedicoes.filter(m => salaIds.has(m.sala_id));
    }

    setUnidades(fetchedUnidades);
    setSalas(fetchedSalas);
    setMedicoes(fetchedMedicoes);
    if (!isAdmin && user?.unidade_id) setFilterUnidadeId(user.unidade_id);
    setLoading(false);
  }

  const salasForFilter = useMemo(() => {
    if (!filterUnidadeId) return salas;
    return salas.filter(s => s.unidade_id === filterUnidadeId);
  }, [salas, filterUnidadeId]);

  const salaMap = useMemo(() => new Map(salas.map(s => [s.id, s])), [salas]);
  const unidadeMap = useMemo(() => new Map(unidades.map(u => [u.id, u])), [unidades]);

  const medicoesBySala = useMemo(() => {
    const map = new Map<string, EnergiaMedicao[]>();
    for (const m of medicoes) {
      const arr = map.get(m.sala_id) || [];
      arr.push(m);
      map.set(m.sala_id, arr);
    }
    for (const [k, arr] of map) {
      map.set(k, arr.sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
    }
    return map;
  }, [medicoes]);

  function getPrevMedicao(m: EnergiaMedicao): EnergiaMedicao | null {
    const arr = medicoesBySala.get(m.sala_id);
    if (!arr) return null;
    const idx = arr.findIndex(x => x.id === m.id);
    if (idx <= 0) return null;
    return arr[idx - 1];
  }

  const filtered = useMemo(() => {
    return medicoes.filter(m => {
      if (filterUnidadeId) {
        const sala = salaMap.get(m.sala_id);
        if (!sala || sala.unidade_id !== filterUnidadeId) return false;
      }
      if (filterSalaId && m.sala_id !== filterSalaId) return false;
      if (filterMes && m.mes !== filterMes) return false;
      if (filterAno && m.ano !== filterAno) return false;
      if (search) {
        const sala = salaMap.get(m.sala_id);
        const salaName = sala?.nome?.toLowerCase() || '';
        const unidade = sala ? unidadeMap.get(sala.unidade_id) : null;
        const unidadeName = unidade?.nome?.toLowerCase() || '';
        const q = search.toLowerCase();
        if (!salaName.includes(q) && !unidadeName.includes(q)) return false;
      }
      return true;
    });
  }, [medicoes, filterUnidadeId, filterSalaId, filterMes, filterAno, search, salaMap, unidadeMap]);

  useEffect(() => { setCurrentPage(1); }, [filterUnidadeId, filterSalaId, filterMes, filterAno, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedMedicoes = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pendentesByUnidade = useMemo(() => {
    const map = new Map<string, { unidadeNome: string; salas: typeof pendentes }>();
    for (const sala of pendentes) {
      const group = map.get(sala.unidade_id) || { unidadeNome: sala.unidade_nome, salas: [] };
      group.salas.push(sala);
      map.set(sala.unidade_id, group);
    }
    return Array.from(map.values()).sort((a, b) => a.unidadeNome.localeCompare(b.unidadeNome));
  }, [pendentes]);

  function handleNovaMedicao(salaId = '') {
    setEditingMedicao(null);
    setModalSalaId(salaId || preSelectedSala || filterSalaId || '');
    setShowModal(true);
  }

  function handleEdit(m: EnergiaMedicao) {
    setEditingMedicao(m);
    setModalSalaId(m.sala_id);
    setShowModal(true);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    await supabase.from('energia_medicoes').delete().eq('id', deletingId);
    setDeleting(false);
    setDeletingId(null);
    fetchData();
    refetchPendencias();
  }

  function handleMedicaoSaved() {
    setShowModal(false);
    setEditingMedicao(null);
    fetchData();
    refetchPendencias();
  }

  function handleExportCSV() {
    const headers = ['Competência', 'Sala', 'Unidade', 'Leit. Anterior', 'Leit. Atual', 'Consumo (kWh)', 'Tarifa (R$)', 'Valor Total (R$)', 'Observações'];
    const rows = filtered.map(m => {
      const sala = salaMap.get(m.sala_id);
      const unidade = sala ? unidadeMap.get(sala.unidade_id) : null;
      return [
        formatMesAno(m.mes, m.ano),
        sala?.nome ?? '',
        unidade?.nome ?? '',
        String(m.leitura_anterior),
        String(m.leitura_atual),
        String(m.consumo),
        String(m.tarifa),
        String(m.valor_total),
        m.observacoes ?? '',
      ];
    });
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicoes-${getAnoAtual()}-${String(getMesAtual()).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalConsumo = filtered.reduce((s, m) => s + Number(m.consumo), 0);
  const totalCusto = filtered.reduce((s, m) => s + Number(m.valor_total), 0);
  const mesAtual = getMesAtual();
  const anoAtual = getAnoAtual();
  const totalOcupadas = salas.filter(s => s.ativo).length;
  const medidas = totalOcupadas - pendentes.length;
  const progressPct = totalOcupadas > 0 ? (medidas / totalOcupadas) * 100 : 0;

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  function renderPageButtons() {
    if (totalPages <= 1) return null;
    const pages: (number | '...')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((p, i) =>
      p === '...' ? (
        <span key={`ellipsis-${i}`} className="px-2 font-body text-xs text-text-disabled select-none">...</span>
      ) : (
        <button
          key={p}
          onClick={() => setCurrentPage(p)}
          className={`w-8 h-8 rounded-lg font-body text-xs font-semibold transition-colors ${
            currentPage === p
              ? 'bg-mos-700 text-white'
              : 'text-text-secondary hover:bg-surface-2'
          }`}
        >
          {p}
        </button>
      )
    );
  }

  return (
    <EnergiaLayout
      title="Medições"
      subtitle={
        filtered.length > 0
          ? `Exibindo ${rangeStart}–${rangeEnd} de ${filtered.length} medições · ${formatKWh(totalConsumo)} total`
          : `${filtered.length} medições`
      }
    >
      <div className="p-6 space-y-5">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">OPERACIONAL</p>
            <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">MEDIÇÕES</h1>
            <p className="font-body text-sm text-text-tertiary mt-1">Registro de leituras mensais de energia</p>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 btn-secondary text-sm"
                title={`Exportar todos os ${filtered.length} resultados filtrados`}
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            )}
            <button
              onClick={() => handleNovaMedicao()}
              className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2.5 rounded-lg shadow-card transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Nova Medição
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{filtered.length}</p>
              <p className="font-body text-xs text-text-tertiary">Medições</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{formatKWh(totalConsumo)}</p>
              <p className="font-body text-xs text-text-tertiary">Consumo Total</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{formatCurrencyBR(totalCusto)}</p>
              <p className="font-body text-xs text-text-tertiary">Custo Total</p>
            </div>
          </div>
        </div>

        {/* Pendencias — collapsible, grouped by unidade */}
        {pendentes.length > 0 && (
          <div className="card overflow-hidden border border-status-warning/30">
            <button
              type="button"
              onClick={() => setShowPendentes(v => !v)}
              className="w-full px-5 py-3 bg-status-warningLight flex items-center gap-3 hover:bg-status-warning/10 transition-colors"
            >
              <Clock className="w-4 h-4 text-status-warning flex-shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <p className="font-body text-xs font-semibold text-status-warning tracking-widest">
                  {pendentes.length} SALA{pendentes.length > 1 ? 'S' : ''} SEM MEDIÇÃO — {MESES_OPTS[mesAtual - 1]}/{anoAtual}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 max-w-[140px] h-1 bg-status-warning/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-status-warning rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="font-body text-[10px] text-status-warning/80 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3" />
                    {medidas}/{totalOcupadas} medidas
                  </span>
                </div>
              </div>
              {showPendentes
                ? <ChevronUp className="w-4 h-4 text-status-warning flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-status-warning flex-shrink-0" />
              }
            </button>

            {showPendentes && (
              <div className="max-h-64 overflow-y-auto divide-y divide-surface-2">
                {pendentesByUnidade.map(group => (
                  <div key={group.unidadeNome}>
                    <div className="px-5 py-2 bg-surface-1 flex items-center gap-2 sticky top-0">
                      <Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                      <span className="font-body text-[11px] font-semibold text-text-secondary tracking-wide uppercase truncate">
                        {group.unidadeNome}
                      </span>
                      <span className="ml-auto font-body text-[10px] text-text-disabled whitespace-nowrap">
                        {group.salas.length} pendente{group.salas.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="px-5 py-3 flex flex-wrap gap-2">
                      {group.salas.map(sala => (
                        <button
                          key={sala.id}
                          onClick={() => handleNovaMedicao(sala.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-status-warning/30 bg-status-warningLight hover:bg-status-warning/10 transition-colors group"
                        >
                          <AlertTriangle className="w-3 h-3 text-status-warning flex-shrink-0" />
                          <span className="font-body text-xs font-medium text-text-primary">{sala.nome}</span>
                          <Plus className="w-3 h-3 text-mos-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar sala ou unidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>
          {isAdmin && (
            <div className="relative">
              <select
                value={filterUnidadeId}
                onChange={e => { setFilterUnidadeId(e.target.value); setFilterSalaId(''); }}
                className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
              >
                <option value="">Todas Unidades</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            </div>
          )}
          <div className="relative">
            <select
              value={filterSalaId}
              onChange={e => setFilterSalaId(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
            >
              <option value="">Todas Salas</option>
              {salasForFilter.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          </div>
          {/* Competencia: mes + ano combined */}
          <div className="flex items-center bg-surface-0 border border-surface-3 rounded-lg shadow-card overflow-hidden">
            <select
              value={filterMes}
              onChange={e => setFilterMes(Number(e.target.value))}
              className="appearance-none pl-3 pr-1 py-2 bg-transparent font-body text-sm text-text-primary focus:outline-none cursor-pointer"
            >
              <option value={0}>Todos meses</option>
              {MESES_OPTS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <span className="text-text-disabled font-body text-sm select-none px-0.5">/</span>
            <select
              value={filterAno}
              onChange={e => setFilterAno(Number(e.target.value))}
              className="appearance-none pl-1 pr-7 py-2 bg-transparent font-body text-sm text-text-primary focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary -ml-5 mr-2 pointer-events-none flex-shrink-0" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Zap className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary">Nenhuma medição encontrada</p>
            <button onClick={() => handleNovaMedicao()} className="btn-primary mt-4 text-sm">
              Registrar Primeira Medição
            </button>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-2 bg-surface-1">
                      <th className="text-left py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">COMPETÊNCIA</th>
                      <th className="text-left py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">SALA</th>
                      <th className="text-left py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden md:table-cell">UNIDADE</th>
                      <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden lg:table-cell">LEIT. ANT.</th>
                      <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden lg:table-cell">LEIT. ATUAL</th>
                      <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">CONSUMO</th>
                      <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden sm:table-cell">VAR. MÊS</th>
                      <th className="text-right py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">VALOR</th>
                      <th className="text-center py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden sm:table-cell">STATUS</th>
                      <th className="text-center py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest hidden sm:table-cell">FOTO</th>
                      <th className="text-center py-3 px-4 font-body text-xs font-bold text-text-secondary tracking-widest">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-2">
                    {pagedMedicoes.map(m => {
                      const sala = salaMap.get(m.sala_id);
                      const unidade = sala ? unidadeMap.get(sala.unidade_id) : null;
                      const prev = getPrevMedicao(m);
                      const consumoAtual = Number(m.consumo);
                      const consumoPrev = prev ? Number(prev.consumo) : null;
                      const varPct = (consumoPrev != null && consumoPrev > 0)
                        ? ((consumoAtual - consumoPrev) / consumoPrev) * 100
                        : null;
                      const isZeroConsumption = consumoAtual === 0;

                      return (
                        <tr
                          key={m.id}
                          onClick={() => setDetalheModal(m)}
                          className={`hover:bg-surface-1 transition-colors cursor-pointer ${isZeroConsumption ? 'bg-status-warningLight/40' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-data text-sm text-text-primary font-medium">{formatMesAno(m.mes, m.ano)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <DoorOpen className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                              <span
                                className="font-body text-sm text-text-primary hover:text-mos-700 cursor-pointer transition-colors"
                                onClick={() => navigate(`/energia/salas/${m.sala_id}`)}
                              >
                                {sala?.nome || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                              <span className="font-body text-sm text-text-tertiary">{unidade?.nome || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right hidden lg:table-cell">
                            <span className="font-data text-sm text-text-tertiary">{Number(m.leitura_anterior).toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="py-3 px-4 text-right hidden lg:table-cell">
                            <span className="font-data text-sm text-text-primary font-medium">{Number(m.leitura_atual).toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isZeroConsumption && (
                                <AlertTriangle className="w-3.5 h-3.5 text-status-warning flex-shrink-0" />
                              )}
                              <span className={`font-data text-sm font-semibold ${isZeroConsumption ? 'text-status-warning' : 'text-mos-700'}`}>
                                {formatKWh(consumoAtual)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right hidden sm:table-cell">
                            {varPct === null ? (
                              <span className="font-body text-xs text-text-disabled">—</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                {varPct > 5 ? (
                                  <TrendingUp className="w-3 h-3 text-status-error flex-shrink-0" />
                                ) : varPct < -5 ? (
                                  <TrendingDown className="w-3 h-3 text-status-success flex-shrink-0" />
                                ) : (
                                  <Minus className="w-3 h-3 text-text-tertiary flex-shrink-0" />
                                )}
                                <span className={`font-data text-xs font-semibold ${
                                  varPct > 20 ? 'text-status-error' :
                                  varPct > 5 ? 'text-status-warning' :
                                  varPct < -5 ? 'text-status-success' :
                                  'text-text-tertiary'
                                }`}>
                                  {varPct > 0 ? '+' : ''}{varPct.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-data text-sm text-text-primary">{formatCurrencyBR(Number(m.valor_total))}</span>
                          </td>
                          <td className="py-3 px-4 text-center hidden sm:table-cell">
                            {(() => {
                              const cfg = MEDICAO_STATUS_CONFIG[m.status ?? 'a_medir'];
                              return (
                                <span className={`inline-flex items-center gap-1 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} whitespace-nowrap`}>
                                  {cfg.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-center hidden sm:table-cell">
                            {m.foto_url ? (
                              <button onClick={e => { e.stopPropagation(); setFotoModal(m.foto_url); }} title="Ver foto" className="inline-block">
                                <img
                                  src={m.foto_url}
                                  alt="Foto medidor"
                                  className="w-9 h-9 object-cover rounded-md border border-surface-3 hover:opacity-80 transition-opacity cursor-pointer mx-auto"
                                />
                              </button>
                            ) : (
                              <span className="font-body text-xs text-text-disabled">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleEdit(m)}
                                className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors group"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5 text-text-tertiary group-hover:text-mos-700 transition-colors" />
                              </button>
                              <button
                                onClick={() => setDeletingId(m.id)}
                                className="p-1.5 rounded-lg hover:bg-status-errorLight transition-colors group"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-text-tertiary group-hover:text-status-error transition-colors" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-body text-xs text-text-tertiary">
                  Exibindo {rangeStart}–{rangeEnd} de {filtered.length} medições
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-text-secondary" />
                  </button>
                  {renderPageButtons()}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <NovaMedicaoModal
          unidades={unidades}
          salas={salas}
          isAdmin={isAdmin}
          userUnidadeId={user?.unidade_id || ''}
          preSelectedSalaId={modalSalaId}
          editingMedicao={editingMedicao}
          onClose={() => { setShowModal(false); setEditingMedicao(null); }}
          onSaved={handleMedicaoSaved}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-text-primary">Excluir medição</h3>
            <p className="font-body text-sm text-text-secondary">Tem certeza que deseja excluir esta medição? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-status-error text-white font-body font-semibold text-sm rounded-lg hover:bg-status-error/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {fotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setFotoModal(null)}
        >
          <img
            src={fotoModal}
            alt="Foto do medidor"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setFotoModal(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white text-xl font-bold transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {detalheModal && (
        <EnergiaMedicaoDetalheModal
          medicao={detalheModal}
          sala={salaMap.get(detalheModal.sala_id)}
          unidade={salaMap.get(detalheModal.sala_id) ? unidadeMap.get(salaMap.get(detalheModal.sala_id)!.unidade_id) : undefined}
          onClose={() => setDetalheModal(null)}
          onStatusChanged={updated => {
            setMedicoes(prev => prev.map(m => m.id === updated.id ? updated : m));
            setDetalheModal(null);
          }}
        />
      )}
    </EnergiaLayout>
  );
}
