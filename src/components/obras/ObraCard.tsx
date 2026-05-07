import { useState, useRef, useEffect } from 'react';
import { MapPin, Calendar, ArrowRight, Camera, MoreVertical, Archive } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { formatCurrencyFull, formatDate } from '../../lib/formatters';
import type { Obra } from '../../lib/database.types';
import { ThumbnailModal } from './ThumbnailModal';
import { ArchivarModal } from './ArchivarModal';

interface ObraCardProps {
  obra: Obra;
  onVerDetalhes?: (id: string) => void;
  onThumbnailSaved?: (obraId: string, newUrl: string) => void;
  onArchive?: (obraId: string) => Promise<void>;
}

export function ObraCard({ obra, onVerDetalhes, onThumbnailSaved, onArchive }: ObraCardProps) {
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localImage, setLocalImage] = useState(obra.imagem_url);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const consumo = obra.orcado > 0 ? Math.round((obra.realizado / obra.orcado) * 100) : 0;
  const isOver = consumo > 100;
  const isAlert = consumo >= 96 && !isOver;
  const barPercent = Math.min(obra.avanco_fisico, 100);

  const barColor = isOver ? 'bg-status-error' : isAlert ? 'bg-status-warning' : 'bg-mos-700';
  const consumoColor = isOver ? 'text-status-error' : isAlert ? 'text-status-warning' : 'text-text-primary';

  function handleThumbnailSaved(obraId: string, newUrl: string) {
    setLocalImage(newUrl);
    onThumbnailSaved?.(obraId, newUrl);
  }

  return (
    <>
      <div className="card overflow-hidden hover:shadow-card-hover transition-shadow duration-200 flex flex-col">
        <div className="relative h-44 bg-surface-3 overflow-hidden group/img">
          {localImage ? (
            <img
              src={localImage}
              alt={obra.nome}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-text-disabled" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <div className="absolute top-3 left-3">
            <StatusBadge status={obra.status} />
          </div>

          <div className="absolute top-3 right-3">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-body font-semibold px-2 py-1 rounded-xs tracking-wide">
              {obra.bandeira}
            </span>
          </div>

          <button
            onClick={e => { e.stopPropagation(); setShowThumbnailModal(true); }}
            className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-md text-white/80 hover:text-white transition-all duration-150 opacity-0 group-hover/img:opacity-100"
            title="Alterar thumbnail"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="font-body text-[10px] font-medium">Alterar foto</span>
          </button>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-bold text-sm text-text-primary leading-snug flex-1 min-w-0">
              {obra.nome}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="font-data text-xs font-semibold text-mos-700">{obra.codigo}</span>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                  className="p-1 rounded-md hover:bg-surface-2 transition-colors"
                  title="Opções"
                >
                  <MoreVertical className="w-3.5 h-3.5 text-text-tertiary" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-modal border border-surface-2 py-1 min-w-[170px]">
                    <button
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 font-body text-sm text-text-secondary hover:bg-surface-1 transition-colors"
                      onClick={() => { setMenuOpen(false); setShowThumbnailModal(true); }}
                    >
                      <Camera className="w-3.5 h-3.5 text-text-tertiary" />
                      Alterar Thumbnail
                    </button>
                    <div className="h-px bg-surface-2 mx-3 my-0.5" />
                    <button
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 font-body text-sm text-status-warning hover:bg-status-warningLight transition-colors"
                      onClick={() => { setMenuOpen(false); setShowArchiveModal(true); }}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Arquivar Obra
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            <span className="font-body text-xs text-text-tertiary truncate">{obra.localizacao}</span>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-body text-xs text-text-secondary">Avanço Físico</span>
              <span className={`font-data text-xs font-bold ${isOver ? 'text-status-error' : 'text-text-primary'}`}>
                {obra.avanco_fisico}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-surface-1 rounded-lg p-3 mb-3">
            <div>
              <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-wider mb-0.5">ORÇADO</p>
              <p className="font-data text-xs font-medium text-text-primary">{formatCurrencyFull(obra.orcado)}</p>
            </div>
            <div>
              <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-wider mb-0.5">REALIZADO</p>
              <p className={`font-data text-xs font-medium ${isOver ? 'text-status-error' : 'text-text-primary'}`}>
                {formatCurrencyFull(obra.realizado)}
              </p>
            </div>
            <div>
              <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-wider mb-0.5">CONSUMO</p>
              <p className={`font-data text-xs font-bold ${consumoColor}`}>{consumo}%</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-4">
            <Calendar className="w-3 h-3 text-text-tertiary" />
            <span className="font-data text-xs text-text-tertiary">
              {formatDate(obra.data_inicio)} → {formatDate(obra.data_fim)}
            </span>
          </div>

          <div className="mt-auto">
            <button
              className="flex items-center gap-1.5 text-sm font-body font-semibold text-text-primary hover:text-mos-700 transition-colors duration-150 group"
              onClick={() => onVerDetalhes?.(obra.id)}
            >
              Ver Detalhes
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {showThumbnailModal && (
        <ThumbnailModal
          obraId={obra.id}
          obraName={obra.nome}
          currentUrl={localImage}
          onClose={() => setShowThumbnailModal(false)}
          onSaved={handleThumbnailSaved}
        />
      )}

      {showArchiveModal && (
        <ArchivarModal
          obraId={obra.id}
          obraName={obra.nome}
          onClose={() => setShowArchiveModal(false)}
          onConfirm={onArchive ?? (() => Promise.resolve())}
        />
      )}
    </>
  );
}
