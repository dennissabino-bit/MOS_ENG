import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  trend: number;
}

export function KpiCard({ icon, label, value, trend }: KpiCardProps) {
  const isPositive = trend >= 0;
  return (
    <div className="card p-5 flex-1 min-w-0">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className={`flex items-center gap-0.5 text-xs font-data font-medium ${isPositive ? 'text-status-success' : 'text-status-error'}`}>
          {isPositive
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />
          }
          {Math.abs(trend)}%
        </div>
      </div>
      <p className="font-display font-bold text-2xl text-text-primary leading-tight mb-0.5">{value}</p>
      <p className="font-body text-xs text-text-tertiary">{label}</p>
    </div>
  );
}
