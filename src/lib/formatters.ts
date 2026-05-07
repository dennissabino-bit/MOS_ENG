export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const decimals = millions % 1 === 0 ? 0 : 2;
    return `R$ ${millions.toFixed(decimals).replace('.', ',')}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `R$ ${thousands.toFixed(0)}k`;
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatCurrencyMi(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `R$ ${millions.toFixed(2).replace('.', ',')} mi`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `R$ ${thousands.toFixed(1).replace('.', ',')}K`;
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

export function formatMonthYear(mes: number, ano: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[mes - 1]}/${String(ano).slice(2)}`;
}
