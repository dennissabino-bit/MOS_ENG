import { X, FileText, Calendar, Building2, User, DollarSign, Tag, Clock } from 'lucide-react';
import { CotacaoBadge } from '../ui/Badge';
import { formatCurrencyFull } from '../../lib/formatters';
import type { Cotacao, CotacaoStatus } from '../../lib/database.types';

interface CotacaoDetalheModalProps {
  cotacao: Cotacao;
  onClose: () => void;
  onStatusChange?: (id: string, status: CotacaoStatus) => void;
}

const STATUS_OPTIONS: { key: CotacaoStatus; label: string }[] = [
  { key: 'aberta',    label: 'Aberta'    },
  { key: 'aprovada',  label: 'Aprovada'  },
  { key: 'fechada',   label: 'Fechada'   },
  { key: 'cancelada', label: 'Cancelada' },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="font-body text-[10px] font-semibold text-text-tertiary tracking-wider mb-0.5">{label}</p>
        <div className="font-body text-sm text-text-primary">{value}</div>
      </div>
    </div>
  );
}

export function CotacaoDetalheModal({ cotacao, onClose, onStatusChange }: CotacaoDetalheModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">

        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-text-tertiary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-text-primary leading-snug">{cotacao.descricao}</h2>
              <p className="font-body text-xs text-text-tertiary mt-0.5">Detalhes da cotação</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-body text-xs text-text-tertiary">Status atual:</span>
            <CotacaoBadge status={cotacao.status} />
          </div>

          {onStatusChange && (
            <div>
              <p className="font-body text-xs font-semibold text-text-tertiary tracking-wider mb-2">ALTERAR STATUS</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter(s => s.key !== cotacao.status).map(s => (
                  <button
                    key={s.key}
                    onClick={() => { onStatusChange(cotacao.id, s.key); onClose(); }}
                    className="px-3 py-1.5 rounded-lg border border-surface-3 font-body text-xs font-medium text-text-secondary hover:bg-surface-1 hover:border-surface-3 transition-colors"
                  >
                    Marcar como {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 pt-1">
            <InfoRow
              icon={<Building2 className="w-4 h-4 text-text-tertiary" />}
              label="OBRA"
              value={
                <span>
                  {cotacao.obras?.nome ?? '—'}
                  {cotacao.obras?.codigo && (
                    <span className="ml-2 font-data text-xs text-mos-700">{cotacao.obras.codigo}</span>
                  )}
                </span>
              }
            />
            <InfoRow
              icon={<User className="w-4 h-4 text-text-tertiary" />}
              label="FORNECEDOR"
              value={cotacao.fornecedores?.nome ?? '—'}
            />
            <InfoRow
              icon={<DollarSign className="w-4 h-4 text-text-tertiary" />}
              label="VALOR"
              value={<span className="font-data font-bold text-base text-text-primary">{formatCurrencyFull(cotacao.valor)}</span>}
            />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                icon={<Calendar className="w-4 h-4 text-text-tertiary" />}
                label="ABERTURA"
                value={formatDate(cotacao.data_abertura)}
              />
              {cotacao.data_fechamento && (
                <InfoRow
                  icon={<Clock className="w-4 h-4 text-text-tertiary" />}
                  label="FECHAMENTO"
                  value={formatDate(cotacao.data_fechamento)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-surface-2 bg-surface-1">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-text-primary text-white font-body text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
