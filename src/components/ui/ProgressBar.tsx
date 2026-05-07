interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showOverflow?: boolean;
}

export function ProgressBar({ value, max = 100, className = '', showOverflow = false }: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  const isOver = value > max;
  const isAlert = value / max > 0.95;

  const barColor = isOver
    ? 'bg-status-error'
    : isAlert
    ? 'bg-status-warning'
    : 'bg-mos-700';

  return (
    <div className={`w-full h-1.5 bg-surface-2 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${showOverflow && isOver ? 100 : percent}%` }}
      />
    </div>
  );
}
