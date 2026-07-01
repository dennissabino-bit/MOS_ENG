import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Fornecedor } from '../../lib/database.types';
import { CATEGORIAS_FORNECEDOR, ESTADOS_BR } from './fornecedorConstants';

interface EditarFornecedorModalProps {
  fornecedor: Fornecedor;
  onClose: () => void;
  onSaved: (item: Fornecedor) => void;
}

interface FormState {
  nome: string;
  categoria: string;
  contato: string;
  email: string;
  telefone: string;
  cnpj: string;
  cidade: string;
  estado: string;
  status: 'ativo' | 'inativo';
  nota: string;
  dados_bancarios: string;
}

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

export function EditarFornecedorModal({ fornecedor, onClose, onSaved }: EditarFornecedorModalProps) {
  const [form, setForm] = useState<FormState>({
    nome: fornecedor.nome,
    categoria: fornecedor.categoria,
    contato: fornecedor.contato,
    email: fornecedor.email,
    telefone: fornecedor.telefone,
    cnpj: fornecedor.cnpj,
    cidade: fornecedor.cidade ?? '',
    estado: fornecedor.estado ?? '',
    status: fornecedor.status as 'ativo' | 'inativo',
    nota: fornecedor.nota != null ? String(fornecedor.nota) : '',
    dados_bancarios: fornecedor.dados_bancarios ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return; }
    if (!form.contato.trim()) { setError('Nome do contato é obrigatório.'); return; }

    setSaving(true);
    setError(null);

    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      contato: form.contato.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      cnpj: form.cnpj.trim(),
      cidade: form.cidade.trim() || null,
      estado: form.estado || null,
      status: form.status,
      nota: form.nota !== '' ? parseFloat(form.nota) : null,
      dados_bancarios: form.dados_bancarios.trim() || null,
    };

    const { data, error: err } = await supabase
      .from('fornecedores')
      .update(payload)
      .eq('id', fornecedor.id)
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
            <h2 className="font-display font-bold text-base text-text-primary">Editar Fornecedor</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Altere os dados e clique em Salvar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome *</label>
            <input className={inputClass} placeholder="Ex: Construtora Silva Ltda" value={form.nome} onChange={e => set('nome', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Categoria</label>
              <select className={inputClass} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS_FORNECEDOR.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Status</label>
              <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value as 'ativo' | 'inativo')}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome do Contato *</label>
            <input className={inputClass} placeholder="Ex: João da Silva" value={form.contato} onChange={e => set('contato', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">E-mail</label>
              <input type="email" className={inputClass} placeholder="contato@empresa.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Telefone</label>
              <input className={inputClass} placeholder="(11) 99999-9999" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">CNPJ</label>
            <input className={inputClass} placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Avaliacao (1.0 – 5.0)</label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              className={inputClass}
              placeholder="Ex: 4.5"
              value={form.nota}
              onChange={e => set('nota', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Cidade</label>
              <input className={inputClass} placeholder="Ex: São Paulo" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Estado</label>
              <select className={inputClass} value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="">Selecionar</option>
                {ESTADOS_BR.map(uf => <option key={uf.sigla} value={uf.sigla}>{uf.sigla} — {uf.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Dados Bancários</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder={"Ex:\nBanco: Bradesco\nAgência: 1234-5\nConta: 00012345-6\nPIX: cnpj ou chave"}
              value={form.dados_bancarios}
              onChange={e => set('dados_bancarios', e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3">
              <p className="font-body text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
