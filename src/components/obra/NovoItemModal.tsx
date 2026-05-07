import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { EapCategoria, EapNivel } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DatePickerInput } from '../ui/DatePickerInput';
import { NumberInput } from '../ui/NumberInput';

interface NovoItemModalProps {
  obraId: string;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIAS: { value: EapCategoria; label: string }[] = [
  { value: 'infraestrutura', label: '1.0 Infraestrutura' },
  { value: 'superestrutura', label: '2.0 Superestrutura' },
  { value: 'instalacoes', label: '3.0 Instalações Prediais' },
  { value: 'acabamentos', label: '4.0 Acabamentos' },
  { value: 'extra', label: 'E.0 Custo Extraordinário' },
];

const NIVEIS: { value: EapNivel; label: string }[] = [
  { value: 'macro', label: 'Macro (Etapa EAP Nível 1)' },
  { value: 'sub', label: 'Sub-item (Nível 2)' },
];

const UNIDADES = ['m²', 'm', 'un', 'kg', 't', 'vb', 'cj', 'L', 'cx', 'hr'];

interface FormState {
  codigo: string;
  descricao: string;
  nivel: EapNivel;
  categoria: EapCategoria;
  data_inicio: string;
  data_fim: string;
  unidade: string;
  quantidade: string;
  valor_unitario: number | null;
  valor_total_macro: number | null;
  is_extra: boolean;
}

const INITIAL: FormState = {
  codigo: '',
  descricao: '',
  nivel: 'sub',
  categoria: 'infraestrutura',
  data_inicio: '',
  data_fim: '',
  unidade: 'm²',
  quantidade: '',
  valor_unitario: null,
  valor_total_macro: null,
  is_extra: false,
};

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors';

export function NovoItemModal({ obraId, onClose, onSaved }: NovoItemModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const qtd = parseFloat(form.quantidade.replace(',', '.')) || 0;
  const vUnit = form.valor_unitario ?? 0;
  const valorTotal = form.nivel === 'sub' ? qtd * vUnit : (form.valor_total_macro ?? 0);

  async function handleSave() {
    if (!form.codigo.trim() || !form.descricao.trim()) {
      setError('Código e descrição são obrigatórios.');
      return;
    }
    if (form.nivel === 'sub' && !form.unidade.trim()) {
      setError('Unidade é obrigatória para sub-itens.');
      return;
    }
    if (form.nivel === 'sub' && qtd <= 0) {
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      obra_id: obraId,
      codigo: form.codigo.trim(),
      descricao: form.descricao.trim(),
      nivel: form.nivel,
      categoria: form.categoria,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      unidade: form.nivel === 'sub' ? form.unidade : null,
      quantidade: form.nivel === 'sub' ? (qtd || null) : null,
      valor_unitario: vUnit,
      valor_total: valorTotal,
      is_extra: form.is_extra,
    };

    const { data, error: err } = await supabase
      .from('etapas_eap')
      .insert(payload)
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao salvar item.');
      setSaving(false);
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Novo Item — Orçamento (EAP)</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados do novo item e clique em Salvar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Código (EAP) *</label>
              <input
                className={inputClass}
                placeholder="Ex: 1.2"
                value={form.codigo}
                onChange={e => set('codigo', e.target.value)}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nível</label>
              <select
                className={`${inputClass} bg-white`}
                value={form.nivel}
                onChange={e => set('nivel', e.target.value as EapNivel)}
              >
                {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Descrição *</label>
            <input
              className={inputClass}
              placeholder="Ex: Fundações em estaca"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Categoria</label>
            <select
              className={`${inputClass} bg-white`}
              value={form.categoria}
              onChange={e => set('categoria', e.target.value as EapCategoria)}
            >
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data Início</label>
              <DatePickerInput
                value={form.data_inicio}
                onChange={v => set('data_inicio', v)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data Fim</label>
              <DatePickerInput
                value={form.data_fim}
                onChange={v => set('data_fim', v)}
                className={inputClass}
              />
            </div>
          </div>

          {form.nivel === 'sub' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Unidade *</label>
                <select
                  className={`${inputClass} bg-white`}
                  value={form.unidade}
                  onChange={e => set('unidade', e.target.value)}
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Quantidade *</label>
                <NumberInput
                  value={form.quantidade}
                  onChange={v => set('quantidade', v)}
                  placeholder="0"
                  className={inputClass}
                  allowDecimal
                />
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor Unitário</label>
                <CurrencyInput
                  value={form.valor_unitario}
                  onChange={v => set('valor_unitario', v)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {form.nivel === 'macro' && (
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor Total (R$)</label>
              <CurrencyInput
                value={form.valor_total_macro}
                onChange={v => set('valor_total_macro', v)}
                className={inputClass}
              />
            </div>
          )}

          {valorTotal > 0 && form.nivel === 'sub' && (
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="font-body text-xs text-text-tertiary">Valor Total Calculado</p>
              <p className="font-data font-bold text-lg text-mos-700 mt-0.5">
                {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_extra"
              checked={form.is_extra}
              onChange={e => set('is_extra', e.target.checked)}
              className="w-4 h-4 accent-mos-700"
            />
            <label htmlFor="is_extra" className="font-body text-sm text-text-secondary cursor-pointer">
              Variação aprovada (Custo Extraordinário)
            </label>
          </div>

          {error && (
            <div className="rounded-md bg-status-errorLight px-4 py-3">
              <p className="font-body text-sm text-status-error">{error}</p>
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
            {saving ? 'Salvando…' : 'Salvar Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
