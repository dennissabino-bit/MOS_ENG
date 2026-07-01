import { Star, Phone, Mail, MapPin } from 'lucide-react';
import type { Fornecedor } from '../../lib/database.types';
import { formatCurrency } from '../../lib/formatters';

interface FornecedorCardProps {
  fornecedor: Fornecedor;
  cotacoesCount: number;
  volumeTotal: number;
  onClick: () => void;
}

export function FornecedorCard({ fornecedor, cotacoesCount, volumeTotal, onClick }: FornecedorCardProps) {
  const localizacao = [fornecedor.cidade, fornecedor.estado].filter(Boolean).join(', ');

  return (
    <div
      onClick={onClick}
      className="card overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow duration-200 flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-display font-bold text-sm text-text-primary leading-snug flex-1 min-w-0 truncate">
            {fornecedor.nome}
          </h3>
          {fornecedor.nota != null && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-data text-xs font-semibold text-status-success">
                {fornecedor.nota % 1 === 0 ? fornecedor.nota : fornecedor.nota.toFixed(1)}
              </span>
            </span>
          )}
        </div>

        <div className="mb-3">
          <span className="inline-block px-1.5 py-0.5 rounded bg-surface-2 font-body text-[10px] font-semibold text-text-secondary tracking-wide uppercase">
            {fornecedor.categoria}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-text-disabled flex-shrink-0" />
            <span className="font-data text-xs text-text-secondary truncate">
              {fornecedor.telefone || '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 text-text-disabled flex-shrink-0" />
            <span className="font-data text-xs text-text-secondary truncate">
              {fornecedor.email || '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-text-disabled flex-shrink-0" />
            <span className="font-data text-xs text-text-secondary truncate">
              {localizacao || '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-2 px-4 py-3 flex items-center gap-0">
        <div className="flex-1">
          <p className="font-body text-[9px] font-semibold text-text-disabled tracking-wider uppercase mb-0.5">Cotacoes</p>
          <p className="font-data text-sm font-bold text-text-primary">{cotacoesCount}</p>
        </div>
        <div className="w-px h-8 bg-surface-2 mx-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-body text-[9px] font-semibold text-text-disabled tracking-wider uppercase mb-0.5">Volume Total</p>
          <p className="font-data text-sm font-bold text-text-primary">{formatCurrency(volumeTotal)}</p>
        </div>
      </div>
    </div>
  );
}
