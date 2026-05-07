import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, ChevronRight, Phone, Mail, SlidersHorizontal } from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { supabase } from '../../lib/supabase';
import { NovaUnidadeModal } from '../components/NovaUnidadeModal';
import type { EnergiaUnidade } from '../types';

export default function Unidades() {
  const navigate = useNavigate();
  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchUnidades(); }, []);

  async function fetchUnidades() {
    setLoading(true);
    const { data } = await supabase.from('energia_unidades').select('*').order('nome');
    setUnidades((data as EnergiaUnidade[]) || []);
    setLoading(false);
  }

  const filtered = unidades.filter(u =>
    !search || u.nome.toLowerCase().includes(search.toLowerCase()) || u.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EnergiaLayout title="Unidades" subtitle="Gerenciamento de unidades e responsáveis">
      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">ESTRUTURA</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">UNIDADES</h1>
              <p className="font-body text-sm text-text-tertiary mt-1">{unidades.length} unidades cadastradas</p>
            </div>
          </div>
        </div>

        {/* Search + actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar unidade, código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors shadow-card">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary">Nenhuma unidade encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(u => (
              <div
                key={u.id}
                onClick={() => navigate(`/energia/unidades/${u.id}`)}
                className="card p-5 hover:shadow-card-hover transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div>
                      <p className="font-body font-semibold text-sm text-text-primary">{u.nome}</p>
                      <p className="font-data text-xs text-mos-700 font-medium">{u.codigo}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-disabled group-hover:text-text-secondary transition-colors mt-0.5" />
                </div>

                {u.endereco && (
                  <p className="font-body text-xs text-text-tertiary mb-3 line-clamp-1">{u.endereco}</p>
                )}

                <div className="pt-3 border-t border-surface-2">
                  <p className="font-body text-xs text-text-secondary font-semibold mb-1.5">{u.gerente_nome || 'Sem gerente'}</p>
                  <div className="space-y-0.5">
                    {u.gerente_email && (
                      <span className="flex items-center gap-1.5 font-body text-[11px] text-text-tertiary">
                        <Mail className="w-3 h-3 flex-shrink-0" />{u.gerente_email}
                      </span>
                    )}
                    {u.gerente_telefone && (
                      <span className="flex items-center gap-1.5 font-body text-[11px] text-text-tertiary">
                        <Phone className="w-3 h-3 flex-shrink-0" />{u.gerente_telefone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-3 rounded-xl shadow-modal transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93] z-30"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Nova Unidade
      </button>

      {showModal && (
        <NovaUnidadeModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchUnidades(); }} />
      )}
    </EnergiaLayout>
  );
}
