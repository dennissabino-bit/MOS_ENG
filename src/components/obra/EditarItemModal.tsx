import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { EtapaEap, EapCategoria, EapNivel } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DatePickerInput } from '../ui/DatePickerInput';
import { NumberInput } from '../ui/NumberInput';

interface EditarItemModalProps {
  item: EtapaEap;
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

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors';

export function EditarItemModal({ item, onClose, onSaved }: EditarItemModalProps) {
  const [codigo, setCodigo] = useState(item.codigo);
  const [descricao, setDescricao] = useState(item.descricao);
  const [nivel, setNivel] = useState<EapNivel>(item.nivel);
  const [categoria, setCategoria] = useState<EapCategoria>(item.categoria);
  const [dataInicio, setDataInicio] = useState(item.data_inicio ?? '');
  const [dataFim, setDataFim] = useState(item.data_fim ?? '');
  const [unidade, setUnidade] = useState(item.unidade ?? 'm²');
  const [quantidade, setQuantidade] = useState(item.quantidade != null ? String(item.quantidade) : '');
  const [valorUnitario, setValorUnitario] = useState<number | null>(item.valor_unitario ?? null);
  const [valorTotalMacro, setValorTotalMacro] = useState<number | null>(
    nivel === 'macro' ? (item.valor_total ?? null) : null
  );
  const [isExtra, setIsExtra] = useState(item.is_extra);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qtd = parseFloat(quantidade.replace(',', '.')) || 0;
  const vUnit = valorUnitario ?? 0;
  const valorTotal = nivel === 'sub' ? qtd * vUnit : (valorTotalMacro ?? 0);

  async function handleSave() {
    if (!codigo.trim() || !descricao.trim()) {
      setError('Código e descrição são obrigatórios.');
      return;
    }
    if (nivel === 'sub' && !unidade.trim()) {
      setError('Unidade é obrigatória para sub-itens.');
      return;
    }
    if (nivel === 'sub' && qtd <= 0) {
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      nivel,
      categoria,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
      unidade: nivel === 'sub' ? unidade : null,
      quantidade: nivel === 'sub' ? (qtd || null) : null,
      valor_unitario: vUnit,
      valor_total: valorTotal,
      is_extra: isExtra,
    };

    const { data, error: err } = await supabase
      .from('etapas_eap')
      .update(payload)
      .eq('id', item.id)
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
            <h2 className="font-display font-bold text-base text-text-primary">Editar Item — Orçamento (EAP)</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Atualize os dados do item e clique em Salvar.</p>
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
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Nível</label>
              <select
                className={`${inputClass} bg-white`}
                value={nivel}
                onChange={e => setNivel(e.target.value as EapNivel)}
              >
                {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Descrição *</label>
            <input
              className={inputClass}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Categoria</label>
            <select
              className={`${inputClass} bg-white`}
              value={categoria}
              onChange={e => setCategoria(e.target.value as EapCategoria)}
            >
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data Início</label>
              <DatePickerInput value={dataInicio} onChange={setDataInicio} className={inputClass} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Data Fim</label>
              <DatePickerInput value={dataFim} onChange={setDataFim} className={inputClass} />
            </div>
          </div>

          {nivel === 'sub' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Unidade *</label>
                <select
                  className={`${inputClass} bg-white`}
                  value={unidade}
                  onChange={e => setUnidade(e.target.value)}
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Quantidade *</label>
                <NumberInput
                  value={quantidade}
                  onChange={setQuantidade}
                  placeholder="0"
                  className={inputClass}
                  allowDecimal
                />
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor Unitário</label>
                <CurrencyInput value={valorUnitario} onChange={setValorUnitario} className={inputClass} />
              </div>
            </div>
          )}

          {nivel === 'macro' && (
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor Total (R$)</label>
              <CurrencyInput value={valorTotalMacro} onChange={setValorTotalMacro} className={inputClass} />
            </div>
          )}

          {valorTotal > 0 && nivel === 'sub' && (
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
              id="is_extra_edit"
              checked={isExtra}
              onChange={e => setIsExtra(e.target.checked)}
              className="w-4 h-4 accent-mos-700"
            />
            <label htmlFor="is_extra_edit" className="font-body text-sm text-text-secondary cursor-pointer">
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
            {saving ? 'Salvando…' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
