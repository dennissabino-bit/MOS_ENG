import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { CotacaoGrupo } from '../../lib/database.types';

interface NovaCotacaoModalProps {
  onClose: () => void;
  onSaved?: (item: CotacaoGrupo) => void;
}

interface ObraOption { id: string; nome: string; codigo: string; }

const CATEGORIAS = [
  'Estrutura', 'Infraestrutura', 'Superestrutura', 'Instalações',
  'Acabamentos', 'Elétrica', 'Hidráulica', 'Pavimentação', 'Equipamentos', 'Outros',
];

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';

export function NovaCotacaoModal({ onClose, onSaved }: NovaCotacaoModalProps) {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [obraId, setObraId] = useState('');
  const [categoria, setCategoria] = useState('');
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingObras, setLoadingObras] = useState(true);

  useEffect(() => {
    supabase.from('obras').select('id, nome, codigo').order('nome').then(({ data }) => {
      if (data) setObras(data);
      setLoadingObras(false);
    });
  }, []);

  async function handleSave() {
    if (!titulo.trim()) { setError('Título é obrigatório.'); return; }
    setSaving(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('cotacao_grupos')
      .insert({
        titulo: titulo.trim(),
        obra_id: obraId || null,
        categoria: categoria || null,
        status: 'aberta',
      })
      .select('*, obras(nome, codigo)')
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao criar cotação.');
      setSaving(false);
      return;
    }

    if (onSaved) onSaved(data as CotacaoGrupo);
    onClose();
    navigate(`/cotacoes/${data.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Nova Cotação</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Crie um grupo de cotação para comparar fornecedores.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Título *</label>
            <input
              className={inputClass}
              placeholder="Ex: Brita e Areia, Materiais Elétricos..."
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Obra</label>
            {loadingObras ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                <span className="font-body text-xs text-text-tertiary">Carregando obras...</span>
              </div>
            ) : (
              <select className={inputClass} value={obraId} onChange={e => setObraId(e.target.value)}>
                <option value="">Nenhuma obra vinculada</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nome} ({o.codigo})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="font-body text-xs font-semibold text-text-secondary mb-1 block">Categoria</label>
            <select className={inputClass} value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Sem categoria</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
            {saving ? 'Criando…' : 'Criar e Abrir'}
          </button>
        </div>
      </div>
    </div>
  );
}
