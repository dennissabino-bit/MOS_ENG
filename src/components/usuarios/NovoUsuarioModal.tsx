import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserCargo, Usuario } from '../../lib/database.types';

interface NovoUsuarioModalProps {
  onClose: () => void;
  onSaved: (item: Usuario) => void;
}

const CARGO_LABELS: Record<UserCargo, string> = {
  master:     'Master',
  gestor:     'Gestor',
  engenheiro: 'Engenheiro',
  comprador:  'Comprador',
};

const CARGOS: UserCargo[] = ['master', 'gestor', 'engenheiro', 'comprador'];

interface FormState {
  nome: string;
  email: string;
  cargo: UserCargo;
  ativo: boolean;
}

const INITIAL: FormState = {
  nome:  '',
  email: '',
  cargo: 'gestor',
  ativo: true,
};

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

function gerarIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function NovoUsuarioModal({ onClose, onSaved }: NovoUsuarioModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('E-mail válido é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      nome:           form.nome.trim(),
      email:          form.email.trim().toLowerCase(),
      cargo:          form.cargo,
      ativo:          form.ativo,
      avatar_iniciais: gerarIniciais(form.nome),
    };

    const { data, error: err } = await supabase
      .from('usuarios')
      .insert(payload)
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao salvar usuário.');
      setSaving(false);
      return;
    }

    onSaved(data as Usuario);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Novo Usuário</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados e clique em Salvar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome completo *</label>
            <input
              className={inputClass}
              placeholder="Ex: João da Silva"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">E-mail *</label>
            <input
              type="email"
              className={inputClass}
              placeholder="joao@empresa.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Cargo / Nível</label>
              <select
                className={inputClass}
                value={form.cargo}
                onChange={e => set('cargo', e.target.value as UserCargo)}
              >
                {CARGOS.map(c => (
                  <option key={c} value={c}>{CARGO_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Status</label>
              <select
                className={inputClass}
                value={form.ativo ? 'ativo' : 'inativo'}
                onChange={e => set('ativo', e.target.value === 'ativo')}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3">
              <p className="font-body text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar Usuário'}
          </button>
        </div>
      </div>
    </div>
  );
}
