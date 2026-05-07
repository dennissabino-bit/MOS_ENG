import { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Pencil, Trash2, KeyRound, Building2,
  ShieldCheck, Shield, Check, X as XIcon, AlertTriangle,
} from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovoUsuarioModal } from '../components/NovoUsuarioModal';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { supabase } from '../../lib/supabase';
import type { EnergiaUsuario, EnergiaUnidade } from '../types';

type ModalMode = 'create' | 'edit' | 'senha';
type FilterPerfil = 'todos' | 'admin' | 'gerente';
type FilterAtivo = 'todos' | 'ativo' | 'inativo';

const PERMISSION_MATRIX = [
  { acao: 'Acessar Dashboard',          admin: true,  gerente: true  },
  { acao: 'Ver todas as unidades',       admin: true,  gerente: false },
  { acao: 'Criar / editar unidades',     admin: true,  gerente: false },
  { acao: 'Ver todas as salas',          admin: true,  gerente: false },
  { acao: 'Ver salas da sua unidade',    admin: true,  gerente: true  },
  { acao: 'Inserir medições',            admin: true,  gerente: true  },
  { acao: 'Ver todas as medições',       admin: true,  gerente: false },
  { acao: 'Ver medições da sua unidade', admin: true,  gerente: true  },
  { acao: 'Gerenciar usuários',          admin: true,  gerente: false },
];

interface DeleteConfirm {
  user: EnergiaUsuario;
}

