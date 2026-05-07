import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Fornecedor {
  id: string;
  nome: string;
  categoria: string;
  status: string;
  contato: string;
  email: string;
  cnpj: string;
  telefone: string;
}

interface NovoFornecedorModalProps {
  onClose: () => void;
  onSaved: (item: Fornecedor) => void;
}

const CATEGORIAS = [
  'Materiais de Construção',
  'Mão de Obra',
  'Equipamentos',
  'Elétrica e Hidráulica',
  'Estrutura e Fundação',
  'Acabamentos',
  'Impermeabilização',
  'Esquadrias',
  'Pintura',
  'Outros',
];

interface FormState {
  nome: string;
  categoria: string;
  contato: string;
  email: string;
  telefone: string;
  cnpj: string;
  status: 'ativo' | 'inativo';
}

const INITIAL: FormState = {
  nome: '',
  categoria: 'Materiais de Construção',
  contato: '',
  email: '',
  telefone: '',
  cnpj: '',
  status: 'ativo',
};

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

export function NovoFornecedorModal({ onClose, onSaved }: NovoFornecedorModalProps) {
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
    if (!form.contato.trim()) {
      setError('Nome do contato é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      contato: form.contato.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      cnpj: form.cnpj.trim(),
      status: form.status,
    };

    const { data, error: err } = await supabase
      .from('fornecedores')
      .insert(payload)
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao salvar fornecedor.');
      setSaving(false);
      return;
    }

    onSaved(data as Fornecedor);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Novo Fornecedor</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados e clique em Salvar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome *</label>
            <input
              className={inputClass}
              placeholder="Ex: Construtora Silva Ltda"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Categoria</label>
              <select
                className={inputClass}
                value={form.categoria}
                onChange={e => set('categoria', e.target.value)}
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={e => set('status', e.target.value as 'ativo' | 'inativo')}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome do Contato *</label>
            <input
              className={inputClass}
              placeholder="Ex: João da Silva"
              value={form.contato}
              onChange={e => set('contato', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">E-mail</label>
              <input
                type="email"
                className={inputClass}
                placeholder="contato@empresa.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Telefone</label>
              <input
                className={inputClass}
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={e => set('telefone', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">CNPJ</label>
            <input
              className={inputClass}
              placeholder="00.000.000/0000-00"
              value={form.cnpj}
              onChange={e => set('cnpj', e.target.value)}
            />
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
            {saving ? 'Salvando…' : 'Salvar Fornecedor'}
          </button>
        </div>
      </div>
    </div>
  );
}
