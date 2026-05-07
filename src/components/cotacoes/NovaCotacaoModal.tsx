import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DatePickerInput } from '../ui/DatePickerInput';
import type { Cotacao, CotacaoStatus } from '../../lib/database.types';

interface NovaCotacaoModalProps {
  onClose: () => void;
  onSaved: (item: Cotacao) => void;
}

interface ObraOption { id: string; nome: string; codigo: string; }
interface FornecedorOption { id: string; nome: string; }

const STATUS_OPTIONS: { value: CotacaoStatus; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'fechada', label: 'Fechada' },
  { value: 'cancelada', label: 'Cancelada' },
];

interface FormState {
  descricao: string;
  obra_id: string;
  fornecedor_id: string;
  valor: number | null;
  status: CotacaoStatus;
  data_abertura: string;
  data_fechamento: string;
}

const INITIAL: FormState = {
  descricao: '',
  obra_id: '',
  fornecedor_id: '',
  valor: null,
  status: 'aberta',
  data_abertura: new Date().toISOString().slice(0, 10),
  data_fechamento: '',
};

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

export function NovaCotacaoModal({ onClose, onSaved }: NovaCotacaoModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOptions() {
      const [obrasRes, fornsRes] = await Promise.all([
        supabase.from('obras').select('id, nome, codigo').order('nome'),
        supabase.from('fornecedores').select('id, nome').order('nome'),
      ]);
      if (obrasRes.data) setObras(obrasRes.data);
      if (fornsRes.data) setFornecedores(fornsRes.data);
      setLoading(false);
    }
    fetchOptions();
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.descricao.trim()) {
      setError('Descrição é obrigatória.');
      return;
    }
    if (!form.valor || form.valor <= 0) {
      setError('Valor deve ser maior que zero.');
      return;
    }
    if (!form.data_abertura) {
      setError('Data de abertura é obrigatória.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      descricao: form.descricao.trim(),
      obra_id: form.obra_id || null,
      fornecedor_id: form.fornecedor_id || null,
      valor: form.valor,
      status: form.status,
      data_abertura: form.data_abertura,
      data_fechamento: form.data_fechamento || null,
    };

    const { data, error: err } = await supabase
      .from('cotacoes')
      .insert(payload)
      .select('*, obras(nome, codigo), fornecedores(nome)')
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao salvar cotação.');
      setSaving(false);
      return;
    }

    onSaved(data as Cotacao);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Nova Cotação</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados e clique em Salvar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
            </div>
          ) : (
            <>
              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Descrição *</label>
                <input
                  className={inputClass}
                  placeholder="Ex: Cotação de materiais elétricos"
                  value={form.descricao}
                  onChange={e => set('descricao', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Obra</label>
                  <select
                    className={inputClass}
                    value={form.obra_id}
                    onChange={e => set('obra_id', e.target.value)}
                  >
                    <option value="">Selecionar obra...</option>
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>{o.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Fornecedor</label>
                  <select
                    className={inputClass}
                    value={form.fornecedor_id}
                    onChange={e => set('fornecedor_id', e.target.value)}
                  >
                    <option value="">Selecionar fornecedor...</option>
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor (R$) *</label>
                <CurrencyInput
                  value={form.valor}
                  onChange={v => set('valor', v)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Status</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={e => set('status', e.target.value as CotacaoStatus)}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data de Abertura *</label>
                  <DatePickerInput
                    value={form.data_abertura}
                    onChange={v => set('data_abertura', v)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data de Fechamento</label>
                <DatePickerInput
                  value={form.data_fechamento}
                  onChange={v => set('data_fechamento', v)}
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 px-4 py-3">
                  <p className="font-body text-sm text-red-600">{error}</p>
                </div>
              )}
            </>
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
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar Cotação'}
          </button>
        </div>
      </div>
    </div>
  );
}
