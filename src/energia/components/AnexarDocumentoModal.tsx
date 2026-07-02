import { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, Paperclip } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DOCUMENTO_TIPO_LABEL } from '../types';
import type { EnergiaSalaDocumentoTipo } from '../types';

interface Props {
  salaId: string;
  defaultTipo?: EnergiaSalaDocumentoTipo;
  defaultNome?: string;
  onClose: () => void;
  onSaved: (docId: string) => void;
}

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export function AnexarDocumentoModal({ salaId, defaultTipo, defaultNome, onClose, onSaved }: Props) {
  const [nome, setNome] = useState(defaultNome ?? '');
  const [tipo, setTipo] = useState<EnergiaSalaDocumentoTipo>(defaultTipo ?? 'documento_locatario');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_MIME.includes(f.type)) {
      setError('Formato não suportado. Use PDF, JPEG ou PNG.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('Arquivo muito grande. Máximo 20 MB.');
      return;
    }
    setError('');
    setFile(f);
    if (!nome) setNome(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Selecione um arquivo.'); return; }
    if (!nome.trim()) { setError('Informe um nome para o documento.'); return; }
    setUploading(true);
    setError('');

    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${salaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('energia-sala-documentos')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('energia-sala-documentos')
        .getPublicUrl(path);

      const { data: doc, error: insertErr } = await supabase
        .from('energia_sala_documentos')
        .insert({
          sala_id: salaId,
          nome: nome.trim(),
          tipo,
          url: urlData.publicUrl,
          tamanho_bytes: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      onSaved(doc.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-surface-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center">
              <Paperclip className="w-4 h-4 text-text-secondary" />
            </div>
            <h3 className="font-display font-bold text-base text-text-primary">Anexar Documento</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
          {/* File picker */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              ARQUIVO
            </label>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-surface-3 rounded-xl hover:border-mos-700/40 hover:bg-surface-1 transition-colors"
            >
              {file ? (
                <>
                  <FileText className="w-8 h-8 text-mos-700" />
                  <span className="font-body text-sm font-semibold text-text-primary">{file.name}</span>
                  <span className="font-body text-xs text-text-tertiary">
                    {(file.size / 1024).toFixed(0)} KB · Clique para trocar
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-text-disabled" />
                  <span className="font-body text-sm text-text-secondary font-medium">Clique para selecionar</span>
                  <span className="font-body text-xs text-text-tertiary">PDF, JPEG ou PNG · máx. 20 MB</span>
                </>
              )}
            </button>
          </div>

          {/* Nome */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              NOME DO DOCUMENTO
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Contrato Assinado Jan/2026"
              className={inputClass}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              CATEGORIA
            </label>
            <select value={tipo} onChange={e => setTipo(e.target.value as EnergiaSalaDocumentoTipo)} className={inputClass}>
              {(Object.entries(DOCUMENTO_TIPO_LABEL) as [EnergiaSalaDocumentoTipo, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {error && <p className="font-body text-xs text-status-error">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando…</>
                : <><Upload className="w-3.5 h-3.5" /> Anexar</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
