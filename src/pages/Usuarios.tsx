import { useState, useEffect } from 'react';
import { Search, Plus, UserCheck, UserX, Shield, ChevronDown, ChevronUp, Check, Users } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { RoleBadge } from '../components/ui/Badge';
import { NovoUsuarioModal } from '../components/usuarios/NovoUsuarioModal';
import { supabase } from '../lib/supabase';
import type { UserCargo, Usuario } from '../lib/database.types';

const CARGO_LABELS: Record<UserCargo, string> = {
  administrador: 'Administrador',
  gerente:       'Gerente',
  engenheiro:    'Engenheiro',
  gestor:        'Gestor',
  operacional:   'Operacional',
};

const CARGO_DESCRICAO: Record<UserCargo, string> = {
  administrador: 'Acesso total ao sistema, gerencia usuários e permissões',
  gerente:       'Visão gerencial de obras, orçamentos e relatórios',
  engenheiro:    'Gestão técnica de obras, medições e cronograma',
  gestor:        'Acompanhamento de cotações, fornecedores e suprimentos',
  operacional:   'Acesso de leitura, lançamento de diário de obra',
};

const AVATAR_COLORS: Record<UserCargo, string> = {
  administrador: 'bg-role-master text-white',
  gerente:       'bg-role-gestor text-white',
  engenheiro:    'bg-role-engenheiro text-white',
  gestor:        'bg-blue-500 text-white',
  operacional:   'bg-role-comprador text-white',
};

type Permissao = {
  id: string;
  label: string;
  descricao: string;
  modulo: string;
};

const PERMISSOES: Permissao[] = [
  { id: 'obras_ver',        label: 'Visualizar Obras',       descricao: 'Acesso à listagem e detalhes de obras',              modulo: 'Obras' },
  { id: 'obras_criar',      label: 'Criar Obras',            descricao: 'Criar e editar novos projetos',                      modulo: 'Obras' },
  { id: 'obras_arquivar',   label: 'Arquivar Obras',         descricao: 'Arquivar e desarquivar projetos',                    modulo: 'Obras' },
  { id: 'orcamento_ver',    label: 'Visualizar Orçamento',   descricao: 'Acesso a EAP e planilha orçamentária',               modulo: 'Orçamento' },
  { id: 'orcamento_editar', label: 'Editar Orçamento',       descricao: 'Lançar e editar itens de orçamento (EAP)',           modulo: 'Orçamento' },
  { id: 'medicoes_ver',     label: 'Visualizar Medições',    descricao: 'Acesso ao módulo de medições',                       modulo: 'Medições' },
  { id: 'medicoes_criar',   label: 'Lançar Medições',        descricao: 'Criar e submeter medições para aprovação',           modulo: 'Medições' },
  { id: 'medicoes_aprovar', label: 'Aprovar Medições',       descricao: 'Aprovar ou reprovar medições submetidas',            modulo: 'Medições' },
  { id: 'cronograma_ver',   label: 'Visualizar Cronograma',  descricao: 'Acesso ao cronograma e curva S',                     modulo: 'Cronograma' },
  { id: 'diario_ver',       label: 'Visualizar Diário',      descricao: 'Leitura do diário de obra',                          modulo: 'Diário' },
  { id: 'diario_criar',     label: 'Lançar Diário',          descricao: 'Criar registros no diário de obra',                  modulo: 'Diário' },
  { id: 'fornecedores_ver', label: 'Visualizar Fornecedores', descricao: 'Acesso ao cadastro de fornecedores',                modulo: 'Fornecedores' },
  { id: 'cotacoes_ver',     label: 'Visualizar Cotações',    descricao: 'Acesso ao módulo de cotações',                       modulo: 'Cotações' },
  { id: 'cotacoes_criar',   label: 'Gerenciar Cotações',     descricao: 'Criar, editar e aprovar cotações',                   modulo: 'Cotações' },
  { id: 'usuarios_ver',     label: 'Visualizar Usuários',    descricao: 'Acesso à gestão de usuários',                        modulo: 'Usuários' },
  { id: 'usuarios_gerenciar', label: 'Gerenciar Usuários',   descricao: 'Convidar, editar permissões e desativar usuários',   modulo: 'Usuários' },
];

