import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Search, Building2, ChevronRight, Plus, Tag, Archive, ArchiveRestore, X, ChevronDown, SplitSquareVertical } from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovaSalaModal } from '../components/NovaSalaModal';
import { TiposSalaModal } from '../components/TiposSalaModal';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { useTiposSala } from '../hooks/useTiposSala';
import { supabase } from '../../lib/supabase';
import { formatCurrencyFull } from '../../lib/formatters';
import type { EnergiaSala, EnergiaUnidade } from '../types';

export default function Salas() {
  const navigate = useNavigate();
  const { user, isAdmin } = useEnergiaAuth();
  const { tipos, getLabel, refetch: refetchTipos } = useTiposSala();
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [lastMedicao, setLastMedicao] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todas' | 'ocupadas' | 'desocupadas'>('todas');
  const [filterMedicao, setFilterMedicao] = useState<'todas' | 'medido' | 'relogio_proprio'>('todas');
  const [showModal, setShowModal] = useState(false);
  const [showTiposModal, setShowTiposModal] = useState(false);
  const [unidadeIdParaSala, setUnidadeIdParaSala] = useState('');
  const [showArquivadasDrawer, setShowArquivadasDrawer] = useState(false);
  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [filterCidade, setFilterCidade] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let sQuery = supabase.from('energia_salas').select('*').order('nome');
      if (!isAdmin && user?.unidade_id) sQuery = sQuery.eq('unidade_id', user.unidade_id);
      const [sRes, uRes, mRes] = await Promise.all([
        sQuery,
        supabase.from('energia_unidades').select('*'),
        supabase.from('energia_medicoes').select('sala_id, valor_total, ano, mes').order('ano', { ascending: false }).order('mes', { ascending: false }),
      ]);
      setSalas((sRes.data as EnergiaSala[]) || []);
      setUnidades((uRes.data as EnergiaUnidade[]) || []);
      const map = new Map<string, number>();
      for (const m of (mRes.data || []) as { sala_id: string; valor_total: number; ano: number; mes: number }[]) {
        if (!map.has(m.sala_id)) map.set(m.sala_id, m.valor_total);
      }
      setLastMedicao(map);
      setLoading(false);
    })();
  }, [isAdmin, user]);

  const unidadeMap = new Map(unidades.map(u => [u.id, u]));
  const unidadeNomeMap = new Map(unidades.map(u => [u.id, u.nome]));

  const cidadesDisponiveis = useMemo(() => {
    const set = new Set(unidades.map(u => u.cidade).filter(Boolean));
    return Array.from(set).sort();
  }, [unidades]);

  const estadosDisponiveis = useMemo(() => {
    const set = new Set(unidades.map(u => u.estado).filter(Boolean));
    return Array.from(set).sort();
  }, [unidades]);

  const ativas = salas.filter(s => !s.arquivada);
  const arquivadas = salas.filter(s => s.arquivada);

  const filtered = ativas.filter(s => {
    const unidade = unidadeMap.get(s.unidade_id);
    const matchSearch = !search || s.nome.toLowerCase().includes(search.toLowerCase()) || (unidade?.nome || '').toLowerCase().includes(search.toLowerCase());
    const matchAtivo = filterAtivo === 'todas' || (filterAtivo === 'ocupadas' ? s.ativo : !s.ativo);
    const matchUnidade = !filterUnidadeId || s.unidade_id === filterUnidadeId;
    const matchCidade = !filterCidade || unidade?.cidade === filterCidade;
    const matchEstado = !filterEstado || unidade?.estado === filterEstado;
    const matchMedicao = filterMedicao === 'todas' || (s.medicao_tipo ?? 'medido') === filterMedicao;
    return matchSearch && matchAtivo && matchUnidade && matchCidade && matchEstado && matchMedicao;
  });

  const ocupadas = ativas.filter(s => s.ativo).length;

  async function refetch() {
    let sQuery = supabase.from('energia_salas').select('*').order('nome');
    if (!isAdmin && user?.unidade_id) sQuery = sQuery.eq('unidade_id', user.unidade_id);
    const [{ data }, mRes] = await Promise.all([
      sQuery,
      supabase.from('energia_medicoes').select('sala_id, valor_total, ano, mes').order('ano', { ascending: false }).order('mes', { ascending: false }),
    ]);
    setSalas((data as EnergiaSala[]) || []);
    const map = new Map<string, number>();
    for (const m of (mRes.data || []) as { sala_id: string; valor_total: number; ano: number; mes: number }[]) {
      if (!map.has(m.sala_id)) map.set(m.sala_id, m.valor_total);
    }
    setLastMedicao(map);
  }

  async function handleToggleAtivo(sala: EnergiaSala) {
    await supabase.from('energia_salas').update({ ativo: !sala.ativo }).eq('id', sala.id);
    setSalas(prev => prev.map(s => s.id === sala.id ? { ...s, ativo: !s.ativo } : s));
  }

  async function handleRestaurar(sala: EnergiaSala) {
    await supabase.from('energia_salas').update({ arquivada: false }).eq('id', sala.id);
    setSalas(prev => prev.map(s => s.id === sala.id ? { ...s, arquivada: false } : s));
  }

  function handleNovaSala() {
    const defaultUnidade = !isAdmin && user?.unidade_id ? user.unidade_id : (unidades[0]?.id ?? '');
    setUnidadeIdParaSala(defaultUnidade);
    setShowModal(true);
  }

  return (
    <EnergiaLayout title="Salas" subtitle={`${ocupadas} salas ocupadas · ${isAdmin ? 'todas as unidades' : 'sua unidade'}`}>
      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">ESTRUTURA</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">SALAS</h1>
              <p className="font-body text-sm text-text-tertiary mt-1">
                {ocupadas} ocupadas · {ativas.filter(s => !s.ativo).length} desocupadas
                {!isAdmin && ' · sua unidade'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {arquivadas.length > 0 && (
                <button
                  onClick={() => setShowArquivadasDrawer(true)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors shadow-card"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Arquivadas
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-text-primary text-white font-data text-[10px] font-bold leading-none">
                    {arquivadas.length}
                  </span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowTiposModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors shadow-card"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Tipos de Sala
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar sala ou unidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>

          {isAdmin && (
            <>
              {/* Unidade filter */}
              <div className="relative">
                <select
                  value={filterUnidadeId}
                  onChange={e => { setFilterUnidadeId(e.target.value); setFilterCidade(''); setFilterEstado(''); }}
                  className="appearance-none pl-3 pr-8 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
                >
                  <option value="">Todas Unidades</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>

              {/* Cidade filter */}
              {cidadesDisponiveis.length > 0 && (
                <div className="relative">
                  <select
                    value={filterCidade}
                    onChange={e => { setFilterCidade(e.target.value); setFilterUnidadeId(''); }}
                    className="appearance-none pl-3 pr-8 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
                  >
                    <option value="">Todas Cidades</option>
                    {cidadesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                </div>
              )}

              {/* Estado filter */}
              {estadosDisponiveis.length > 0 && (
                <div className="relative">
                  <select
                    value={filterEstado}
                    onChange={e => { setFilterEstado(e.target.value); setFilterUnidadeId(''); }}
                    className="appearance-none pl-3 pr-8 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
                  >
                    <option value="">Todos Estados</option>
                    {estadosDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-1.5">
            {(['todas', 'ocupadas', 'desocupadas'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterAtivo(f)}
                className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 capitalize ${
                  filterAtivo === f
                    ? 'bg-text-primary text-white'
                    : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
                }`}
              >
                {f === 'todas' ? 'Todas' : f === 'ocupadas' ? 'Ocupadas' : 'Desocupadas'}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-surface-3 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            {([
              { value: 'todas', label: 'Medição' },
              { value: 'medido', label: 'Interna' },
              { value: 'relogio_proprio', label: 'Rel. Próprio' },
            ] as const).map(f => (
              <button
                key={f.value}
                onClick={() => setFilterMedicao(f.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                  filterMedicao === f.value
                    ? 'bg-mos-700 text-white'
                    : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
                }`}
              >
                {f.value === 'relogio_proprio' && <SplitSquareVertical className="w-3 h-3" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <DoorOpen className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary">
              {ativas.length === 0 ? 'Nenhuma sala cadastrada' : 'Nenhuma sala encontrada'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-surface-2">
            {filtered.map(sala => (
              <div
                key={sala.id}
                onClick={() => navigate(`/imoveis/salas/${sala.id}`)}
                className="flex items-center justify-between px-5 py-4 hover:bg-surface-1 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                    <DoorOpen className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-body font-medium text-sm text-text-primary truncate">{sala.nome}</p>
                      {(sala.medicao_tipo ?? 'medido') === 'relogio_proprio' && (
                        <span className="hidden sm:inline-flex items-center gap-1 flex-shrink-0 font-body text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                          <SplitSquareVertical className="w-2.5 h-2.5" />
                          REL. PRÓPRIO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs text-text-tertiary">{getLabel(sala.tipo_sala)}</span>
                      <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                        <Building2 className="w-3 h-3" />{unidadeNomeMap.get(sala.unidade_id) || '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="hidden sm:flex flex-col items-end min-w-[80px]">
                    <span className="font-body text-xs font-bold text-text-secondary tracking-wider">ALUGUEL</span>
                    <span className="font-data text-sm font-medium text-text-primary">
                      {sala.valor_aluguel != null ? formatCurrencyFull(sala.valor_aluguel) : '—'}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col items-end min-w-[80px]">
                    <span className="font-body text-xs font-bold text-text-secondary tracking-wider">ENERGIA</span>
                    <span className="font-data text-sm font-medium text-text-primary">
                      {lastMedicao.has(sala.id) ? formatCurrencyFull(lastMedicao.get(sala.id)!) : '—'}
                    </span>
                  </div>
                  <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded-xs tracking-wider ${
                    sala.ativo ? 'badge-saudavel' : 'text-text-tertiary bg-surface-2'
                  }`}>
                    {sala.ativo ? 'OCUPADA' : 'DESOCUPADA'}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleToggleAtivo(sala); }}
                    title={sala.ativo ? 'Marcar como desocupada' : 'Marcar como ocupada'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      sala.ativo
                        ? 'text-text-tertiary hover:bg-status-warningLight hover:text-status-warning'
                        : 'text-text-tertiary hover:bg-status-successLight hover:text-status-success'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-5 bg-surface-3" />
                  <ChevronRight className="w-4 h-4 text-text-disabled group-hover:text-text-secondary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleNovaSala}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-3 rounded-xl shadow-modal transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93] z-30"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Nova Sala
      </button>

      {/* Arquivadas drawer */}
      {showArquivadasDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowArquivadasDrawer(false)} />
          <div className="relative bg-surface-0 w-full sm:w-[440px] sm:h-full flex flex-col shadow-modal rounded-t-2xl sm:rounded-none sm:rounded-l-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-2 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
                  <Archive className="w-4 h-4 text-text-secondary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-text-primary">Salas Arquivadas</h3>
                  <p className="font-body text-xs text-text-tertiary">{arquivadas.length} sala{arquivadas.length !== 1 ? 's' : ''} arquivada{arquivadas.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setShowArquivadasDrawer(false)} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-2">
              {arquivadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                  <Archive className="w-10 h-10 text-text-disabled" />
                  <p className="font-body text-sm text-text-tertiary">Nenhuma sala arquivada</p>
                </div>
              ) : (
                arquivadas.map(sala => (
                  <div key={sala.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-1 transition-colors group">
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => { setShowArquivadasDrawer(false); navigate(`/energia/salas/${sala.id}`); }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                        <DoorOpen className="w-4 h-4 text-text-disabled" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-body font-medium text-sm text-text-secondary truncate">{sala.nome}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-body text-xs text-text-tertiary">{getLabel(sala.tipo_sala)}</span>
                          <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                            <Building2 className="w-3 h-3" />{unidadeNomeMap.get(sala.unidade_id) || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestaurar(sala)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm font-semibold text-text-secondary bg-surface-1 hover:bg-surface-2 border border-surface-3 transition-colors flex-shrink-0 ml-3"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && unidadeIdParaSala && (
        <NovaSalaModal
          unidadeId={unidadeIdParaSala}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); refetch(); }}
        />
      )}
      {showModal && !unidadeIdParaSala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative card p-6 max-w-sm w-full text-center">
            <DoorOpen className="w-8 h-8 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-secondary mb-4">Cadastre uma unidade antes de adicionar salas.</p>
            <button onClick={() => setShowModal(false)} className="btn-primary">Fechar</button>
          </div>
        </div>
      )}
      {showTiposModal && (
        <TiposSalaModal
          tipos={tipos}
          onClose={() => setShowTiposModal(false)}
          onSaved={() => { refetchTipos(); }}
        />
      )}
    </EnergiaLayout>
  );
}
