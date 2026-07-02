import { useState, useEffect, useMemo } from 'react';
import {
  Users, Truck, GitBranch, Plus, ChevronDown, ChevronRight,
  Pencil, Trash2, Loader2, Check, X, Archive, ArchiveRestore,
  Building2, MapPin, Calendar, Search, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { UsuariosContent } from './Usuarios';
import { FornecedoresContent } from './Fornecedores';
import { supabase } from '../lib/supabase';
import { useObras } from '../hooks/useObras';
import { formatDate, formatCurrencyFull } from '../lib/formatters';
import { StatusBadge } from '../components/ui/Badge';
import type { Grupo, Filial, Obra, Fornecedor } from '../lib/database.types';

// ─── Filiais Tab ──────────────────────────────────────────────────────────────

interface GrupoComFiliais extends Grupo {
  filiais: Filial[];
}

function GrupoRow({
  grupo,
  searchActive,
  onEditGrupo,
  onDeleteGrupo,
  onAddFilial,
  onEditFilial,
  onDeleteFilial,
  onToggleFilial,
}: {
  grupo: GrupoComFiliais;
  searchActive: boolean;
  onEditGrupo: (g: Grupo) => void;
  onDeleteGrupo: (id: string) => void;
  onAddFilial: (grupoId: string) => void;
  onEditFilial: (f: Filial) => void;
  onDeleteFilial: (id: string) => void;
  onToggleFilial: (f: Filial) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const ativas = grupo.filiais.filter(f => f.ativa).length;

  return (
    <div className="border border-surface-2 rounded-xl overflow-hidden">
      {/* Grupo header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-surface-1 hover:bg-surface-2 transition-colors">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className={`flex items-center justify-center w-4 h-4 flex-shrink-0 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}>
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-md bg-mos-700 text-white font-data font-bold text-xs tracking-wider flex-shrink-0">
              {grupo.codigo}
            </span>
            <span className="font-body font-semibold text-sm text-text-primary truncate">{grupo.nome}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-surface-3 font-data text-[11px] font-semibold text-text-secondary">
              {grupo.filiais.length}
            </span>
            {ativas < grupo.filiais.length && (
              <span className="font-body text-[10px] text-text-tertiary">
                ({grupo.filiais.length - ativas} inativa{grupo.filiais.length - ativas !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onAddFilial(grupo.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-body text-xs font-medium text-text-secondary hover:text-mos-700 hover:bg-mos-50 border border-transparent hover:border-mos-700/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Filial
          </button>
          <div className="w-px h-4 bg-surface-3 mx-0.5" />
          <button
            onClick={() => onEditGrupo(grupo)}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Editar grupo"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteGrupo(grupo.id)}
            className="p-1.5 rounded-md text-text-tertiary hover:text-status-error hover:bg-status-errorLight transition-colors"
            title="Excluir grupo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filiais list */}
      {expanded && (
        <div className="divide-y divide-surface-2 bg-white">
          {grupo.filiais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <GitBranch className="w-6 h-6 text-text-disabled" />
              <p className="font-body text-xs text-text-disabled">Nenhuma filial cadastrada</p>
              <button
                onClick={() => onAddFilial(grupo.id)}
                className="flex items-center gap-1 font-body text-xs text-mos-700 hover:underline"
              >
                <Plus className="w-3 h-3" />
                Adicionar filial
              </button>
            </div>
          ) : (
            grupo.filiais.map(filial => (
              <div
                key={filial.id}
                className={`flex items-center gap-3 pl-11 pr-4 py-3 transition-colors group ${
                  filial.ativa ? 'hover:bg-surface-1/60' : 'hover:bg-surface-1/40 opacity-70'
                }`}
              >
                {/* Connector line visual */}
                <div className="relative flex-shrink-0 w-4 h-full">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-surface-3" />
                </div>

                <span className={`inline-flex items-center justify-center min-w-[3rem] h-5 px-1.5 rounded font-data font-bold text-[10px] tracking-widest flex-shrink-0 border ${
                  filial.ativa
                    ? 'bg-surface-1 text-text-secondary border-surface-3'
                    : 'bg-surface-2 text-text-disabled border-surface-2 line-through'
                }`}>
                  {filial.codigo}
                </span>

                <span className={`font-body text-sm flex-1 truncate ${
                  filial.ativa ? 'text-text-primary' : 'text-text-disabled line-through'
                }`}>
                  {filial.descricao}
                </span>

                {!filial.ativa && (
                  <span className="font-body text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-1.5 py-0.5 bg-surface-2 rounded">
                    Inativa
                  </span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onToggleFilial(filial)}
                    className={`p-1 rounded transition-colors ${
                      filial.ativa
                        ? 'text-text-tertiary hover:text-status-warning hover:bg-status-warningLight'
                        : 'text-text-tertiary hover:text-status-success hover:bg-status-successLight'
                    }`}
                    title={filial.ativa ? 'Desativar filial' : 'Ativar filial'}
                  >
                    {filial.ativa
                      ? <ToggleRight className="w-3.5 h-3.5" />
                      : <ToggleLeft className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button
                    onClick={() => onEditFilial(filial)}
                    className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                    title="Editar filial"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteFilial(filial.id)}
                    className="p-1 rounded text-text-tertiary hover:text-status-error hover:bg-status-errorLight transition-colors"
                    title="Excluir filial"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type GrupoForm = { codigo: string; nome: string };
type FilialForm = { codigo: string; descricao: string; ativa: boolean; grupoId: string };

function GrupoModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Grupo;
  onSave: (f: GrupoForm) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<GrupoForm>({ codigo: initial?.codigo ?? '', nome: initial?.nome ?? '' });
  const valid = form.codigo.trim() !== '' && form.nome.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-2 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-text-primary">
            {initial ? 'Editar Grupo' : 'Novo Grupo'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-body text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
              Código
            </label>
            <input
              autoFocus
              value={form.codigo}
              onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
              placeholder="Ex: 02"
              className="w-full px-3 py-2 bg-surface-1 border border-surface-2 rounded-lg font-data text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
              Nome do Grupo
            </label>
            <input
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Grupo Norte"
              className="w-full px-3 py-2 bg-surface-1 border border-surface-2 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-1 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!valid || saving}
            className="flex-1 flex items-center justify-center gap-2 btn-primary disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilialModal({
  initial,
  grupos,
  defaultGrupoId,
  onSave,
  onClose,
  saving,
}: {
  initial?: Filial;
  grupos: Grupo[];
  defaultGrupoId?: string;
  onSave: (f: FilialForm) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FilialForm>({
    codigo: initial?.codigo ?? '',
    descricao: initial?.descricao ?? '',
    ativa: initial?.ativa ?? true,
    grupoId: initial?.grupo_id ?? defaultGrupoId ?? (grupos[0]?.id ?? ''),
  });
  const valid = form.codigo.trim() !== '' && form.descricao.trim() !== '' && form.grupoId !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-2 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-text-primary">
            {initial ? 'Editar Filial' : 'Nova Filial'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-body text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
              Grupo
            </label>
            <select
              value={form.grupoId}
              onChange={e => setForm(p => ({ ...p, grupoId: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-1 border border-surface-2 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            >
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.codigo} — {g.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-body text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
              Código da Filial
            </label>
            <input
              autoFocus
              value={form.codigo}
              onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
              placeholder="Ex: 0401"
              className="w-full px-3 py-2 bg-surface-1 border border-surface-2 rounded-lg font-data text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
              Descrição
            </label>
            <input
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: Filial Curitiba"
              className="w-full px-3 py-2 bg-surface-1 border border-surface-2 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setForm(p => ({ ...p, ativa: !p.ativa }))}
              className={`w-9 h-5 rounded-full transition-colors ${form.ativa ? 'bg-mos-700' : 'bg-surface-3'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${form.ativa ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="font-body text-sm text-text-secondary">Filial ativa</span>
          </label>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-1 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!valid || saving}
            className="flex-1 flex items-center justify-center gap-2 btn-primary disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FiliaisContent() {
  const [grupos, setGrupos] = useState<GrupoComFiliais[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Modal state
  const [grupoModal, setGrupoModal] = useState<{ open: boolean; editing?: Grupo }>({ open: false });
  const [filialModal, setFilialModal] = useState<{ open: boolean; editing?: Filial; grupoId?: string }>({ open: false });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [gRes, fRes] = await Promise.all([
      supabase.from('grupos').select('*').order('codigo'),
      supabase.from('filiais').select('*').order('codigo'),
    ]);
    const grupoList = (gRes.data ?? []) as Grupo[];
    const filialList = (fRes.data ?? []) as Filial[];
    setGrupos(grupoList.map(g => ({
      ...g,
      filiais: filialList.filter(f => f.grupo_id === g.id),
    })));
    setLoading(false);
  }

  async function saveGrupo(form: GrupoForm) {
    setSaving(true);
    if (grupoModal.editing) {
      const { data } = await supabase
        .from('grupos')
        .update({ codigo: form.codigo, nome: form.nome })
        .eq('id', grupoModal.editing.id)
        .select()
        .maybeSingle();
      if (data) {
        setGrupos(prev => prev.map(g => g.id === data.id ? { ...data as Grupo, filiais: g.filiais } : g));
      }
    } else {
      const { data } = await supabase
        .from('grupos')
        .insert({ codigo: form.codigo, nome: form.nome })
        .select()
        .maybeSingle();
      if (data) setGrupos(prev => [...prev, { ...(data as Grupo), filiais: [] }]);
    }
    setSaving(false);
    setGrupoModal({ open: false });
  }

  async function deleteGrupo(id: string) {
    if (!confirm('Excluir este grupo e todas as suas filiais?')) return;
    await supabase.from('grupos').delete().eq('id', id);
    setGrupos(prev => prev.filter(g => g.id !== id));
  }

  async function saveFilial(form: FilialForm) {
    setSaving(true);
    if (filialModal.editing) {
      const { data } = await supabase
        .from('filiais')
        .update({ grupo_id: form.grupoId, codigo: form.codigo, descricao: form.descricao, ativa: form.ativa })
        .eq('id', filialModal.editing.id)
        .select()
        .maybeSingle();
      if (data) {
        const f = data as Filial;
        setGrupos(prev => prev.map(g => ({
          ...g,
          filiais: g.filiais.map(fil => fil.id === f.id ? f : fil),
        })));
      }
    } else {
      const { data } = await supabase
        .from('filiais')
        .insert({ grupo_id: form.grupoId, codigo: form.codigo, descricao: form.descricao, ativa: form.ativa })
        .select()
        .maybeSingle();
      if (data) {
        const f = data as Filial;
        setGrupos(prev => prev.map(g => g.id === f.grupo_id ? { ...g, filiais: [...g.filiais, f] } : g));
      }
    }
    setSaving(false);
    setFilialModal({ open: false });
  }

  async function deleteFilial(id: string) {
    if (!confirm('Excluir esta filial?')) return;
    await supabase.from('filiais').delete().eq('id', id);
    setGrupos(prev => prev.map(g => ({ ...g, filiais: g.filiais.filter(f => f.id !== id) })));
  }

  async function toggleFilial(filial: Filial) {
    await supabase.from('filiais').update({ ativa: !filial.ativa }).eq('id', filial.id);
    setGrupos(prev => prev.map(g => ({
      ...g,
      filiais: g.filiais.map(f => f.id === filial.id ? { ...f, ativa: !f.ativa } : f),
    })));
  }

  const totalFiliais = grupos.reduce((sum, g) => sum + g.filiais.length, 0);
  const filiaisAtivas = grupos.reduce((sum, g) => sum + g.filiais.filter(f => f.ativa).length, 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return grupos;
    const q = search.toLowerCase();
    return grupos
      .map(g => {
        const grupoMatch = g.codigo.toLowerCase().includes(q) || g.nome.toLowerCase().includes(q);
        const filiaisMatch = g.filiais.filter(f =>
          f.codigo.toLowerCase().includes(q) || f.descricao.toLowerCase().includes(q)
        );
        if (grupoMatch) return g;
        if (filiaisMatch.length > 0) return { ...g, filiais: filiaisMatch };
        return null;
      })
      .filter(Boolean) as GrupoComFiliais[];
  }, [grupos, search]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">CONFIGURAÇÕES</p>
          <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">GRUPOS & FILIAIS</h1>
          <p className="font-body text-sm text-text-tertiary mt-1">
            {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} ·{' '}
            {totalFiliais} {totalFiliais === 1 ? 'filial' : 'filiais'} ·{' '}
            {filiaisAtivas} ativas
          </p>
        </div>
        <button
          onClick={() => setGrupoModal({ open: true })}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Grupo
        </button>
      </div>

      {/* Stats */}
      {grupos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Grupos', value: grupos.length, color: 'bg-mos-700 text-white' },
            { label: 'Filiais Ativas', value: filiaisAtivas, color: 'bg-status-successLight text-status-success' },
            { label: 'Filiais Inativas', value: totalFiliais - filiaisAtivas, color: 'bg-surface-2 text-text-tertiary' },
          ].map(s => (
            <div key={s.label} className="card px-4 py-3 flex items-center gap-3">
              <span className={`inline-flex items-center justify-center w-10 h-8 rounded-lg font-data font-bold text-lg ${s.color}`}>
                {s.value}
              </span>
              <span className="font-body text-xs text-text-secondary">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {grupos.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar grupo ou filial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-14 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="py-16 text-center">
          <Search className="w-8 h-8 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary">Nenhum resultado para "{search}"</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="py-20 text-center">
          <GitBranch className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="font-body text-sm text-text-tertiary mb-1">Nenhum grupo cadastrado</p>
          <p className="font-body text-xs text-text-disabled mb-4">Crie um grupo para organizar suas filiais</p>
          <button
            onClick={() => setGrupoModal({ open: true })}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Grupo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => (
            <GrupoRow
              key={g.id}
              grupo={g}
              searchActive={!!search}
              onEditGrupo={grupo => setGrupoModal({ open: true, editing: grupo })}
              onDeleteGrupo={deleteGrupo}
              onAddFilial={grupoId => setFilialModal({ open: true, grupoId })}
              onEditFilial={filial => setFilialModal({ open: true, editing: filial })}
              onDeleteFilial={deleteFilial}
              onToggleFilial={toggleFilial}
            />
          ))}
        </div>
      )}

      {grupoModal.open && (
        <GrupoModal
          initial={grupoModal.editing}
          onSave={saveGrupo}
          onClose={() => setGrupoModal({ open: false })}
          saving={saving}
        />
      )}
      {filialModal.open && (
        <FilialModal
          initial={filialModal.editing}
          grupos={grupos}
          defaultGrupoId={filialModal.grupoId}
          onSave={saveFilial}
          onClose={() => setFilialModal({ open: false })}
          saving={saving}
        />
      )}
    </div>
  );
}

// ─── Arquivados Tab ───────────────────────────────────────────────────────────

type ArquivadoSubTab = 'obras' | 'fornecedores';

const ARQUIVADO_SUBTABS: { id: ArquivadoSubTab; label: string; icon: React.ElementType }[] = [
  { id: 'obras',         label: 'Obras',         icon: Building2 },
  { id: 'fornecedores',  label: 'Fornecedores',  icon: Truck     },
];

function ObrasArquivadasTab() {
  const { obras, loading, desarquivarObra } = useObras();
  const [restoring, setRestoring] = useState<string | null>(null);
  const arquivadas = obras.filter(o => o.arquivada);

  async function handleDesarquivar(obra: Obra) {
    setRestoring(obra.id);
    await desarquivarObra(obra.id);
    setRestoring(null);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 card animate-pulse" />
        ))}
      </div>
    );
  }

  if (arquivadas.length === 0) {
    return (
      <div className="py-16 text-center">
        <Archive className="w-10 h-10 text-text-disabled mx-auto mb-3" />
        <p className="font-body text-sm text-text-tertiary">Nenhuma obra arquivada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {arquivadas.map(obra => {
        const consumo = obra.orcado > 0 ? Math.round((obra.realizado / obra.orcado) * 100) : 0;
        return (
          <div key={obra.id} className="card px-4 py-3 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-lg bg-surface-2 flex-shrink-0 overflow-hidden">
              {obra.imagem_url
                ? <img src={obra.imagem_url} alt={obra.nome} className="w-full h-full object-cover opacity-60" />
                : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-5 h-5 text-text-disabled" /></div>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-data text-xs font-semibold text-mos-700">{obra.codigo}</span>
                <StatusBadge status={obra.status} />
              </div>
              <p className="font-body font-semibold text-sm text-text-primary truncate">{obra.nome}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                  <MapPin className="w-3 h-3" />
                  {obra.localizacao}
                </span>
                <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                  <Calendar className="w-3 h-3" />
                  {formatDate(obra.data_inicio)} → {formatDate(obra.data_fim)}
                </span>
              </div>
            </div>

            {/* Financeiro */}
            <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
              <span className="font-data text-xs text-text-tertiary">Orçado</span>
              <span className="font-data text-sm font-semibold text-text-primary">{formatCurrencyFull(obra.orcado)}</span>
              <span className="font-data text-xs text-text-tertiary">{consumo}% consumido</span>
            </div>

            {/* Action */}
            <button
              onClick={() => handleDesarquivar(obra)}
              disabled={restoring === obra.id}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-status-warning/40 bg-status-warningLight text-status-warning font-body text-sm font-medium hover:bg-status-warning hover:text-white transition-colors disabled:opacity-60"
            >
              {restoring === obra.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArchiveRestore className="w-4 h-4" />
              }
              <span className="hidden sm:inline">Desarquivar</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function FornecedoresArquivadosTab() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetchInativos();
  }, []);

  async function fetchInativos() {
    setLoading(true);
    const { data } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('status', 'inativo')
      .order('nome');
    setFornecedores((data ?? []) as Fornecedor[]);
    setLoading(false);
  }

  async function handleReativar(id: string) {
    setRestoring(id);
    await supabase.from('fornecedores').update({ status: 'ativo' }).eq('id', id);
    setFornecedores(prev => prev.filter(f => f.id !== id));
    setRestoring(null);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 card animate-pulse" />
        ))}
      </div>
    );
  }

  if (fornecedores.length === 0) {
    return (
      <div className="py-16 text-center">
        <Truck className="w-10 h-10 text-text-disabled mx-auto mb-3" />
        <p className="font-body text-sm text-text-tertiary">Nenhum fornecedor arquivado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fornecedores.map(f => (
        <div key={f.id} className="card px-4 py-3 flex items-center gap-4 hover:shadow-card-hover transition-shadow">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-surface-2 flex-shrink-0 flex items-center justify-center">
            <Truck className="w-5 h-5 text-text-disabled" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-body font-semibold text-sm text-text-primary truncate">{f.nome}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {f.categoria && (
                <span className="font-body text-xs text-text-tertiary">{f.categoria}</span>
              )}
              {(f.cidade || f.estado) && (
                <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                  <MapPin className="w-3 h-3" />
                  {[f.cidade, f.estado].filter(Boolean).join(', ')}
                </span>
              )}
              {f.contato && (
                <span className="font-body text-xs text-text-tertiary truncate">{f.contato}</span>
              )}
            </div>
          </div>

          {/* Action */}
          <button
            onClick={() => handleReativar(f.id)}
            disabled={restoring === f.id}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-status-warning/40 bg-status-warningLight text-status-warning font-body text-sm font-medium hover:bg-status-warning hover:text-white transition-colors disabled:opacity-60"
          >
            {restoring === f.id
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ArchiveRestore className="w-4 h-4" />
            }
            <span className="hidden sm:inline">Reativar</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function ArquivadosContent() {
  const [activeSubTab, setActiveSubTab] = useState<ArquivadoSubTab>('obras');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1">CONFIGURAÇÕES</p>
        <h1 className="font-display font-extrabold text-3xl text-text-primary tracking-tight">ARQUIVADOS</h1>
        <p className="font-body text-sm text-text-tertiary mt-1">
          Itens arquivados ou desativados — podem ser restaurados a qualquer momento
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1 self-start w-fit">
        {ARQUIVADO_SUBTABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-body text-sm font-semibold transition-colors ${
              activeSubTab === tab.id
                ? 'bg-status-warning text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'obras'        && <ObrasArquivadasTab />}
      {activeSubTab === 'fornecedores' && <FornecedoresArquivadosTab />}
    </div>
  );
}

// ─── Module tabs ──────────────────────────────────────────────────────────────

type TabId = 'usuarios' | 'fornecedores' | 'filiais' | 'arquivados';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { id: 'usuarios',    label: 'Usuários',    icon: Users      },
  { id: 'fornecedores',label: 'Fornecedores',icon: Truck      },
  { id: 'filiais',     label: 'Filiais',     icon: GitBranch  },
  { id: 'arquivados',  label: 'Arquivados',  icon: Archive    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<TabId>('usuarios');

  return (
    <AppLayout title="Configurações" subtitle="Cadastros e configurações do sistema">
      {/* Horizontal tabs bar */}
      <div className="sticky top-0 z-10 bg-surface-0 border-b border-surface-2 flex items-center">
        <div className="flex overflow-x-auto px-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 font-body text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-mos-700 text-mos-700'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-surface-3'
                }
              `}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" strokeWidth={activeTab === tab.id ? 2.2 : 1.8} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'usuarios'     && <UsuariosContent />}
      {activeTab === 'fornecedores' && <FornecedoresContent />}
      {activeTab === 'filiais'      && <FiliaisContent />}
      {activeTab === 'arquivados'   && <ArquivadosContent />}
    </AppLayout>
  );
}