export default function Usuarios() {
  const { user: authUser } = useEnergiaAuth();
  const [usuarios, setUsuarios] = useState<EnergiaUsuario[]>([]);
  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPerfil, setFilterPerfil] = useState<FilterPerfil>('todos');
  const [filterAtivo, setFilterAtivo] = useState<FilterAtivo>('todos');
  const [filterUnidadeId, setFilterUnidadeId] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [modalUser, setModalUser] = useState<EnergiaUsuario | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchData() {
    setLoading(true);
    const [uRes, unRes] = await Promise.all([
      supabase.from('energia_usuarios').select('*').order('nome'),
      supabase.from('energia_unidades').select('*').order('nome'),
    ]);
    setUsuarios((uRes.data as EnergiaUsuario[]) || []);
    setUnidades((unRes.data as EnergiaUnidade[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const unidadeMap = new Map(unidades.map(u => [u.id, u.nome]));

  const filtered = usuarios.filter(u => {
    const matchSearch = !search
      || u.nome.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    const matchPerfil = filterPerfil === 'todos' || u.perfil === filterPerfil;
    const matchAtivo = filterAtivo === 'todos' || (filterAtivo === 'ativo' ? u.ativo : !u.ativo);
    const matchUnidade = !filterUnidadeId || u.unidade_id === filterUnidadeId;
    return matchSearch && matchPerfil && matchAtivo && matchUnidade;
  });

  function openCreate() {
    setModalMode('create');
    setModalUser(undefined);
    setShowModal(true);
  }

  function openEdit(u: EnergiaUsuario) {
    setModalMode('edit');
    setModalUser(u);
    setShowModal(true);
  }

  function openSenha(u: EnergiaUsuario) {
    setModalMode('senha');
    setModalUser(u);
    setShowModal(true);
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    await supabase.from('energia_usuarios').delete().eq('id', deleteConfirm.user.id);
    setDeleting(false);
    setDeleteConfirm(null);
    fetchData();
  }

  const totalAtivos = usuarios.filter(u => u.ativo).length;
  const totalGerentes = usuarios.filter(u => u.perfil === 'gerente').length;

  return (
    <EnergiaLayout title="Usuários" subtitle="Gerenciamento de acesso ao módulo">
      <div className="p-6 space-y-6">
        {/* Page header */}
        <div>
          <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">ADMINISTRAÇÃO</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">USUÁRIOS</h1>
              <p className="font-body text-sm text-text-tertiary mt-1">
                {totalAtivos} ativos · {totalGerentes} gerentes · {usuarios.filter(u => u.perfil === 'admin').length} admins
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2.5 rounded-xl shadow-modal transition-transform duration-[120ms] hover:scale-[1.03] active:scale-[0.95]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: usuarios.length, color: 'bg-surface-1' },
            { label: 'Ativos', value: totalAtivos, color: 'bg-status-successLight' },
            { label: 'Gerentes', value: totalGerentes, color: 'bg-status-infoLight' },
            { label: 'Admins', value: usuarios.filter(u => u.perfil === 'admin').length, color: 'bg-mos-50' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} rounded-xl px-4 py-3 flex items-center justify-between border border-surface-2`}>
              <span className="font-body text-xs font-semibold text-text-tertiary tracking-wide">{stat.label.toUpperCase()}</span>
              <span className="font-display font-bold text-xl text-text-primary">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar nome ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>

          {/* Perfil filter */}
          <div className="flex items-center gap-1">
            {([['todos', 'Todos'], ['admin', 'Admin'], ['gerente', 'Gerente']] as [FilterPerfil, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterPerfil(val)}
                className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                  filterPerfil === val
                    ? 'bg-text-primary text-white'
                    : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ativo filter */}
          <div className="flex items-center gap-1">
            {([['todos', 'Todos'], ['ativo', 'Ativos'], ['inativo', 'Inativos']] as [FilterAtivo, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterAtivo(val)}
                className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
                  filterAtivo === val
                    ? 'bg-text-primary text-white'
                    : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Unidade filter */}
          <div className="relative">
            <select
              value={filterUnidadeId}
              onChange={e => setFilterUnidadeId(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card cursor-pointer"
            >
              <option value="">Todas Unidades</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-2 bg-surface-1">
                    <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">USUÁRIO</th>
                    <th className="text-left px-4 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest hidden sm:table-cell">PERFIL</th>
                    <th className="text-left px-4 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest hidden md:table-cell">UNIDADE</th>
                    <th className="text-left px-4 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest hidden lg:table-cell">STATUS</th>
                    <th className="text-right px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-2">
                  {filtered.map(u => {
                    const isSelf = u.id === authUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-surface-1 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              u.perfil === 'admin' ? 'bg-mos-50' : 'bg-status-infoLight'
                            }`}>
                              <span className="font-display font-bold text-[11px] text-text-primary">
                                {u.nome.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-body font-semibold text-sm text-text-primary truncate">{u.nome}</p>
                                {isSelf && <span className="font-body text-[9px] font-bold text-mos-700 bg-mos-50 px-1.5 py-0.5 rounded tracking-wider">VOCÊ</span>}
                              </div>
                              <p className="font-body text-xs text-text-tertiary truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 font-body text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${
                            u.perfil === 'admin' ? 'bg-mos-50 text-mos-700' : 'bg-status-infoLight text-status-info'
                          }`}>
                            {u.perfil === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                            {u.perfil.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          {u.unidade_id ? (
                            <span className="flex items-center gap-1.5 font-body text-sm text-text-secondary">
                              <Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                              {unidadeMap.get(u.unidade_id) || '—'}
                            </span>
                          ) : (
                            <span className="font-body text-sm text-text-disabled">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className={`inline-flex font-body text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${
                            u.ativo ? 'badge-saudavel' : 'text-text-tertiary bg-surface-2'
                          }`}>
                            {u.ativo ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(u)}
                              title="Editar usuário"
                              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openSenha(u)}
                              title="Alterar senha"
                              className="p-2 rounded-lg text-text-tertiary hover:text-status-warning hover:bg-status-warningLight transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => !isSelf && setDeleteConfirm({ user: u })}
                              title={isSelf ? 'Não é possível excluir seu próprio usuário' : 'Excluir usuário'}
                              disabled={isSelf}
                              className={`p-2 rounded-lg transition-colors ${
                                isSelf
                                  ? 'text-text-disabled cursor-not-allowed'
                                  : 'text-text-tertiary hover:text-status-error hover:bg-status-errorLight'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* Permission Matrix */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-text-primary">Matriz de Permissões</h3>
              <p className="font-body text-xs text-text-tertiary">O que cada perfil pode acessar</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-2 bg-surface-1">
                  <th className="text-left px-5 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">AÇÃO</th>
                  <th className="text-center px-6 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-mos-700" />
                      ADMIN
                    </span>
                  </th>
                  <th className="text-center px-6 py-3 font-body text-[10px] font-semibold text-text-tertiary tracking-widest">
                    <span className="inline-flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-status-info" />
                      GERENTE
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {PERMISSION_MATRIX.map(row => (
                  <tr key={row.acao} className="hover:bg-surface-1 transition-colors">
                    <td className="px-5 py-3 font-body text-sm text-text-secondary">{row.acao}</td>
                    <td className="px-6 py-3 text-center">
                      {row.admin
                        ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-successLight"><Check className="w-3 h-3 text-status-success" strokeWidth={2.5} /></span>
                        : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-errorLight"><XIcon className="w-3 h-3 text-status-error" strokeWidth={2.5} /></span>
                      }
                    </td>
                    <td className="px-6 py-3 text-center">
                      {row.gerente
                        ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-successLight"><Check className="w-3 h-3 text-status-success" strokeWidth={2.5} /></span>
                        : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-errorLight"><XIcon className="w-3 h-3 text-status-error" strokeWidth={2.5} /></span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <NovoUsuarioModal
          mode={modalMode}
          initial={modalUser}
          unidades={unidades}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-status-errorLight flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-status-error" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-text-primary">Excluir Usuário</h3>
                <p className="font-body text-xs text-text-tertiary">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="font-body text-sm text-text-secondary mb-5">
              Tem certeza que deseja excluir <span className="font-semibold text-text-primary">{deleteConfirm.user.nome}</span>?
              O usuário perderá acesso imediatamente.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-status-error text-white font-body font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </EnergiaLayout>
  );
}
