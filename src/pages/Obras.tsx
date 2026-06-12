import { useState } from 'react';
import { Search, SlidersHorizontal, Plus, Building2, AlertTriangle, ChevronLeft, ChevronRight, Archive, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ObraCard } from '../components/obras/ObraCard';
import { NovoProjetoModal } from '../components/obras/NovoProjetoModal';
import { useObras } from '../hooks/useObras';
import { formatCurrency } from '../lib/formatters';
import type { ObraStatus, Obra } from '../lib/database.types';

type TabKey = ObraStatus | 'todas' | 'arquivadas';

const STATUS_TABS: { key: TabKey; label: string }[] = [
  { key: 'todas',        label: 'Todas' },
  { key: 'em_andamento', label: 'Em Andamento' },
  { key: 'planejamento', label: 'Planejamento' },
  { key: 'concluida',    label: 'Concluída' },
  { key: 'pausada',      label: 'Pausada' },
  { key: 'arquivadas',   label: 'Arquivadas' },
];

const ITEMS_PER_PAGE = 6;

export default function Obras() {
  const navigate = useNavigate();
  const { obras, loading, updateObraImagem, addObra, arquivarObra, desarquivarObra } = useObras();
  const [activeTab, setActiveTab] = useState<TabKey>('todas');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNovoModal, setShowNovoModal] = useState(false);

  const emAndamento = obras.filter(o => o.status === 'em_andamento' && !o.arquivada).length;
  const concluida   = obras.filter(o => o.status === 'concluida' && !o.arquivada).length;
  const pausada     = obras.filter(o => o.status === 'pausada' && !o.arquivada).length;
  const totalExecucao = obras.filter(o => o.status === 'em_andamento' && !o.arquivada).reduce((s, o) => s + o.orcado, 0);
  const obrasAtivas   = obras.filter(o => (o.status === 'em_andamento' || o.status === 'planejamento') && !o.arquivada).length;
  const alertas = obras.filter(o => o.realizado > o.orcado && !o.arquivada).length;
  const archivedCount = obras.filter(o => o.arquivada).length;

  const filtered = obras.filter(obra => {
    const matchSearch = !search || obra.nome.toLowerCase().includes(search.toLowerCase()) || obra.codigo.toLowerCase().includes(search.toLowerCase());

    if (activeTab === 'arquivadas') return obra.arquivada && matchSearch;
    if (obra.arquivada) return false;

    const matchTab = activeTab === 'todas' || obra.status === activeTab;
    return matchTab && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  function handleThumbnailSaved(obraId: string, newUrl: string) {
    updateObraImagem(obraId, newUrl);
  }

  function handleNovaObra(obra: Obra) {
    addObra(obra);
    setActiveTab('todas');
    setPage(1);
  }

  async function handleArchive(obraId: string) {
    await arquivarObra(obraId);
    setPage(1);
  }

  async function handleUnarchive(obraId: string) {
    await desarquivarObra(obraId);
    setPage(1);
  }

  return (
    <AppLayout title="Obras" subtitle="Empreendimentos ativos e arquivados">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-mos-700 animate-spin" />
        </div>
      ) : null}
      <div className={`p-6 space-y-6 ${loading ? 'hidden' : ''}`}>
        <div>
          <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">EMPREENDIMENTOS</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">OBRAS ATIVAS</h1>
              <p className="font-body text-sm text-text-tertiary mt-1">
                {emAndamento} obras em execução · {concluida} concluída · {pausada} pausada
                {archivedCount > 0 && ` · ${archivedCount} arquivada${archivedCount > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{formatCurrency(totalExecucao > 0 ? totalExecucao : 17600000)}</p>
              <p className="font-body text-xs text-text-tertiary">Total em Execução</p>
            </div>
            <span className="ml-auto font-body text-xs text-text-tertiary">{emAndamento} obras ativas</span>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{obrasAtivas}</p>
              <p className="font-body text-xs text-text-tertiary">Obras Ativas</p>
            </div>
            <span className="ml-auto font-body text-xs text-text-tertiary">2 em planejamento</span>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-warningLight flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{alertas || 1}</p>
              <p className="font-body text-xs text-text-tertiary">Alertas Suprimentos</p>
            </div>
            <span className="ml-auto font-body text-xs text-text-tertiary">1 crítico · 0 atenção</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar obra, código..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.key
                    ? tab.key === 'arquivadas'
                      ? 'bg-status-warning text-white'
                      : 'bg-text-primary text-white'
                    : tab.key === 'arquivadas'
                      ? 'bg-surface-0 text-status-warning border border-status-warning/30 hover:bg-status-warningLight'
                      : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
                }`}
              >
                {tab.key === 'arquivadas' && <Archive className="w-3 h-3" />}
                {tab.label}
                {tab.key === 'arquivadas' && archivedCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'arquivadas' ? 'bg-white/25 text-white' : 'bg-status-warningLight text-status-warning'
                  }`}>
                    {archivedCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors shadow-card">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
          </button>
        </div>

        {activeTab === 'arquivadas' && (
          <div className="flex items-center gap-3 bg-status-warningLight border border-status-warning/20 rounded-xl px-4 py-3">
            <Archive className="w-4 h-4 text-status-warning shrink-0" />
            <p className="font-body text-sm text-status-warning">
              {archivedCount > 0
                ? `${archivedCount} obra${archivedCount > 1 ? 's' : ''} arquivada${archivedCount > 1 ? 's' : ''}. Obras arquivadas não aparecem na listagem principal e podem ser desarquivadas a qualquer momento.`
                : 'Nenhuma obra arquivada ainda.'
              }
            </p>
          </div>
        )}

        {paginated.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginated.map(obra => (
                <div key={obra.id} className="flex flex-col gap-2">
                  <ObraCard
                    obra={obra}
                    onVerDetalhes={(id) => navigate(`/obras/${id}`)}
                    onThumbnailSaved={handleThumbnailSaved}
                    onArchive={!obra.arquivada ? handleArchive : undefined}
                  />
                  {obra.arquivada && (
                    <button
                      onClick={() => handleUnarchive(obra.id)}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-status-warning/40 bg-status-warningLight font-body text-xs font-semibold text-status-warning hover:bg-status-warning hover:text-white transition-colors"
                    >
                      <Archive className="w-3 h-3" />
                      Desarquivar esta Obra
                    </button>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-20">
            {activeTab === 'arquivadas' ? (
              <>
                <Archive className="w-10 h-10 text-text-disabled mx-auto mb-3" />
                <p className="font-body text-sm text-text-tertiary">Nenhuma obra arquivada</p>
              </>
            ) : (
              <>
                <Building2 className="w-10 h-10 text-text-disabled mx-auto mb-3" />
                <p className="font-body text-sm text-text-tertiary">Nenhuma obra encontrada</p>
              </>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-surface-3 bg-surface-0 disabled:opacity-40 hover:bg-surface-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-text-secondary" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-lg font-data text-sm font-medium transition-colors ${
                  page === n
                    ? 'bg-text-primary text-white'
                    : 'border border-surface-3 bg-surface-0 text-text-secondary hover:bg-surface-2'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-surface-3 bg-surface-0 disabled:opacity-40 hover:bg-surface-2 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowNovoModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-3 rounded-xl shadow-modal transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93] z-30"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Novo Projeto
      </button>

      {showNovoModal && (
        <NovoProjetoModal
          onClose={() => setShowNovoModal(false)}
          onSaved={handleNovaObra}
        />
      )}
    </AppLayout>
  );
}
