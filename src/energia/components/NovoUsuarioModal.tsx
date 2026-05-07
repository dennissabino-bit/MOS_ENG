import { useState } from 'react';
import { X, UserPlus, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EnergiaUsuario, EnergiaUnidade, EnergiaPerfil } from '../types';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  unidades: EnergiaUnidade[];
  initial?: EnergiaUsuario;
  mode?: 'edit' | 'create' | 'senha';
}

export function NovoUsuarioModal({ onClose, onSaved, unidades, initial, mode = 'create' }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [perfil, setPerfil] = useState<EnergiaPerfil>(initial?.perfil ?? 'gerente');
  const [unidadeId, setUnidadeId] = useState(initial?.unidade_id ?? '');
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isSenhaMode = mode === 'senha';
  const isEdit = mode === 'edit';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (isSenhaMode) {
      if (!senha.trim()) { setError('Nova senha é obrigatória'); return; }
      if (senha !== confirmarSenha) { setError('As senhas não coincidem'); return; }
      if (senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
      setSaving(true);
      const { error: err } = await supabase
        .from('energia_usuarios')
        .update({ senha_hash: senha })
        .eq('id', initial!.id);
      if (err) { setError(err.message); setSaving(false); return; }
      setSaving(false);
      onSaved();
      return;
    }

    if (!nome.trim()) { setError('Nome é obrigatório'); return; }
    if (!email.trim()) { setError('Email é obrigatório'); return; }
    if (!isEdit && !senha.trim()) { setError('Senha é obrigatória'); return; }
    if (!isEdit && senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (perfil === 'gerente' && !unidadeId) { setError('Gerente deve ter uma unidade vinculada'); return; }

    setSaving(true);

    if (isEdit && initial?.id) {
      const payload: Record<string, unknown> = {
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        perfil,
        unidade_id: perfil === 'gerente' ? unidadeId : null,
        ativo,
      };
      if (senha.trim()) {
        if (senha !== confirmarSenha) { setError('As senhas não coincidem'); setSaving(false); return; }
        payload.senha_hash = senha;
      }
      const { error: err } = await supabase.from('energia_usuarios').update(payload).eq('id', initial.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('energia_usuarios').insert({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha_hash: senha,
        perfil,
        unidade_id: perfil === 'gerente' ? unidadeId : null,
        ativo,
      });
      if (err) {
        setError(err.code === '23505' ? 'Este email já está em uso' : err.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  if (isSenhaMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-sm overflow-hidden">
          <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-status-warningLight flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-status-warning" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-text-primary">Alterar Senha</h2>
                <p className="font-body text-xs text-text-tertiary">{initial?.nome}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-status-errorLight border border-status-error/20">
                <p className="font-body text-xs text-status-error">{error}</p>
              </div>
            )}
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">NOVA SENHA *</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                autoFocus
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">CONFIRMAR SENHA *</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar Senha
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">{isEdit ? 'Editar' : 'Novo'} Usuário</h2>
              <p className="font-body text-xs text-text-tertiary">Preencha os dados do usuário</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-status-errorLight border border-status-error/20">
              <p className="font-body text-xs text-status-error">{error}</p>
            </div>
          )}

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">NOME COMPLETO *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              autoFocus
              required
              className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">EMAIL *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                {isEdit ? 'NOVA SENHA' : 'SENHA *'}
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder={isEdit ? 'Em branco = sem alteração' : 'Mínimo 6 caracteres'}
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">CONFIRMAR</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">PERFIL *</label>
              <select
                value={perfil}
                onChange={e => { setPerfil(e.target.value as EnergiaPerfil); if (e.target.value === 'admin') setUnidadeId(''); }}
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              >
                <option value="gerente">Gerente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">STATUS</label>
              <select
                value={ativo ? 'ativo' : 'inativo'}
                onChange={e => setAtivo(e.target.value === 'ativo')}
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {perfil === 'gerente' && (
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">UNIDADE *</label>
              <select
                value={unidadeId}
                onChange={e => setUnidadeId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
              >
                <option value="">Selecione uma unidade</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              <p className="font-body text-[10px] text-text-tertiary mt-1">O gerente só verá dados desta unidade.</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
