import { useState, useEffect } from 'react';
import { Search, Plus, FileText, ArrowRight, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { NovaCotacaoModal } from '../components/cotacoes/NovaCotacaoModal';
import { supabase } from '../lib/supabase';
import type { CotacaoGrupo, CotacaoGrupoStatus } from '../lib/database.types';

type Filter = CotacaoGrupoStatus | 'todas';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todas',   label: 'Todas'    },
  { key: 'aberta',  label: 'Abertas'  },
  { key: 'fechada', label: 'Fechadas' },
];

export default function Cotacoes() {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<CotacaoGrupo[]>([]);
  const [filter, setFilter] = useState<Filter>('todas');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrupos();
  }, []);

  async function fetchGrupos() {
    setLoading(true);
    const { data } = await supabase
      .from('cotacao_grupos')
      .select('*, obras(nome, codigo)')
      .order('created_at', { ascending: false });
    if (data) setGrupos(data as CotacaoGrupo[]);
    setLoading(false);
  }

  const total    = grupos.length;
  const abertas  = grupos.filter(g => g.status === 'aberta').length;
  const fechadas = grupos.filter(g => g.status === 'fechada').length;

  const filtered = grupos.filter(g => {
    const matchFilter = filter === 'todas' || g.status === filter;
    const matchSearch = !search
      || g.titulo.toLowerCase().includes(search.toLowerCase())
      || (g.obras?.nome ?? '').toLowerCase().includes(search.toLowerCase())
      || (g.categoria ?? '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AppLayout title="Cotações" subtitle="Comparativo de preços entre fornecedores">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-text-primary">{total}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Total de Cotações</p>
          </div>
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-status-info">{abertas}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Em Andamento</p>
          </div>
          <div className="card p-4">
            <p className="font-display font-bold text-2xl text-status-success">{fechadas}</p>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Fechadas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar cotação, obra..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-text-primary text-white'
                    : 'bg-surface-0 border border-surface-3 text-text-secondary hover:bg-surface-2'
                }`}
              >
                {f.label}
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

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-2">
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider">COTAÇÃO</th>
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider hidden md:table-cell">OBRA</th>
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider hidden lg:table-cell">CATEGORIA</th>
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-wider">STATUS</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-surface-2">
                      <td className="px-5 py-3.5" colSpan={5}>
                        <div className="h-4 bg-surface-2 rounded animate-pulse w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : (
                  filtered.map(g => (
                    <tr
                      key={g.id}
                      className="border-b border-surface-2 last:border-0 hover:bg-surface-1 transition-colors cursor-pointer"
                      onClick={() => navigate(`/cotacoes/${g.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-text-tertiary" />
                          </div>
                          <div>
                            <p className="font-body font-semibold text-sm text-text-primary">{g.titulo}</p>
                            <p className="font-data text-xs text-text-tertiary">
                              {new Date(g.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div>
                          <p className="font-body text-sm text-text-primary">{g.obras?.nome ?? '—'}</p>
                          {g.obras?.codigo && (
                            <p className="font-data text-xs text-mos-700">{g.obras.codigo}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {g.categoria ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-2 font-body text-xs text-text-secondary">
                            <Tag className="w-3 h-3" />
                            {g.categoria}
                          </span>
                        ) : (
                          <span className="font-body text-sm text-text-disabled">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-body font-medium ${
                          g.status === 'aberta'
                            ? 'bg-status-infoLight text-status-info'
                            : 'bg-status-successLight text-status-success'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          {g.status === 'aberta' ? 'Aberta' : 'Fechada'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/cotacoes/${g.id}`); }}
                          className="inline-flex items-center gap-1.5 font-body text-xs font-medium text-text-secondary hover:text-mos-700 transition-colors"
                        >
                          Abrir Comparativo
                          <ArrowRight className="w-3.5 h-3.5" />
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
      </div>

      {showModal && (
        <NovaCotacaoModal onClose={() => setShowModal(false)} />
      )}
    </AppLayout>
  );
}
