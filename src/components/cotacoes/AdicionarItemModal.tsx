import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CotacaoItem } from '../../lib/database.types';

interface AdicionarItemModalProps {
  grupoId: string;
  proximaOrdem: number;
  fornecedorIds: string[];
  onClose: () => void;
  onSaved: (item: CotacaoItem) => void;
}

const UNIDADES = ['Un', 'M²', 'M³', 'M', 'Kg', 'T', 'L', 'Cx', 'Sc', 'Hr', 'Vb'];

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

function parsePtBr(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function AdicionarItemModal({ grupoId, proximaOrdem, fornecedorIds, onClose, onSaved }: AdicionarItemModalProps) {
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('Un');
  const [quantidade, setQuantidade] = useState('1');
  const [valorUnitario, setValorUnitario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = parsePtBr(quantidade);
  const vu  = parsePtBr(valorUnitario);
  const valorTotal = (qty != null && vu != null) ? qty * vu : null;

  async function handleSave() {
    if (!descricao.trim()) { setError('Descrição é obrigatória.'); return; }
    if (!qty || qty <= 0)  { setError('Quantidade deve ser maior que zero.'); return; }

    setSaving(true);
    setError(null);

    const { data: item, error: err } = await supabase
      .from('cotacao_itens')
      .insert({
        grupo_id: grupoId,
        descricao: descricao.trim(),
        unidade,
        quantidade: qty,
        valor_unitario: vu ?? null,
        ordem: proximaOrdem,
      })
      .select()
      .single();

    if (err || !item) {
      setError(err?.message || 'Erro ao adicionar item.');
      setSaving(false);
      return;
    }

    // Create blank proposals for each existing supplier
    if (fornecedorIds.length > 0) {
      await supabase.from('cotacao_propostas').insert(
        fornecedorIds.map(fid => ({
          grupo_id: grupoId,
          fornecedor_id: fid,
          item_id: item.id,
          preco_unitario: null,
        }))
      );
    }

    onSaved(item as CotacaoItem);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Novo Item</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Adicione um produto ou serviço à cotação.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Descrição *</label>
            <input
              className={inputClass}
              placeholder="Ex: Brita nº 1, Areia média..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Unidade de Medida</label>
              <select className={inputClass} value={unidade} onChange={e => setUnidade(e.target.value)}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Quantidade *</label>
              <input
                type="number"
                min="0.001"
                step="any"
                className={inputClass}
                placeholder="0"
                value={quantidade}
                onChange={e => setQuantidade(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Valor Unitário (R$)</label>
            <input
              type="number"
              min="0"
              step="any"
              className={inputClass}
              placeholder="0,00"
              value={valorUnitario}
              onChange={e => setValorUnitario(e.target.value)}
            />
          </div>

          {/* Valor Total preview */}
          <div className={`rounded-lg p-3 transition-colors ${valorTotal != null ? 'bg-surface-1 border border-surface-2' : 'bg-surface-1/50'}`}>
            <div className="flex items-center justify-between">
              <span className="font-body text-xs font-semibold text-text-tertiary tracking-wider">VALOR TOTAL</span>
              <span className={`font-data font-bold text-base ${valorTotal != null ? 'text-text-primary' : 'text-text-disabled'}`}>
                {valorTotal != null ? fmtCurrency(valorTotal) : '—'}
              </span>
            </div>
            {qty != null && vu != null && (
              <p className="font-data text-[10px] text-text-tertiary mt-0.5 text-right">
                {qty % 1 === 0 ? qty : qty.toFixed(3)} {unidade} × {fmtCurrency(vu)}
              </p>
            )}
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
            {saving ? 'Adicionando…' : 'Adicionar Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
