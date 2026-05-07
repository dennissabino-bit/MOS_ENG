import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Building } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { NovoFornecedorModal } from '../components/fornecedores/NovoFornecedorModal';
import { FornecedorDetalheModal } from '../components/fornecedores/FornecedorDetalheModal';
import { supabase } from '../lib/supabase';

interface Fornecedor {
  id: string;
  nome: string;
  categoria: string;
  status: string;
  contato: string;
  email: string;
  cnpj: string;
  telefone: string;
  created_at: string;
}

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFornecedores();
  }, []);

  async function fetchFornecedores() {
    setLoading(true);
    const { data } = await supabase
      .from('fornecedores')
      .select('*')
      .order('nome');
    if (data) setFornecedores(data as Fornecedor[]);
    setLoading(false);
  }

  const ativos   = fornecedores.filter(f => f.status === 'ativo').length;
  const inativos = fornecedores.filter(f => f.status === 'inativo').length;

  const filtered = fornecedores.filter(f => {
    const matchSearch = !search
      || f.nome.toLowerCase().includes(search.toLowerCase())
      || f.categoria.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleSaved(item: Fornecedor) {
    setFornecedores(prev => [...prev, item].sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  async function handleToggleStatus(id: string, status: 'ativo' | 'inativo') {
    setFornecedores(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    await supabase.from('fornecedores').update({ status }).eq('id', id);
  }

  return (
    <AppLayout title="Fornecedores" subtitle="Cadastro de fornecedores ativos e inativos">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-text-primary">{fornecedores.length}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Total de Fornecedores</p>
          </div>
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-status-success">{ativos}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Fornecedores Ativos</p>
          </div>
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-text-tertiary">{inativos}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Inativos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>
          <div className="flex gap-1.5">
            {(['todos', 'ativo', 'inativo'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-text-primary text-white'
                    : 'bg-surface-0 border border-surface-3 text-text-secondary hover:bg-surface-2'
                }`}
              >
                {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="ml-auto btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-2">
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider">FORNECEDOR</th>
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider">CATEGORIA</th>
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider hidden md:table-cell">CONTATO</th>
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider hidden lg:table-cell">CNPJ</th>
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider">STATUS</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-surface-2">
                      <td className="px-5 py-3.5" colSpan={6}>
                        <div className="h-4 bg-surface-2 rounded animate-pulse w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : (
                  filtered.map(f => (
                    <tr key={f.id} className="border-b border-surface-2 last:border-0 hover:bg-surface-1 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                            <Building className="w-4 h-4 text-text-tertiary" />
                          </div>
                          <div>
                            <p className="font-body font-semibold text-sm text-text-primary">{f.nome}</p>
                            <p className="font-data text-xs text-text-tertiary">{f.telefone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-body text-sm text-text-secondary">{f.categoria}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div>
                          <p className="font-body text-sm text-text-primary">{f.contato}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-text-tertiary" />
                            <p className="font-data text-xs text-text-tertiary">{f.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="font-data text-sm text-text-secondary">{f.cnpj}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-xs text-xs font-body font-semibold ${
                          f.status === 'ativo'
                            ? 'bg-status-successLight text-status-success'
                            : 'bg-surface-2 text-text-tertiary'
                        }`}>
                          {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedFornecedor(f)}
                          className="font-body text-xs font-medium text-text-secondary hover:text-mos-700 transition-colors"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <Building className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="font-body text-sm text-text-tertiary">Nenhum fornecedor encontrado</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Novo Fornecedor
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NovoFornecedorModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {selectedFornecedor && (
        <FornecedorDetalheModal
          fornecedor={selectedFornecedor as any}
          onClose={() => setSelectedFornecedor(null)}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </AppLayout>
  );
}
