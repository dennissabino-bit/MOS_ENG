interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  allowDecimal?: boolean;
}

export function NumberInput({ value, onChange, placeholder = '0', className = '', id, allowDecimal = true }: NumberInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (allowDecimal) {
      const sanitized = raw.replace(/[^0-9.,]/g, '').replace(',', '.');
      const parts = sanitized.split('.');
      const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
      onChange(clean);
    } else {
      const sanitized = raw.replace(/\D/g, '');
      onChange(sanitized);
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
    />
  );
}
