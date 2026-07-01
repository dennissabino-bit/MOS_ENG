import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DiariaFuncionario } from '../../lib/database.types';

interface AdicionarFuncionarioModalProps {
  planilhaId: string;
  ordem: number;
  onClose: () => void;
  onSaved: (f: DiariaFuncionario) => void;
}

const inputClass =
  'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

export function AdicionarFuncionarioModal({ planilhaId, ordem, onClose, onSaved }: AdicionarFuncionarioModalProps) {
  const [form, setForm] = useState({ nome: '', funcao: '', valor_dia: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return; }
    const valorDia = parseFloat(form.valor_dia.replace(',', '.'));
    if (isNaN(valorDia) || valorDia < 0) { setError('Informe um valor diário válido.'); return; }

    setSaving(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('diarias_funcionarios')
      .insert({
        planilha_id: planilhaId,
        nome: form.nome.trim(),
        funcao: form.funcao.trim(),
        valor_dia: valorDia,
        ordem,
      })
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao adicionar funcionário.');
      setSaving(false);
      return;
    }

    onSaved(data as DiariaFuncionario);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Adicionar Funcionário</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados do colaborador.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nome *</label>
            <input
              className={inputClass}
              placeholder="Ex: Antônio"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Função</label>
            <input
              className={inputClass}
              placeholder="Ex: Pedreiro, Ajudante, Mestre de Obras"
              value={form.funcao}
              onChange={e => set('funcao', e.target.value)}
            />
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor por Dia (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              placeholder="Ex: 200"
              value={form.valor_dia}
              onChange={e => set('valor_dia', e.target.value)}
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
            {saving ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
