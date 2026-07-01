import { X, Building, Mail, Phone, Hash, Tag, MapPin, ToggleLeft, ToggleRight, Pencil, Star } from 'lucide-react';
import type { Fornecedor } from '../../lib/database.types';
import { formatCurrency } from '../../lib/formatters';

interface FornecedorDetalheModalProps {
  fornecedor: Fornecedor;
  cotacoesCount: number;
  volumeTotal: number;
  onClose: () => void;
  onToggleStatus?: (id: string, status: 'ativo' | 'inativo') => void;
  onEdit?: () => void;
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

export function FornecedorDetalheModal({ fornecedor, cotacoesCount, volumeTotal, onClose, onToggleStatus, onEdit }: FornecedorDetalheModalProps) {
  const isAtivo = fornecedor.status === 'ativo';
  const localizacao = [fornecedor.cidade, fornecedor.estado].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">

        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
              <Building className="w-4 h-4 text-text-tertiary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm text-text-primary leading-snug">{fornecedor.nome}</h2>
                {fornecedor.nota != null && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="font-data text-xs font-semibold text-status-success">
                      {Number(fornecedor.nota) % 1 === 0 ? fornecedor.nota : Number(fornecedor.nota).toFixed(1)}
                    </span>
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-text-tertiary mt-0.5">
                {localizacao || 'Detalhes do fornecedor'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex px-2.5 py-1 rounded text-xs font-body font-semibold ${
              isAtivo
                ? 'bg-status-successLight text-status-success'
                : 'bg-surface-2 text-text-tertiary'
            }`}>
              {isAtivo ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div className="flex items-stretch rounded-lg bg-surface-1 overflow-hidden">
            <div className="flex-1 px-4 py-3">
              <p className="font-body text-[9px] font-semibold text-text-disabled tracking-wider uppercase mb-0.5">Cotacoes</p>
              <p className="font-data text-base font-bold text-text-primary">{cotacoesCount}</p>
            </div>
            <div className="w-px bg-surface-2" />
            <div className="flex-1 px-4 py-3">
              <p className="font-body text-[9px] font-semibold text-text-disabled tracking-wider uppercase mb-0.5">Volume Total</p>
              <p className="font-data text-base font-bold text-text-primary">{formatCurrency(volumeTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1">
            <InfoRow icon={<Tag className="w-4 h-4 text-text-tertiary" />} label="CATEGORIA" value={fornecedor.categoria} />
            {localizacao && (
              <InfoRow
                icon={<MapPin className="w-4 h-4 text-text-tertiary" />}
                label="LOCALIZACAO"
                value={<span className="font-data">{localizacao}</span>}
              />
            )}
            <InfoRow icon={<Hash className="w-4 h-4 text-text-tertiary" />} label="CNPJ" value={<span className="font-data">{fornecedor.cnpj || '—'}</span>} />
            <InfoRow icon={<Building className="w-4 h-4 text-text-tertiary" />} label="CONTATO" value={fornecedor.contato || '—'} />
            <InfoRow
              icon={<Mail className="w-4 h-4 text-text-tertiary" />}
              label="E-MAIL"
              value={<a href={`mailto:${fornecedor.email}`} className="text-mos-700 hover:underline font-data">{fornecedor.email || '—'}</a>}
            />
            <InfoRow icon={<Phone className="w-4 h-4 text-text-tertiary" />} label="TELEFONE" value={<span className="font-data">{fornecedor.telefone || '—'}</span>} />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-2 bg-surface-1">
          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <button
                onClick={() => { onToggleStatus(fornecedor.id, isAtivo ? 'inativo' : 'ativo'); onClose(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border font-body text-sm font-medium transition-colors ${
                  isAtivo
                    ? 'border-surface-3 text-text-secondary hover:bg-surface-2'
                    : 'border-status-success/30 text-status-success hover:bg-status-successLight'
                }`}
              >
                {isAtivo
                  ? <><ToggleLeft className="w-4 h-4" /> Desativar</>
                  : <><ToggleRight className="w-4 h-4" /> Ativar</>
                }
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => { onEdit(); onClose(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-surface-3 font-body text-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>
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
