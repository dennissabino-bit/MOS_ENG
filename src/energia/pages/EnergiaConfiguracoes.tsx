import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Plus, Pencil, Trash2, KeyRound, Building2,
  ShieldCheck, Shield, Check, X as XIcon, AlertTriangle,
  LayoutDashboard, DoorOpen, Zap, Home, Receipt, FileText,
  ChevronDown, Loader2, Archive, ArchiveRestore, ChevronRight,
} from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovoUsuarioModal } from '../components/NovoUsuarioModal';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';
import { supabase } from '../../lib/supabase';
import type { EnergiaUsuario, EnergiaUnidade, EnergiaSala } from '../types';

type ModalMode = 'create' | 'edit' | 'senha';
type FilterPerfil = 'todos' | 'admin' | 'gerente';
type FilterAtivo = 'todos' | 'ativo' | 'inativo';
type ConfigTab = 'usuarios' | 'permissoes' | 'arquivados';

// Telas disponíveis para controle de acesso (gerentes — admin sempre vê tudo)
export const TELAS_DISPONIVEIS = [
  { key: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, desc: 'Visão geral e KPIs' },
  { key: 'salas',      label: 'Salas',      icon: DoorOpen,        desc: 'Listagem e detalhe de salas' },
  { key: 'medicoes',   label: 'Medições',   icon: Zap,             desc: 'Registro de consumo' },
  { key: 'alugueis',   label: 'Aluguéis',   icon: Home,            desc: 'Faturas de locação' },
  { key: 'faturas',    label: 'Faturas',    icon: Receipt,         desc: 'Faturas de energia' },
  { key: 'relatorios', label: 'Relatórios', icon: FileText,        desc: 'Exportação de dados' },
] as const;

export type TelaKey = typeof TELAS_DISPONIVEIS[number]['key'];
export const DEFAULT_TELAS_GERENTE: TelaKey[] = ['dashboard', 'salas', 'medicoes'];

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

// ─── Sub-tab: Usuários ────────────────────────────────────────────────────────

