import { Link } from 'react-router-dom';
import { Building2, MapPin, Calendar, User, FileDown, Archive, ChevronRight, ChevronDown } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import type { Obra } from '../../lib/database.types';
import { formatDate } from '../../lib/formatters';

interface ObraHeaderProps {
  obra: Obra;
}

export function ObraHeader({ obra }: ObraHeaderProps) {
  return (
    <div className="px-6 pt-5 pb-0 bg-surface-0 border-b border-surface-3">
      <div className="flex items-center gap-1.5 mb-3 font-body text-sm text-text-tertiary">
        <Link to="/obras" className="hover:text-text-primary transition-colors">Obras</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary font-medium">{obra.nome}</span>
      </div>

      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary leading-tight">{obra.nome}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={obra.status} />
            <button className="flex items-center gap-1 ml-1">
              <ChevronDown className="w-3 h-3 text-text-tertiary" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-surface-3 bg-surface-0 font-body text-sm text-text-secondary hover:bg-surface-1 transition-colors">
            <FileDown className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-status-errorLight bg-status-errorLight font-body text-sm text-status-error hover:bg-red-100 transition-colors">
            <Archive className="w-3.5 h-3.5" />
            Arquivar Obra
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 font-body text-sm text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-text-disabled" />
          {obra.tipo}
        </span>
        <span className="text-text-disabled">·</span>
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-text-disabled" />
          {obra.localizacao}
        </span>
        <span className="text-text-disabled">·</span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-text-disabled" />
          {formatDate(obra.data_inicio)} → {formatDate(obra.data_fim)}
        </span>
        <span className="text-text-disabled">·</span>
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-text-disabled" />
          {obra.engenheiro}
        </span>
      </div>
    </div>
  );
}
