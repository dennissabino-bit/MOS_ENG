import { useRef, useState } from 'react';

interface CurrencyInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

function formatDisplay(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CurrencyInput({ value, onChange, placeholder = '0,00', className = '', id }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === null || value === undefined) return '';
    return formatDisplay(Math.round(value * 100));
  });
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      setDisplayValue('');
      onChange(null);
      return;
    }
    const cents = parseInt(raw, 10);
    setDisplayValue(formatDisplay(cents));
    onChange(cents / 100);
  }

  function handleFocus() {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-data text-sm text-text-tertiary pointer-events-none select-none">
        R$
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        className={`pl-9 ${className}`}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
      />
    </div>
  );
}
