import { useState } from 'react';
import { X, Tag, Plus, Pencil, Trash2, Loader2, Check, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EnergiaTipoSala } from '../types';

interface Props {
  tipos: EnergiaTipoSala[];
  onClose: () => void;
  onSaved: () => void;
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function TiposSalaModal({ tipos, onClose, onSaved }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [addNome, setAddNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function startEdit(tipo: EnergiaTipoSala) {
    setEditingId(tipo.id);
    setEditNome(tipo.nome);
    setError('');
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNome('');
    setError('');
  }

  async function handleSaveEdit(tipo: EnergiaTipoSala) {
    const nome = editNome.trim();
    if (!nome) { setError('Nome não pode ser vazio'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase
      .from('energia_tipos_sala')
      .update({ nome })
      .eq('id', tipo.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditingId(null);
    onSaved();
  }

  async function handleAdd() {
    const nome = addNome.trim();
    if (!nome) return;
    setSaving(true);
    setError('');
    const slug = slugify(nome);
    const maxOrdem = tipos.length ? Math.max(...tipos.map(t => t.ordem)) + 1 : 1;
    const { error: err } = await supabase
      .from('energia_tipos_sala')
      .insert({ nome, slug, ordem: maxOrdem });
    setSaving(false);
    if (err) {
      setError(err.message.includes('unique') ? 'Já existe um tipo com esse nome/slug.' : err.message);
      return;
    }
    setAddNome('');
    onSaved();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from('energia_tipos_sala').delete().eq('id', id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center">
              <Tag className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">Tipos de Sala</h2>
              <p className="font-body text-xs text-text-tertiary">Gerencie os tipos disponíveis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-surface-2">
          {tipos.length === 0 && (
            <div className="p-8 text-center">
              <Tag className="w-8 h-8 text-text-disabled mx-auto mb-2" />
              <p className="font-body text-sm text-text-tertiary">Nenhum tipo cadastrado</p>
            </div>
          )}
          {tipos.map(tipo => (
            <div key={tipo.id} className="px-5 py-3 flex items-center gap-3 group hover:bg-surface-1 transition-colors">
              <GripVertical className="w-4 h-4 text-text-disabled flex-shrink-0" />

              {editingId === tipo.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    value={editNome}
                    onChange={e => setEditNome(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(tipo); if (e.key === 'Escape') cancelEdit(); }}
                    className="flex-1 px-2.5 py-1.5 bg-surface-0 border border-mos-700 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 transition-colors"
                  />
                  <button
                    onClick={() => handleSaveEdit(tipo)}
                    disabled={saving}
                    className="p-1.5 rounded-lg bg-mos-700 text-white hover:bg-mos-700/90 transition-colors flex-shrink-0"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-text-primary">{tipo.nome}</p>
                    <p className="font-data text-[10px] text-text-disabled">{tipo.slug}</p>
                  </div>

                  {confirmDeleteId === tipo.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-body text-xs text-status-error">Confirmar?</span>
                      <button
                        onClick={() => handleDelete(tipo.id)}
                        disabled={deletingId === tipo.id}
                        className="px-2 py-1 rounded text-xs font-semibold bg-status-error text-white hover:bg-status-error/90 transition-colors"
                      >
                        {deletingId === tipo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded text-xs font-semibold bg-surface-2 text-text-secondary hover:bg-surface-3 transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => startEdit(tipo)}
                        className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors text-text-tertiary hover:text-text-primary"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(tipo.id)}
                        className="p-1.5 rounded-lg hover:bg-status-errorLight transition-colors text-text-tertiary hover:text-status-error"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="px-5 py-4 border-t border-surface-2 bg-surface-1 flex-shrink-0">
          {error && (
            <p className="font-body text-xs text-status-error mb-2">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={addNome}
              onChange={e => setAddNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Nome do novo tipo..."
              className="flex-1 px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !addNome.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-mos-700 text-white font-body font-semibold text-sm rounded-lg disabled:opacity-50 transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