const MATRIZ_PADRAO: Record<UserCargo, Set<string>> = {
  administrador: new Set(PERMISSOES.map(p => p.id)),
  gerente:       new Set(['obras_ver', 'obras_criar', 'obras_arquivar', 'orcamento_ver', 'orcamento_editar', 'medicoes_ver', 'medicoes_criar', 'medicoes_aprovar', 'cronograma_ver', 'diario_ver', 'diario_criar', 'fornecedores_ver', 'cotacoes_ver', 'cotacoes_criar', 'usuarios_ver']),
  engenheiro:    new Set(['obras_ver', 'orcamento_ver', 'orcamento_editar', 'medicoes_ver', 'medicoes_criar', 'cronograma_ver', 'diario_ver', 'diario_criar', 'fornecedores_ver', 'cotacoes_ver']),
  gestor:        new Set(['obras_ver', 'orcamento_ver', 'medicoes_ver', 'cronograma_ver', 'diario_ver', 'fornecedores_ver', 'cotacoes_ver', 'cotacoes_criar']),
  operacional:   new Set(['obras_ver', 'medicoes_ver', 'cronograma_ver', 'diario_ver', 'diario_criar']),
};

const CARGOS: UserCargo[] = ['administrador', 'gerente', 'engenheiro', 'gestor', 'operacional'];
const MODULOS = [...new Set(PERMISSOES.map(p => p.modulo))];

