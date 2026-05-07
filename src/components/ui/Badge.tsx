import type { ObraStatus, CotacaoStatus, UserCargo } from '../../lib/database.types';

interface StatusBadgeProps {
  status: ObraStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<ObraStatus, { label: string; className: string }> = {
    em_andamento: { label: 'Em Andamento', className: 'bg-status-infoLight text-status-info' },
    planejamento: { label: 'Planejamento', className: 'bg-blue-50 text-blue-600' },
    concluida:    { label: 'Concluída',    className: 'bg-status-successLight text-status-success' },
    pausada:      { label: 'Pausada',      className: 'bg-gray-100 text-gray-500' },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-body font-medium ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

interface CotacaoBadgeProps {
  status: CotacaoStatus;
}

export function CotacaoBadge({ status }: CotacaoBadgeProps) {
  const map: Record<CotacaoStatus, { label: string; className: string }> = {
    aberta:    { label: 'Aberta',    className: 'bg-status-infoLight text-status-info' },
    fechada:   { label: 'Fechada',   className: 'bg-gray-100 text-gray-500' },
    aprovada:  { label: 'Aprovada',  className: 'bg-status-successLight text-status-success' },
    cancelada: { label: 'Cancelada', className: 'bg-status-errorLight text-status-error' },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-xs text-xs font-body font-medium ${className}`}>
      {label}
    </span>
  );
}

interface RoleBadgeProps {
  cargo: UserCargo;
}

export function RoleBadge({ cargo }: RoleBadgeProps) {
  const map: Record<UserCargo, { label: string; className: string }> = {
    administrador: { label: 'ADMINISTRADOR', className: 'bg-role-masterLight text-role-master' },
    gerente:       { label: 'GERENTE',       className: 'bg-role-gestorLight text-role-gestor' },
    engenheiro:    { label: 'ENGENHEIRO',    className: 'bg-role-engenheiroLight text-role-engenheiro' },
    gestor:        { label: 'GESTOR',        className: 'bg-blue-50 text-blue-600' },
    operacional:   { label: 'OPERACIONAL',   className: 'bg-role-compradorLight text-role-comprador' },
  };
  const { label, className } = map[cargo];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-xs text-[10px] font-body font-bold tracking-wider ${className}`}>
      {label}
    </span>
  );
}

export function MockadosBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-status-warning">
      <span className="w-2 h-2 rounded-full bg-status-warning" />
      DADOS MOCKADOS
    </span>
  );
}
