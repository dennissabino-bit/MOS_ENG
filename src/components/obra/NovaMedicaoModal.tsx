import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Medicao, EapCategoria, MedicaoStatus } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DatePickerInput } from '../ui/DatePickerInput';
import { NumberInput } from '../ui/NumberInput';

interface NovaMedicaoModalProps {
  obraId: string;
  onClose: () => void;
  onSaved: (item: Medicao) => void;
}

const CATEGORIAS: { value: EapCategoria; label: string }[] = [
  { value: 'infraestrutura', label: '1.0 Infraestrutura' },
  { value: 'superestrutura', label: '2.0 Superestrutura' },
  { value: 'instalacoes', label: '3.0 Instalações Prediais' },
  { value: 'acabamentos', label: '4.0 Acabamentos' },
];

const STATUS_OPTIONS: { value: MedicaoStatus; label: string }[] = [
  { value: 'a_medir', label: 'A Medir' },
  { value: 'pendente', label: 'Pendente (Aguardando Aprovação)' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'reprovada', label: 'Reprovada' },
];

const UNIDADES = ['m²', 'm', 'un', 'kg', 't', 'vb', 'cj', 'L', 'cx', 'hr'];

interface FormState {
  codigo: string;
  descricao: string;
  categoria: EapCategoria;
  unidade: string;
  qtd_orcada: string;
  qtd_medida: string;
  valor_unitario: number | null;
  status: MedicaoStatus;
  data_medicao: string;
  fornecedor_nome: string;
}

const INITIAL: FormState = {
  codigo: '',
  descricao: '',
  categoria: 'infraestrutura',
  unidade: 'm²',
  qtd_orcada: '',
  qtd_medida: '',
  valor_unitario: null,
  status: 'a_medir',
  data_medicao: '',
  fornecedor_nome: '',
};

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors';

export function NovaMedicaoModal({ obraId, onClose, onSaved }: NovaMedicaoModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const qtdOrc = parseFloat(form.qtd_orcada.replace(',', '.')) || 0;
  const qtdMed = form.qtd_medida ? (parseFloat(form.qtd_medida.replace(',', '.')) || 0) : null;
  const vUnit = form.valor_unitario ?? 0;
  const valorTotal = qtdMed != null && qtdMed > 0 ? qtdMed * vUnit : qtdOrc * vUnit;

  async function handleSave() {
    if (!form.codigo.trim() || !form.descricao.trim()) {
      setError('Código e descrição são obrigatórios.');
      return;
    }
    if (qtdOrc <= 0) {
      setError('Quantidade orçada deve ser maior que zero.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      obra_id: obraId,
      codigo: form.codigo.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      unidade: form.unidade,
      qtd_orcada: qtdOrc,
      qtd_medida: qtdMed,
      valor_unitario: vUnit,
      valor_total: valorTotal || null,
      status: form.status,
      data_medicao: form.data_medicao || null,
      fornecedor_nome: form.fornecedor_nome.trim() || null,
    };

    const { data, error: err } = await supabase
      .from('medicoes')
      .insert(payload)
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao salvar medição.');
      setSaving(false);
      return;
    }

    onSaved(data as Medicao);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Nova Medição</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados da medição e clique em Salvar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Código *</label>
              <input
                className={inputClass}
                placeholder="Ex: M-1.2"
                value={form.codigo}
                onChange={e => set('codigo', e.target.value)}
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
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Descrição *</label>
            <input
              className={inputClass}
              placeholder="Ex: Escavação de fundações"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Fornecedor</label>
            <input
              className={inputClass}
              placeholder="Nome do fornecedor (opcional)"
              value={form.fornecedor_nome}
              onChange={e => set('fornecedor_nome', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Unidade</label>
              <select
                className={`${inputClass} bg-white`}
                value={form.unidade}
                onChange={e => set('unidade', e.target.value)}
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Qtd. Orçada *</label>
              <NumberInput
                value={form.qtd_orcada}
                onChange={v => set('qtd_orcada', v)}
                placeholder="0"
                className={inputClass}
                allowDecimal
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Qtd. Medida</label>
              <NumberInput
                value={form.qtd_medida}
                onChange={v => set('qtd_medida', v)}
                placeholder="—"
                className={inputClass}
                allowDecimal
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor Unitário (R$)</label>
            <CurrencyInput
              value={form.valor_unitario}
              onChange={v => set('valor_unitario', v)}
              className={inputClass}
            />
          </div>

          {valorTotal > 0 && (
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="font-body text-xs text-text-tertiary">Valor Total Calculado</p>
              <p className="font-data font-bold text-lg text-mos-700 mt-0.5">
                {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Status</label>
              <select
                className={`${inputClass} bg-white`}
                value={form.status}
                onChange={e => set('status', e.target.value as MedicaoStatus)}
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data da Medição</label>
              <DatePickerInput
                value={form.data_medicao}
                onChange={v => set('data_medicao', v)}
                className={inputClass}
              />
            </div>
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
            {saving ? 'Salvando…' : 'Salvar Medição'}
          </button>
        </div>
      </div>
    </div>
  );
}
