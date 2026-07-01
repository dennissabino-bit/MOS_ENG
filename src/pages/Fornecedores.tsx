import { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { NovoFornecedorModal } from '../components/fornecedores/NovoFornecedorModal';
import { FornecedorDetalheModal } from '../components/fornecedores/FornecedorDetalheModal';
import { EditarFornecedorModal } from '../components/fornecedores/EditarFornecedorModal';
import { FornecedorCard } from '../components/fornecedores/FornecedorCard';
import { supabase } from '../lib/supabase';
import type { Fornecedor } from '../lib/database.types';
import { CATEGORIAS_FORNECEDOR, ESTADOS_BR } from '../components/fornecedores/fornecedorConstants';

interface FornecedorStats {
  cotacoesCount: number;
  volumeTotal: number;
}

const PAGE_SIZE_OPTIONS = [9, 18, 27];

// Exportado para reuso no módulo Configurações
export function FornecedoresContent() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [stats, setStats] = useState<Record<string, FornecedorStats>>({});
  const [tab, setTab] = useState<'ativos' | 'arquivados'>('ativos');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [fornRes, propostasRes, itensRes] = await Promise.all([
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('cotacao_propostas').select('fornecedor_id, item_id, preco_unitario'),
      supabase.from('cotacao_itens').select('id, quantidade'),
    ]);

    const fornList = (fornRes.data ?? []) as Fornecedor[];
    setFornecedores(fornList);

    const propostas = (propostasRes.data ?? []) as { fornecedor_id: string; item_id: string; preco_unitario: number | null }[];
    const itens = (itensRes.data ?? []) as { id: string; quantidade: number }[];
    const itensMap = Object.fromEntries(itens.map(i => [i.id, i.quantidade]));

    const statsMap: Record<string, FornecedorStats> = {};
    for (const f of fornList) {
      const fProps = propostas.filter(p => p.fornecedor_id === f.id);
      statsMap[f.id] = {
        cotacoesCount: fProps.length,
        volumeTotal: fProps.reduce((acc, p) => acc + (p.preco_unitario ?? 0) * (itensMap[p.item_id] ?? 1), 0),
      };
    }
    setStats(statsMap);
    setLoading(false);
  }

  const estadosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    fornecedores.forEach(f => { if (f.estado) set.add(f.estado); });
    return [...set].sort();
  }, [fornecedores]);

  const cidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    fornecedores
      .filter(f => !estadoFilter || f.estado === estadoFilter)
      .forEach(f => { if (f.cidade) set.add(f.cidade); });
    return [...set].sort();
  }, [fornecedores, estadoFilter]);

  const filtered = useMemo(() => {
    const base = tab === 'ativos'
      ? fornecedores.filter(f => f.status === 'ativo')
      : fornecedores.filter(f => f.status === 'inativo');
    return base.filter(f => {
      const matchCat = !categoriaFilter || f.categoria === categoriaFilter;
      const matchEstado = !estadoFilter || f.estado === estadoFilter;
      const matchCidade = !cidadeFilter || f.cidade === cidadeFilter;
      return matchCat && matchEstado && matchCidade;
    });
  }, [fornecedores, tab, categoriaFilter, estadoFilter, cidadeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function changeTab(t: 'ativos' | 'arquivados') {
    setTab(t);
    setPage(1);
    setCategoriaFilter('');
    setEstadoFilter('');
    setCidadeFilter('');
  }

  function handleSaved(item: Fornecedor) {
    setFornecedores(prev => [...prev, item].sort((a, b) => a.nome.localeCompare(b.nome)));
    setStats(prev => ({ ...prev, [item.id]: { cotacoesCount: 0, volumeTotal: 0 } }));
  }

  function handleUpdated(item: Fornecedor) {
    setFornecedores(prev =>
      prev.map(f => f.id === item.id ? item : f).sort((a, b) => a.nome.localeCompare(b.nome))
    );
  }

  async function handleToggleStatus(id: string, status: 'ativo' | 'inativo') {
    setFornecedores(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    await supabase.from('fornecedores').update({ status }).eq('id', id);
  }

  return (
    <>
      <div className="p-6 space-y-5">
        {/* Header: tabs + button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1">
            {(['ativos', 'arquivados'] as const).map(t => (
              <button
                key={t}
                onClick={() => changeTab(t)}
                className={`px-4 py-1.5 rounded-lg font-body text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-mos-700 text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t === 'ativos' ? 'Ativos' : 'Arquivados'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </button>
        </div>

        {/* Filters bar */}
        <div className="card px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-text-tertiary tracking-wider uppercase whitespace-nowrap">Categoria:</span>
            <select
              value={categoriaFilter}
              onChange={e => { setCategoriaFilter(e.target.value); setPage(1); }}
              className="font-body text-sm text-text-primary bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todas</option>
              {CATEGORIAS_FORNECEDOR.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-px h-5 bg-surface-2 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-text-tertiary tracking-wider uppercase whitespace-nowrap">Estado:</span>
            <select
              value={estadoFilter}
              onChange={e => { setEstadoFilter(e.target.value); setCidadeFilter(''); setPage(1); }}
              className="font-body text-sm text-text-primary bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todos</option>
              {estadosDisponiveis.map(uf => {
                const found = ESTADOS_BR.find(e => e.sigla === uf);
                return <option key={uf} value={uf}>{found ? `${uf} — ${found.nome}` : uf}</option>;
              })}
            </select>
          </div>
          <div className="w-px h-5 bg-surface-2 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-semibold text-text-tertiary tracking-wider uppercase whitespace-nowrap">Cidade:</span>
            <select
              value={cidadeFilter}
              onChange={e => { setCidadeFilter(e.target.value); setPage(1); }}
              className="font-body text-sm text-text-primary bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todas</option>
              {cidadesDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="card h-48 animate-pulse">
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-surface-2 rounded w-3/4" />
                  <div className="h-3 bg-surface-2 rounded w-1/3" />
                  <div className="h-3 bg-surface-2 rounded w-1/2" />
                  <div className="h-3 bg-surface-2 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-body text-sm text-text-tertiary">Nenhum fornecedor encontrado</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Novo Fornecedor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map(f => (
              <FornecedorCard
                key={f.id}
                fornecedor={f}
                cotacoesCount={stats[f.id]?.cotacoesCount ?? 0}
                volumeTotal={stats[f.id]?.volumeTotal ?? 0}
                onClick={() => setSelectedFornecedor(f)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-text-tertiary">Linhas por página:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="font-body text-sm text-text-primary bg-surface-0 border border-surface-2 rounded px-2 py-1 focus:outline-none"
              >
                {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="font-body text-xs text-text-tertiary">
                Mostrando{' '}
                <strong className="text-text-primary">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}</strong>
                {' '}de{' '}
                <strong className="text-text-primary">{filtered.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md font-body text-sm text-text-secondary border border-surface-2 hover:bg-surface-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full font-data text-sm font-semibold transition-colors ${
                    p === page
                      ? 'bg-mos-700 text-white'
                      : 'text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md font-body text-sm text-text-secondary border border-surface-2 hover:bg-surface-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NovoFornecedorModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
      {selectedFornecedor && (
        <FornecedorDetalheModal
          fornecedor={selectedFornecedor}
          cotacoesCount={stats[selectedFornecedor.id]?.cotacoesCount ?? 0}
          volumeTotal={stats[selectedFornecedor.id]?.volumeTotal ?? 0}
          onClose={() => setSelectedFornecedor(null)}
          onToggleStatus={handleToggleStatus}
          onEdit={() => setEditingFornecedor(selectedFornecedor)}
        />
      )}
      {editingFornecedor && (
        <EditarFornecedorModal
          fornecedor={editingFornecedor}
          onClose={() => setEditingFornecedor(null)}
          onSaved={item => { handleUpdated(item); setEditingFornecedor(null); }}
        />
      )}
    </>
  );
}

export default function Fornecedores() {
  return (
    <AppLayout title="Fornecedores" subtitle="Cadastro de fornecedores e parceiros">
      <FornecedoresContent />
    </AppLayout>
  );
}
