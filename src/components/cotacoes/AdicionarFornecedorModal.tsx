import { useState, useEffect } from 'react';
import { X, Loader2, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Fornecedor, CotacaoProposta, CotacaoItem } from '../../lib/database.types';

interface AdicionarFornecedorModalProps {
  grupoId: string;
  itens: CotacaoItem[];
  fornecedorIdsJaAdicionados: string[];
  onClose: () => void;
  onSaved: (fornecedor: Fornecedor, propostas: CotacaoProposta[]) => void;
}

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

export function AdicionarFornecedorModal({ grupoId, itens, fornecedorIdsJaAdicionados, onClose, onSaved }: AdicionarFornecedorModalProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('fornecedores')
      .select('*')
      .eq('status', 'ativo')
      .order('nome')
      .then(({ data }) => {
        if (data) setFornecedores((data as Fornecedor[]).filter(f => !fornecedorIdsJaAdicionados.includes(f.id)));
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!selectedId) { setError('Selecione um fornecedor.'); return; }
    setSaving(true);
    setError(null);

    const fornecedor = fornecedores.find(f => f.id === selectedId)!;

    const rows = itens.map(item => ({
      grupo_id: grupoId,
      fornecedor_id: selectedId,
      item_id: item.id,
      preco_unitario: null,
    }));

    const { data: propostas, error: err } = await supabase
      .from('cotacao_propostas')
      .insert(rows)
      .select();

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    onSaved(fornecedor, (propostas ?? []) as CotacaoProposta[]);
    onClose();
  }

  const disponiveis = fornecedores;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Adicionar Fornecedor</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Selecione um fornecedor ativo para incluir no comparativo.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
            </div>
          ) : disponiveis.length === 0 ? (
            <div className="text-center py-6">
              <Building className="w-8 h-8 text-text-disabled mx-auto mb-2" />
              <p className="font-body text-sm text-text-tertiary">Todos os fornecedores ativos já foram adicionados.</p>
            </div>
          ) : (
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Fornecedor *</label>
              <select className={inputClass} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">Selecionar fornecedor...</option>
                {disponiveis.map(f => (
                  <option key={f.id} value={f.id}>{f.nome} — {f.categoria}</option>
                ))}
              </select>
            </div>
          )}

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
          {disponiveis.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving || !selectedId}
              className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Adicionando…' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