// Exportado para reuso no módulo Configurações
export function UsuariosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState('');
  const [cargoFilter, setCargoFilter] = useState<UserCargo | 'todos'>('todos');
  const [matrizAberta, setMatrizAberta] = useState(false);
  const [matriz, setMatriz] = useState<Record<UserCargo, Set<string>>>(
    () => ({ ...MATRIZ_PADRAO })
  );
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set(MODULOS));
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    setLoading(true);
    const { data } = await supabase.from('usuarios').select('*').order('nome');
    if (data) setUsuarios(data as Usuario[]);
    setLoading(false);
  }

  const ativos = usuarios.filter(u => u.ativo).length;

  const filtered = usuarios.filter(u => {
    const matchSearch = !search || u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchCargo = cargoFilter === 'todos' || u.cargo === cargoFilter;
    return matchSearch && matchCargo;
  });

  function togglePermissao(cargo: UserCargo, permId: string) {
    if (cargo === 'administrador') return;
    setMatriz(prev => {
      const next = { ...prev, [cargo]: new Set(prev[cargo]) };
      if (next[cargo].has(permId)) next[cargo].delete(permId);
      else next[cargo].add(permId);
      return next;
    });
  }

  function toggleModulo(cargo: UserCargo, modulo: string) {
    if (cargo === 'administrador') return;
    const permIds = PERMISSOES.filter(p => p.modulo === modulo).map(p => p.id);
    const allOn = permIds.every(id => matriz[cargo].has(id));
    setMatriz(prev => {
      const next = { ...prev, [cargo]: new Set(prev[cargo]) };
      if (allOn) permIds.forEach(id => next[cargo].delete(id));
      else permIds.forEach(id => next[cargo].add(id));
      return next;
    });
  }

  function toggleModuloExpand(modulo: string) {
    setExpandedModulos(prev => {
      const next = new Set(prev);
      if (next.has(modulo)) next.delete(modulo);
      else next.add(modulo);
      return next;
    });
  }

  async function toggleUsuarioAtivo(id: string) {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;
    const novoAtivo = !usuario.ativo;
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: novoAtivo } : u));
    await supabase.from('usuarios').update({ ativo: novoAtivo }).eq('id', id);
  }

  function handleSaved(item: Usuario) {
    setUsuarios(prev => [...prev, item].sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  const cargoStats: Record<UserCargo, number> = {
    administrador: usuarios.filter(u => u.cargo === 'administrador').length,
    gerente:       usuarios.filter(u => u.cargo === 'gerente').length,
    engenheiro:    usuarios.filter(u => u.cargo === 'engenheiro').length,
    gestor:        usuarios.filter(u => u.cargo === 'gestor').length,
    operacional:   usuarios.filter(u => u.cargo === 'operacional').length,
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div>
          <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">ADMINISTRAÇÃO</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">USUÁRIOS</h1>
              <p className="font-body text-sm text-text-tertiary mt-1">
                {usuarios.length} cadastrados · {ativos} ativos · {usuarios.length - ativos} inativos
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CARGOS.map(cargo => (
            <div key={cargo} className="card p-4">
              <p className="font-display font-bold text-2xl text-text-primary">{cargoStats[cargo]}</p>
              <p className="font-body text-xs text-text-tertiary mt-0.5 truncate">{CARGO_LABELS[cargo]}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {(['todos', ...CARGOS] as (UserCargo | 'todos')[]).map(cargo => (
              <button
                key={cargo}
                onClick={() => setCargoFilter(cargo)}
                className={`px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-colors ${
                  cargoFilter === cargo
                    ? 'bg-text-primary text-white'
                    : 'bg-surface-0 border border-surface-3 text-text-secondary hover:bg-surface-2'
                }`}
              >
                {cargo === 'todos' ? 'Todos' : CARGO_LABELS[cargo as UserCargo]}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setMatrizAberta(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-body text-sm font-medium border transition-colors ${
                matrizAberta
                  ? 'bg-text-primary text-white border-text-primary'
                  : 'bg-surface-0 border-surface-3 text-text-secondary hover:bg-surface-2'
              }`}
            >
              <Shield className="w-4 h-4" />
              Matriz de Permissões
              {matrizAberta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Usuário
            </button>
          </div>
        </div>

        {matrizAberta && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-2 flex items-center gap-3">
              <Shield className="w-4 h-4 text-text-secondary" />
              <div>
                <h2 className="font-display font-bold text-sm text-text-primary">Matriz de Permissões por Nível</h2>
                <p className="font-body text-xs text-text-tertiary mt-0.5">Administrador tem acesso total e irrestrito. Clique para ativar/desativar permissões dos demais níveis.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-surface-2 bg-surface-1">
                    <th className="text-left px-6 py-3 font-body text-xs font-semibold text-text-tertiary w-64">PERMISSÃO</th>
                    {CARGOS.map(cargo => (
                      <th key={cargo} className="text-center px-3 py-3 font-body text-xs font-semibold text-text-tertiary min-w-[110px]">
                        <div className="flex flex-col items-center gap-1">
                          <RoleBadge cargo={cargo} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULOS.map(modulo => {
                    const permsModulo = PERMISSOES.filter(p => p.modulo === modulo);
                    const isExpanded = expandedModulos.has(modulo);
                    return [
                      <tr key={`mod-${modulo}`} className="border-b border-surface-2 bg-surface-1/50 hover:bg-surface-1 cursor-pointer transition-colors" onClick={() => toggleModuloExpand(modulo)}>
                        <td className="px-6 py-2.5">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />}
                            <span className="font-body text-xs font-bold text-text-secondary tracking-wider uppercase">{modulo}</span>
                          </div>
                        </td>
                        {CARGOS.map(cargo => {
                          const allOn = permsModulo.every(p => matriz[cargo].has(p.id));
                          const someOn = permsModulo.some(p => matriz[cargo].has(p.id));
                          return (
                            <td key={cargo} className="text-center px-3 py-2.5">
                              <button
                                onClick={e => { e.stopPropagation(); toggleModulo(cargo, modulo); }}
                                disabled={cargo === 'administrador'}
                                className={`mx-auto w-5 h-5 rounded flex items-center justify-center transition-all ${
                                  cargo === 'administrador'
                                    ? 'bg-mos-700 cursor-not-allowed'
                                    : allOn
                                      ? 'bg-mos-700 hover:bg-mos-800'
                                      : someOn
                                        ? 'bg-mos-700/30 hover:bg-mos-700/50'
                                        : 'bg-surface-3 hover:bg-surface-3'
                                }`}
                              >
                                {(allOn || cargo === 'administrador') && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                {someOn && !allOn && cargo !== 'administrador' && <span className="w-2 h-0.5 bg-mos-700 rounded" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>,
                      ...isExpanded ? permsModulo.map(perm => (
                        <tr key={perm.id} className="border-b border-surface-2/50 hover:bg-surface-1/30 transition-colors">
                          <td className="pl-12 pr-6 py-2.5">
                            <p className="font-body text-xs font-medium text-text-primary">{perm.label}</p>
                            <p className="font-body text-[11px] text-text-tertiary mt-0.5">{perm.descricao}</p>
                          </td>
                          {CARGOS.map(cargo => (
                            <td key={cargo} className="text-center px-3 py-2.5">
                              <button
                                onClick={() => togglePermissao(cargo, perm.id)}
                                disabled={cargo === 'administrador'}
                                className={`mx-auto w-5 h-5 rounded flex items-center justify-center transition-all ${
                                  cargo === 'administrador' || matriz[cargo].has(perm.id)
                                    ? 'bg-mos-700 hover:bg-mos-800'
                                    : 'bg-surface-3 hover:bg-surface-2 border border-surface-3'
                                } ${cargo === 'administrador' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {(cargo === 'administrador' || matriz[cargo].has(perm.id)) && (
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      )) : [],
                    ];
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-surface-2 bg-surface-1 flex items-center justify-between">
              <p className="font-body text-xs text-text-tertiary">Alterações na matriz afetam todos os usuários do respectivo nível.</p>
              <button
                onClick={() => setMatriz({ ...MATRIZ_PADRAO })}
                className="font-body text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Restaurar padrão
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && [...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-surface-2 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-2 rounded w-3/4" />
                  <div className="h-3 bg-surface-2 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-surface-1 rounded-lg" />
            </div>
          ))}
          {!loading && filtered.map(usuario => (
            <div key={usuario.id} className={`card p-5 transition-all duration-200 hover:shadow-card-hover ${!usuario.ativo ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${AVATAR_COLORS[usuario.cargo]}`}>
                  {usuario.avatar_iniciais}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-sm text-text-primary truncate">{usuario.nome}</p>
                  <p className="font-data text-xs text-text-tertiary truncate">{usuario.email}</p>
                </div>
                <button
                  onClick={() => toggleUsuarioAtivo(usuario.id)}
                  className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                    usuario.ativo
                      ? 'bg-status-successLight text-status-success hover:bg-status-success hover:text-white'
                      : 'bg-surface-2 text-text-tertiary hover:bg-surface-3'
                  }`}
                  title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                >
                  {usuario.ativo ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <RoleBadge cargo={usuario.cargo} />
                <span className={`font-body text-xs font-medium ${usuario.ativo ? 'text-status-success' : 'text-text-tertiary'}`}>
                  {usuario.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="bg-surface-1 rounded-lg px-3 py-2">
                <p className="font-body text-[11px] text-text-tertiary leading-relaxed">{CARGO_DESCRICAO[usuario.cargo]}</p>
              </div>

              <div className="mt-3 flex items-center gap-1 flex-wrap">
                {[...matriz[usuario.cargo]].slice(0, 4).map(permId => {
                  const p = PERMISSOES.find(x => x.id === permId);
                  return p ? (
                    <span key={permId} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-2 rounded text-[10px] font-body text-text-tertiary">
                      <Check className="w-2.5 h-2.5 text-status-success" />
                      {p.label}
                    </span>
                  ) : null;
                })}
                {matriz[usuario.cargo].size > 4 && (
                  <span className="inline-flex px-1.5 py-0.5 bg-surface-2 rounded text-[10px] font-body text-text-tertiary">
                    +{matriz[usuario.cargo].size - 4} mais
                  </span>
                )}
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="col-span-3 text-center py-16">
              <Users className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="font-body text-sm text-text-tertiary">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NovoUsuarioModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

export default function Usuarios() {
  return (
    <AppLayout title="Usuários" subtitle="Gestão de usuários e permissões">
      <UsuariosContent />
    </AppLayout>
  );
}
