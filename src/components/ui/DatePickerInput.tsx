import { Calendar } from 'lucide-react';

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

function formatToBR(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export function DatePickerInput({ value, onChange, placeholder = 'DD/MM/AAAA', className = '', id }: DatePickerInputProps) {
  return (
    <label
      htmlFor={id ?? 'date-picker'}
      className={`relative flex items-center cursor-pointer ${className}`}
      style={{ minHeight: '38px' }}
    >
      <Calendar className="absolute left-3 w-3.5 h-3.5 text-text-tertiary pointer-events-none z-10" />

      <span className={`absolute left-8 pointer-events-none z-10 font-data text-sm ${value ? 'text-text-primary' : 'text-text-tertiary'}`}>
        {value ? formatToBR(value) : placeholder}
      </span>

      <input
        id={id ?? 'date-picker'}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-full min-h-[38px] cursor-pointer border-0 bg-transparent focus:outline-none"
        style={{
          colorScheme: 'light',
          color: 'transparent',
          caretColor: 'transparent',
        }}
      />
    </label>
  );
}