function UsuariosTab({
  usuarios,
  unidades,
  loading,
  authUser,
  onRefresh,
}: {
  usuarios: EnergiaUsuario[];
  unidades: EnergiaUnidade[];
  loading: boolean;
  authUser: EnergiaUsuario | null;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterPerfil, setFilterPerfil] = useState<FilterPerfil>('todos');
  const [filterAtivo, setFilterAtivo] = useState<FilterAtivo>('todos');
  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [modalUser, setModalUser] = useState<EnergiaUsuario | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<EnergiaUsuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const unidadeMap = new Map(unidades.map(u => [u.id, u.nome]));

  const filtered = usuarios.filter(u => {
    if (search && !u.nome.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPerfil !== 'todos' && u.perfil !== filterPerfil) return false;
    if (filterAtivo === 'ativo' && !u.ativo) return false;
    if (filterAtivo === 'inativo' && u.ativo) return false;
    if (filterUnidadeId && u.unidade_id !== filterUnidadeId) return false;
    return true;
  });

  function openCreate() { setModalMode('create'); setModalUser(undefined); setShowModal(true); }
  function openEdit(u: EnergiaUsuario) { setModalMode('edit'); setModalUser(u); setShowModal(true); }
  function openSenha(u: EnergiaUsuario) { setModalMode('senha'); setModalUser(u); setShowModal(true); }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    await supabase.from('energia_usuarios').delete().eq('id', deleteConfirm.id);
    setDeleting(false);
    setDeleteConfirm(null);
    onRefresh();
  }

  const totalAtivos = usuarios.filter(u => u.ativo).length;
  const totalGerentes = usuarios.filter(u => u.perfil === 'gerente').length;
  const totalAdmins = usuarios.filter(u => u.perfil === 'admin').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">USUÁRIOS</h2>
          <p className="font-body text-sm text-text-tertiary mt-0.5">
            {totalAtivos} ativos · {totalGerentes} gerentes · {totalAdmins} admins
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

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: usuarios.length, bg: 'bg-surface-1' },
          { label: 'Ativos',   value: totalAtivos,     bg: 'bg-status-successLight' },
          { label: 'Gerentes', value: totalGerentes,   bg: 'bg-status-infoLight' },
          { label: 'Admins',   value: totalAdmins,     bg: 'bg-mos-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 flex items-center justify-between border border-surface-2`}>
            <span className="font-body text-xs font-semibold text-text-tertiary tracking-wide">{s.label.toUpperCase()}</span>
            <span className="font-display font-bold text-xl text-text-primary">{s.value}</span>
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
            className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 shadow-card"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['todos', 'admin', 'gerente'] as FilterPerfil[]).map(v => (
            <button key={v} onClick={() => setFilterPerfil(v)}
              className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${filterPerfil === v ? 'bg-text-primary text-white' : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'}`}>
              {v === 'todos' ? 'Todos' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {([['todos', 'Todos'], ['ativo', 'Ativos'], ['inativo', 'Inativos']] as [FilterAtivo, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setFilterAtivo(v)}
              className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all duration-150 ${filterAtivo === v ? 'bg-text-primary text-white' : 'bg-surface-0 text-text-secondary border border-surface-3 hover:bg-surface-2'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <select value={filterUnidadeId} onChange={e => setFilterUnidadeId(e.target.value)}
            className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none shadow-card cursor-pointer">
            <option value="">Todas Unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-2 bg-surface-1">
                  <th className="text-left px-5 py-3 font-body text-xs font-bold text-text-secondary tracking-widest">USUÁRIO</th>
                  <th className="text-left px-4 py-3 font-body text-xs font-bold text-text-secondary tracking-widest hidden sm:table-cell">PERFIL</th>
                  <th className="text-left px-4 py-3 font-body text-xs font-bold text-text-secondary tracking-widest hidden md:table-cell">UNIDADE</th>
                  <th className="text-left px-4 py-3 font-body text-xs font-bold text-text-secondary tracking-widest hidden lg:table-cell">STATUS</th>
                  <th className="text-right px-5 py-3 font-body text-xs font-bold text-text-secondary tracking-widest">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {filtered.map(u => {
                  const isSelf = u.id === authUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-surface-1 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${u.perfil === 'admin' ? 'bg-mos-50' : 'bg-status-infoLight'}`}>
                            <span className="font-display font-bold text-[11px] text-text-primary">{u.nome.slice(0, 2).toUpperCase()}</span>
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
                        <span className={`inline-flex items-center gap-1 font-body text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${u.perfil === 'admin' ? 'bg-mos-50 text-mos-700' : 'bg-status-infoLight text-status-info'}`}>
                          {u.perfil === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {u.perfil.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {u.unidade_id
                          ? <span className="flex items-center gap-1.5 font-body text-sm text-text-secondary"><Building2 className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />{unidadeMap.get(u.unidade_id) || '—'}</span>
                          : <span className="font-body text-sm text-text-disabled">—</span>}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className={`inline-flex font-body text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${u.ativo ? 'badge-saudavel' : 'text-text-tertiary bg-surface-2'}`}>
                          {u.ativo ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} title="Editar" className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openSenha(u)} title="Alterar senha" className="p-2 rounded-lg text-text-tertiary hover:text-status-warning hover:bg-status-warningLight transition-colors"><KeyRound className="w-3.5 h-3.5" /></button>
                          <button
                            onClick={() => !isSelf && setDeleteConfirm(u)}
                            title={isSelf ? 'Não é possível excluir seu próprio usuário' : 'Excluir'}
                            disabled={isSelf}
                            className={`p-2 rounded-lg transition-colors ${isSelf ? 'text-text-disabled cursor-not-allowed' : 'text-text-tertiary hover:text-status-error hover:bg-status-errorLight'}`}
                          ><Trash2 className="w-3.5 h-3.5" /></button>
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
            <h3 className="font-display font-bold text-sm text-text-primary">Matriz de Perfis</h3>
            <p className="font-body text-xs text-text-tertiary">O que cada perfil pode fazer por padrão</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-2 bg-surface-1">
                <th className="text-left px-5 py-3 font-body text-xs font-bold text-text-secondary tracking-widest">AÇÃO</th>
                <th className="text-center px-6 py-3 font-body text-xs font-bold text-text-secondary tracking-widest"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-mos-700" />ADMIN</span></th>
                <th className="text-center px-6 py-3 font-body text-xs font-bold text-text-secondary tracking-widest"><span className="inline-flex items-center gap-1.5"><Shield className="w-3 h-3 text-status-info" />GERENTE</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-2">
              {PERMISSION_MATRIX.map(row => (
                <tr key={row.acao} className="hover:bg-surface-1 transition-colors">
                  <td className="px-5 py-3 font-body text-sm text-text-secondary">{row.acao}</td>
                  <td className="px-6 py-3 text-center">
                    {row.admin
                      ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-successLight"><Check className="w-3 h-3 text-status-success" strokeWidth={2.5} /></span>
                      : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-errorLight"><XIcon className="w-3 h-3 text-status-error" strokeWidth={2.5} /></span>}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {row.gerente
                      ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-successLight"><Check className="w-3 h-3 text-status-success" strokeWidth={2.5} /></span>
                      : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-errorLight"><XIcon className="w-3 h-3 text-status-error" strokeWidth={2.5} /></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NovoUsuarioModal
          mode={modalMode}
          initial={modalUser}
          unidades={unidades}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onRefresh(); }}
        />
      )}

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
              Tem certeza que deseja excluir <span className="font-semibold text-text-primary">{deleteConfirm.nome}</span>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-status-error text-white font-body font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Permissões por tela ─────────────────────────────────────────────

function PermissoesTab({
  usuarios,
  unidades,
  loading,
  onRefresh,
}: {
  usuarios: EnergiaUsuario[];
  unidades: EnergiaUnidade[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const gerentes = usuarios.filter(u => u.perfil === 'gerente' && (
    !filterUnidadeId || u.unidade_id === filterUnidadeId
  ) && (
    !search || u.nome.toLowerCase().includes(search.toLowerCase())
  ));

  const unidadeMap = new Map(unidades.map(u => [u.id, u.nome]));

  function getTelas(u: EnergiaUsuario): TelaKey[] {
    if (u.telas_permitidas && u.telas_permitidas.length > 0) {
      return u.telas_permitidas as TelaKey[];
    }
    return DEFAULT_TELAS_GERENTE;
  }

  async function toggleTela(u: EnergiaUsuario, tela: TelaKey) {
    const current = getTelas(u);
    const next = current.includes(tela)
      ? current.filter(t => t !== tela)
      : [...current, tela];
    setSaving(u.id + tela);
    await supabase.from('energia_usuarios').update({ telas_permitidas: next }).eq('id', u.id);
    setSaving(null);
    onRefresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">PERMISSÕES DE TELA</h2>
        <p className="font-body text-sm text-text-tertiary mt-0.5">
          Controle quais telas cada gerente pode acessar. Admins sempre têm acesso total.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="font-body text-xs text-blue-700 leading-relaxed">
          Administradores sempre visualizam todas as telas independente dessas configurações. As permissões abaixo se aplicam apenas a usuários com perfil <strong>Gerente</strong>.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar gerente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 shadow-card"
          />
        </div>
        <div className="relative">
          <select value={filterUnidadeId} onChange={e => setFilterUnidadeId(e.target.value)}
            className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none shadow-card cursor-pointer">
            <option value="">Todas Unidades</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : gerentes.length === 0 ? (
        <div className="text-center py-16 card">
          <Shield className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary">Nenhum gerente encontrado</p>
          <p className="font-body text-xs text-text-disabled mt-1">Crie usuários com perfil Gerente na aba Usuários</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gerentes.map(u => {
            const telas = getTelas(u);
            return (
              <div key={u.id} className="card overflow-hidden">
                {/* User header */}
                <div className="px-5 py-4 border-b border-surface-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-status-infoLight flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-bold text-[11px] text-text-primary">{u.nome.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-body font-semibold text-sm text-text-primary truncate">{u.nome}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-xs text-text-tertiary truncate">{u.email}</p>
                        {u.unidade_id && (
                          <span className="flex items-center gap-1 font-body text-[10px] text-text-secondary shrink-0">
                            <Building2 className="w-3 h-3" />
                            {unidadeMap.get(u.unidade_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-status-success' : 'bg-surface-3'}`} />
                    <span className="font-body text-xs text-text-tertiary">{telas.length} tela{telas.length !== 1 ? 's' : ''} liberada{telas.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Telas grid */}
                <div className="px-5 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {TELAS_DISPONIVEIS.map(tela => {
                      const enabled = telas.includes(tela.key);
                      const isSaving = saving === u.id + tela.key;
                      const Icon = tela.icon;
                      return (
                        <button
                          key={tela.key}
                          onClick={() => toggleTela(u, tela.key)}
                          disabled={isSaving}
                          className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 text-center group ${
                            enabled
                              ? 'border-mos-700 bg-mos-700/5 hover:bg-mos-700/10'
                              : 'border-surface-3 bg-surface-1 hover:border-surface-3 hover:bg-surface-2'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                          ) : (
                            <Icon className={`w-4 h-4 transition-colors ${enabled ? 'text-mos-700' : 'text-text-tertiary'}`} strokeWidth={enabled ? 2.2 : 1.8} />
                          )}
                          <span className={`font-body text-[11px] font-semibold leading-tight ${enabled ? 'text-mos-700' : 'text-text-secondary'}`}>
                            {tela.label}
                          </span>
                          <div className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center transition-all ${enabled ? 'bg-mos-700' : 'bg-surface-3'}`}>
                            {enabled
                              ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              : <XIcon className="w-2.5 h-2.5 text-text-disabled" strokeWidth={2.5} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Arquivados ──────────────────────────────────────────────────────

function ArquivadosTab({
  salas,
  unidades,
  loading,
  onRefresh,
}: {
  salas: EnergiaSala[];
  unidades: EnergiaUnidade[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const { isAdmin } = useEnergiaAuth();
  const [search, setSearch] = useState('');
  const [filterUnidadeId, setFilterUnidadeId] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);

  const unidadeMap = new Map(unidades.map(u => [u.id, u]));

  const arquivadas = salas.filter(s => {
    if (!s.arquivada) return false;
    if (search && !s.nome.toLowerCase().includes(search.toLowerCase()) && !(unidadeMap.get(s.unidade_id)?.nome || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterUnidadeId && s.unidade_id !== filterUnidadeId) return false;
    return true;
  });

  async function handleRestaurar(sala: EnergiaSala) {
    setRestoring(sala.id);
    await supabase.from('energia_salas').update({ arquivada: false }).eq('id', sala.id);
    setRestoring(null);
    onRefresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">ARQUIVADOS</h2>
        <p className="font-body text-sm text-text-tertiary mt-0.5">
          Salas arquivadas não aparecem nas listagens nem recebem novas faturas. Restaure para reativar.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Archive className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="font-body text-xs text-amber-700 leading-relaxed">
          Para arquivar uma sala, acesse a página de detalhe dela e clique em <strong>Arquivar</strong>. Aqui você visualiza e restaura salas já arquivadas.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar sala ou unidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 shadow-card"
          />
        </div>
        {isAdmin && (
          <div className="relative">
            <select value={filterUnidadeId} onChange={e => setFilterUnidadeId(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none shadow-card cursor-pointer">
              <option value="">Todas Unidades</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : arquivadas.length === 0 ? (
        <div className="text-center py-20 card">
          <Archive className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary">Nenhuma sala arquivada</p>
          <p className="font-body text-xs text-text-disabled mt-1">Salas arquivadas aparecem aqui</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-surface-2">
          {arquivadas.map(sala => {
            const unidade = unidadeMap.get(sala.unidade_id);
            const isRestoring = restoring === sala.id;
            return (
              <div key={sala.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-1 transition-colors group">
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => navigate(`/imoveis/salas/${sala.id}`)}
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                    <DoorOpen className="w-4 h-4 text-text-disabled" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body font-medium text-sm text-text-secondary truncate">{sala.nome}</p>
                    <div className="flex items-center gap-2">
                      {unidade && (
                        <span className="flex items-center gap-1 font-body text-xs text-text-tertiary truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />{unidade.nome}
                        </span>
                      )}
                      {unidade?.cidade && (
                        <span className="font-body text-xs text-text-disabled hidden sm:inline">{unidade.cidade}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleRestaurar(sala)}
                    disabled={isRestoring}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm font-semibold text-text-secondary bg-surface-1 hover:bg-surface-2 border border-surface-3 transition-colors disabled:opacity-50"
                  >
                    {isRestoring
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <ArchiveRestore className="w-3.5 h-3.5" />}
                    Restaurar
                  </button>
                  <ChevronRight className="w-4 h-4 text-text-disabled group-hover:text-text-secondary transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function EnergiaConfiguracoes() {
  const { user: authUser, isAdmin } = useEnergiaAuth();
  const [tab, setTab] = useState<ConfigTab>('usuarios');
  const [usuarios, setUsuarios] = useState<EnergiaUsuario[]>([]);
  const [unidades, setUnidades] = useState<EnergiaUnidade[]>([]);
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    let sQuery = supabase.from('energia_salas').select('*').eq('arquivada', true).order('nome');
    if (!isAdmin && authUser?.unidade_id) sQuery = sQuery.eq('unidade_id', authUser.unidade_id);
    const [uRes, unRes, sRes] = await Promise.all([
      supabase.from('energia_usuarios').select('*').order('nome'),
      supabase.from('energia_unidades').select('*').order('nome'),
      sQuery,
    ]);
    setUsuarios((uRes.data as EnergiaUsuario[]) || []);
    setUnidades((unRes.data as EnergiaUnidade[]) || []);
    setSalas((sRes.data as EnergiaSala[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [isAdmin, authUser]);

  const arquivadasCount = salas.filter(s => s.arquivada).length;

  return (
    <EnergiaLayout title="Configurações" subtitle="Usuários e controle de acesso">
      <div className="p-6 space-y-5">
        {/* Page header */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="font-body text-xs font-bold text-text-secondary tracking-widest mb-1">ADMINISTRAÇÃO</p>
            <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">CONFIGURAÇÕES</h1>
            <p className="font-body text-sm text-text-tertiary mt-1">Gerencie usuários, permissões e itens arquivados</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-1 rounded-xl p-1 border border-surface-2 w-fit flex-wrap">
          <button
            onClick={() => setTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
              tab === 'usuarios'
                ? 'bg-white text-text-primary shadow-card border border-surface-2'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            onClick={() => setTab('permissoes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
              tab === 'permissoes'
                ? 'bg-white text-text-primary shadow-card border border-surface-2'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Permissões
          </button>
          <button
            onClick={() => setTab('arquivados')}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-medium transition-all duration-150 ${
              tab === 'arquivados'
                ? 'bg-white text-text-primary shadow-card border border-surface-2'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Archive className="w-4 h-4" />
            Arquivados
            {arquivadasCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-text-secondary text-white font-data text-[10px] font-bold">
                {arquivadasCount}
              </span>
            )}
          </button>
        </div>

        {tab === 'usuarios' ? (
          <UsuariosTab
            usuarios={usuarios}
            unidades={unidades}
            loading={loading}
            authUser={authUser}
            onRefresh={fetchData}
          />
        ) : tab === 'permissoes' ? (
          <PermissoesTab
            usuarios={usuarios}
            unidades={unidades}
            loading={loading}
            onRefresh={fetchData}
          />
        ) : (
          <ArquivadosTab
            salas={salas}
            unidades={unidades}
            loading={loading}
            onRefresh={fetchData}
          />
        )}
      </div>
    </EnergiaLayout>
  );
}