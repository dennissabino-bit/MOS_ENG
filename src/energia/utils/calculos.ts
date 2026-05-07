export function calcularConsumo(leituraAtual: number, leituraAnterior: number): number {
  return Math.max(0, leituraAtual - leituraAnterior);
}

export function calcularValorTotal(consumo: number, tarifa: number): number {
  return consumo * tarifa;
}

export function formatKWh(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh`;
}

export function formatTarifa(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/kWh`;
}

export function formatMesAno(mes: number, ano: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[mes - 1]}/${ano}`;
}

export function formatMesAnoLongo(mes: number, ano: number): string {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[mes - 1]} ${ano}`;
}

export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function getMesAtual(): number {
  return new Date().getMonth() + 1;
}

export function getAnoAtual(): number {
  return new Date().getFullYear();
}

export function gerarMesesContrato(
  mesInicio: number,
  anoInicio: number,
  mesFim: number,
  anoFim: number,
  valorMensal: number
): { mes: number; ano: number; valor: number }[] {
  const result: { mes: number; ano: number; valor: number }[] = [];
  let mes = mesInicio;
  let ano = anoInicio;
  // Safety cap: at most 120 months (10 years)
  let iterations = 0;
  while ((ano < anoFim || (ano === anoFim && mes <= mesFim)) && iterations < 120) {
    result.push({ mes, ano, valor: valorMensal });
    if (mes === 12) { mes = 1; ano++; } else { mes++; }
    iterations++;
  }
  return result;
}
