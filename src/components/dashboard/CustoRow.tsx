import { formatCurrencyFull } from '../../lib/formatters';
import type { Obra } from '../../lib/database.types';

interface CustoRowProps {
  obra: Obra;
  totalMax: number;
}

export function CustoRow({ obra, totalMax }: CustoRowProps) {
  const consumo = obra.orcado > 0 ? Math.round((obra.realizado / obra.orcado) * 100) : 0;
  const isAlerta = consumo >= 100;
  const isSaudavel = consumo < 96;
  const barPercent = Math.min((obra.realizado / totalMax) * 100, 100);

  return (
    <div className="py-4 border-b border-surface-2 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="font-body font-semibold text-sm text-text-primary">{obra.nome}</span>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-body font-semibold ${isAlerta ? 'text-status-warning' : 'text-text-tertiary'}`}>
            {isAlerta ? 'EM ALERTA' : isSaudavel ? 'SAUDÁVEL' : 'ATENÇÃO'}
          </span>
          <span className={`font-data font-bold text-sm ${isAlerta ? 'text-status-warning' : 'text-text-primary'}`}>
            {consumo}%
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isAlerta ? 'bg-status-warning' : 'bg-mos-700'}`}
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-data text-xs text-text-tertiary">
          {formatCurrencyFull(obra.realizado)} gasto
        </span>
        <span className="font-data text-xs text-text-tertiary">
          de {formatCurrencyFull(obra.orcado)} orçado
        </span>
      </div>
    </div>
  );
}
