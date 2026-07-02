import { useState, useEffect, useRef } from 'react';
import {
  Paperclip, Plus, Trash2, FileText, ExternalLink, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DOCUMENTO_TIPO_LABEL } from '../types';
import type { EnergiaSalaDocumento, EnergiaSalaDocumentoTipo } from '../types';
import { AnexarDocumentoModal } from './AnexarDocumentoModal';

interface Props {
  salaId: string;
  isAdmin: boolean;
}

const TIPO_COLORS: Record<EnergiaSalaDocumentoTipo, string> = {
  contrato_gerado:    'bg-blue-50 text-blue-700 border-blue-200',
  documento_locatario:'bg-status-warningLight text-status-warning border-status-warning/30',
  outro:              'bg-surface-2 text-text-secondary border-surface-3',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SalaDocumentosCard({ salaId, isAdmin }: Props) {
  const [docs, setDocs] = useState<EnergiaSalaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnexar, setShowAnexar] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchDocs() {
    setLoading(true);
    const { data } = await supabase
      .from('energia_sala_documentos')
      .select('*')
      .eq('sala_id', salaId)
      .order('created_at', { ascending: false });
    setDocs((data as EnergiaSalaDocumento[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchDocs(); }, [salaId]);

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    const doc = docs.find(d => d.id === deletingId);
    if (doc?.url) {
      // Extract path from URL for storage deletion
      const urlParts = doc.url.split('/storage/v1/object/public/energia-sala-documentos/');
      if (urlParts[1]) {
        await supabase.storage.from('energia-sala-documentos').remove([urlParts[1]]);
      }
    }
    await supabase.from('energia_sala_documentos').delete().eq('id', deletingId);
    setDeleting(false);
    setDeletingId(null);
    fetchDocs();
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-2 bg-surface-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="w-3.5 h-3.5 text-text-tertiary" />
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">
              DOCUMENTOS ({docs.length})
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAnexar(true)}
              className="flex items-center gap-1.5 text-xs font-body font-semibold text-mos-700 hover:text-mos-700/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Anexar
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
          </div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center">
            <Paperclip className="w-9 h-9 text-text-disabled mx-auto mb-2" />
            <p className="font-body text-sm text-text-tertiary">Nenhum documento anexado</p>
            {isAdmin && (
              <button onClick={() => setShowAnexar(true)} className="btn-primary mt-3 text-sm">
                Anexar Documento
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-surface-2">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-1 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-text-tertiary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-text-primary font-medium truncate">{doc.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`font-body text-[10px] font-semibold px-1.5 py-0.5 rounded border ${TIPO_COLORS[doc.tipo]}`}>
                      {DOCUMENTO_TIPO_LABEL[doc.tipo]}
                    </span>
                    {doc.tamanho_bytes && (
                      <span className="font-body text-[10px] text-text-tertiary">{formatBytes(doc.tamanho_bytes)}</span>
                    )}
                    <span className="font-body text-[10px] text-text-tertiary">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
                    title="Abrir documento"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-text-tertiary hover:text-mos-700 transition-colors" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => setDeletingId(doc.id)}
                      className="p-1.5 rounded-lg hover:bg-status-errorLight transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-status-error transition-colors" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAnexar && (
        <AnexarDocumentoModal
          salaId={salaId}
          onClose={() => setShowAnexar(false)}
          onSaved={() => { setShowAnexar(false); fetchDocs(); }}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-text-primary">Excluir documento</h3>
            <p className="font-body text-sm text-text-secondary">
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-status-error text-white font-body font-semibold text-sm rounded-lg hover:bg-status-error/90 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
