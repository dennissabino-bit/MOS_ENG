import { useState } from 'react';
import { X, Archive, Loader2, AlertTriangle } from 'lucide-react';

interface ArchivarModalProps {
  obraId: string;
  obraName: string;
  onClose: () => void;
  onConfirm: (obraId: string) => Promise<void>;
}

export function ArchivarModal({ obraId, obraName, onClose, onConfirm }: ArchivarModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm(obraId);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-status-warningLight flex items-center justify-center shrink-0">
              <Archive className="w-6 h-6 text-status-warning" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text-primary mb-1">Arquivar Obra</h2>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                A obra <span className="font-semibold text-text-primary">"{obraName}"</span> será arquivada e ficará oculta da listagem principal.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-status-warningLight rounded-lg px-3 py-2.5 mb-5">
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning shrink-0 mt-0.5" />
            <p className="font-body text-xs text-status-warning">
              Esta ação pode ser desfeita. A obra continuará acessível no filtro "Arquivadas".
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-status-warning text-white font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Arquivando…' : 'Arquivar Obra'}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-1 transition-colors">
          <X className="w-4 h-4 text-text-tertiary" />
        </button>
      </div>
    </div>
  );
}
