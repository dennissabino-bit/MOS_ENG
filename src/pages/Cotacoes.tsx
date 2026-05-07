import { useState, useEffect } from 'react';
import { Search, Plus, FileText, Calendar } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { CotacaoBadge } from '../components/ui/Badge';
import { NovaCotacaoModal } from '../components/cotacoes/NovaCotacaoModal';
import { CotacaoDetalheModal } from '../components/cotacoes/CotacaoDetalheModal';
import { formatCurrencyFull } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import type { Cotacao, CotacaoStatus } from '../lib/database.types';

const STATUS_TABS: { key: CotacaoStatus | 'todas'; label: string }[] = [
  { key: 'todas',    label: 'Todas'     },
  { key: 'aberta',   label: 'Abertas'   },
  { key: 'aprovada', label: 'Aprovadas' },
  { key: 'fechada',  label: 'Fechadas'  },
];

export default function Cotacoes() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [activeTab, setActiveTab] = useState<CotacaoStatus | 'todas'>('todas');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCotacoes();
  }, []);

  async function fetchCotacoes() {
    setLoading(true);
    const { data } = await supabase
      .from('cotacoes')
      .select('*, obras(nome, codigo), fornecedores(nome)')
      .order('created_at', { ascending: false });
    if (data) setCotacoes(data as Cotacao[]);
    setLoading(false);
  }

  const abertas   = cotacoes.filter(c => c.status === 'aberta').length;
  const aprovadas = cotacoes.filter(c => c.status === 'aprovada').length;
  const totalValor = cotacoes.filter(c => c.status === 'aberta').reduce((s, c) => s + c.valor, 0);

  const filtered = cotacoes.filter(c => {
    const matchTab    = activeTab === 'todas' || c.status === activeTab;
    const matchSearch = !search
      || c.descricao.toLowerCase().includes(search.toLowerCase())
      || (c.obras?.nome || '').toLowerCase().includes(search.toLowerCase())
      || (c.fornecedores?.nome || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  function handleSaved(item: Cotacao) {
    setCotacoes(prev => [item, ...prev]);
  }

  async function handleStatusChange(id: string, status: CotacaoStatus) {
    setCotacoes(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    await supabase.from('cotacoes').update({ status }).eq('id', id);
  }

  return (
    <AppLayout title="Cotações" subtitle="Gestão de cotações de suprimentos">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-status-info">{abertas}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Cotações Abertas</p>
          </div>
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-status-success">{aprovadas}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Aprovadas</p>
          </div>
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-text-primary">{formatCurrencyFull(totalValor)}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Valor em Aberto</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar cotação..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>
          <div className="flex gap-1.5">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-text-primary text-white'
                    : 'bg-surface-0 border border-surface-3 text-text-secondary hover:bg-surface-2'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="ml-auto btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Cotação
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-surface-2 rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-2 rounded w-1/2 mb-4" />
                <div className="h-16 bg-surface-1 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(cotacao => (
              <div key={cotacao.id} className="card p-5 hover:shadow-card-hover transition-shadow duration-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-text-tertiary" />
                    </div>
                    <div>
                      <p className="font-body font-semibold text-sm text-text-primary leading-snug">{cotacao.descricao}</p>
                      <p className="font-body text-xs text-text-tertiary">{cotacao.fornecedores?.nome ?? '—'}</p>
                    </div>
                  </div>
                  <CotacaoBadge status={cotacao.status} />
                </div>

                <div className="bg-surface-1 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-wider mb-0.5">OBRA</p>
                      <p className="font-body text-xs text-text-primary">{cotacao.obras?.nome ?? '—'}</p>
                      {cotacao.obras?.codigo && (
                        <p className="font-data text-[10px] text-mos-700">{cotacao.obras.codigo}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-wider mb-0.5">VALOR</p>
                      <p className="font-data font-bold text-sm text-text-primary">{formatCurrencyFull(cotacao.valor)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-text-tertiary" />
                    <span className="font-data text-xs text-text-tertiary">{cotacao.data_abertura}</span>
                  </div>
                  <button
                    onClick={() => setSelectedCotacao(cotacao)}
                    className="font-body text-xs font-medium text-text-secondary hover:text-mos-700 transition-colors"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary">Nenhuma cotação encontrada</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Nova Cotação
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <NovaCotacaoModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {selectedCotacao && (
        <CotacaoDetalheModal
          cotacao={selectedCotacao}
          onClose={() => setSelectedCotacao(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </AppLayout>
  );
}
