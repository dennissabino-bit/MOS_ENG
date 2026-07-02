export type EnergiaPerfil = 'admin' | 'gerente';

export interface EnergiaUsuario {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  perfil: EnergiaPerfil;
  unidade_id: string | null;
  ativo: boolean;
  created_at: string;
}

export interface EnergiaUnidade {
  id: string;
  nome: string;
  codigo: string;
  endereco: string;
  cidade: string;
  estado: string;
  gerente_nome: string;
  gerente_email: string;
  gerente_telefone: string;
  tarifa: number;
  created_at: string;
}

export type MedicaoTipo = 'medido' | 'relogio_proprio';

export interface EnergiaSala {
  id: string;
  unidade_id: string;
  nome: string;
  tipo_sala: string;
  medicao_tipo: MedicaoTipo;
  responsavel: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  valor_aluguel: number;
  tarifa_override: number | null;
  ativo: boolean;
  arquivada: boolean;
  created_at: string;
}

export const MEDICAO_TIPO_LABEL: Record<MedicaoTipo, string> = {
  medido: 'Medição interna',
  relogio_proprio: 'Relógio separado',
};

export interface EnergiaContratoLocacao {
  id: string;
  sala_id: string;
  valor_mensal: number;
  mes_inicio: number;
  ano_inicio: number;
  mes_fim: number;
  ano_fim: number;
  observacoes: string;
  ativo: boolean;
  created_at: string;
}

export type EnergiaAluguelStatus = 'pendente' | 'faturado' | 'recebido';

export interface EnergiaAluguel {
  id: string;
  sala_id: string;
  mes: number;
  ano: number;
  valor: number;
  pago: boolean;
  status: EnergiaAluguelStatus;
  fatura_id: string | null;
  observacoes: string;
  created_at: string;
}

export type EnergiaMedicaoStatus = 'a_medir' | 'aprovado' | 'boleto_enviado' | 'recebido';

export interface EnergiaMedicao {
  id: string;
  sala_id: string;
  mes: number;
  ano: number;
  leitura_anterior: number;
  leitura_atual: number;
  consumo: number;
  tarifa: number;
  valor_total: number;
  foto_url: string;
  observacoes: string;
  status: EnergiaMedicaoStatus;
  fatura_id: string | null;
  created_at: string;
}

export type EnergiaFaturaStatus = 'rascunho' | 'enviada' | 'visualizada' | 'paga' | 'vencida';

export interface EnergiaFatura {
  id: string;
  unidade_id: string;
  mes: number;
  ano: number;
  status: EnergiaFaturaStatus;
  valor_energia: number;
  valor_aluguel: number;
  valor_total: number;
  destinatario_nome: string;
  destinatario_email: string;
  destinatario_cpf_cnpj: string;
  pix_chave: string | null;
  codigo_barras: string | null;
  data_vencimento: string | null;
  data_envio: string | null;
  data_pagamento: string | null;
  observacoes: string;
  created_at: string;
}

export type EnergiaFaturaItemTipo = 'energia' | 'aluguel';

export interface EnergiaFaturaItem {
  id: string;
  fatura_id: string;
  sala_id: string | null;
  medicao_id: string | null;
  tipo: EnergiaFaturaItemTipo;
  descricao: string;
  valor: number;
  mes: number;
  ano: number;
  created_at: string;
}

export interface EnergiaTipoSala {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  created_at: string;
}

// Kept as fallback for display when dynamic types haven't loaded yet
export const TIPOS_SALA_LABEL: Record<string, string> = {
  escritorio: 'Escritório',
  loja: 'Loja',
  tecnico: 'Técnico',
  deposito: 'Depósito',
  recepcao: 'Recepção',
  sala_reuniao: 'Sala de Reunião',
  cozinha: 'Cozinha',
  banheiro: 'Banheiro',
  outro: 'Outro',
};

export const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export const MEDICAO_STATUS_CONFIG: Record<EnergiaMedicaoStatus, { label: string; bg: string; text: string; border: string }> = {
  a_medir:       { label: 'A Medir',        bg: 'bg-surface-2',           text: 'text-text-disabled',  border: 'border-surface-3' },
  aprovado:      { label: 'Aprovado',        bg: 'bg-status-successLight', text: 'text-status-success', border: 'border-status-success/30' },
  boleto_enviado:{ label: 'Boleto Enviado',  bg: 'bg-status-warningLight', text: 'text-status-warning', border: 'border-status-warning/30' },
  recebido:      { label: 'Recebido',        bg: 'bg-blue-50',             text: 'text-blue-600',       border: 'border-blue-200' },
};

export const FATURA_STATUS_CONFIG: Record<EnergiaFaturaStatus, { label: string; bg: string; text: string; border: string }> = {
  rascunho:   { label: 'Rascunho',   bg: 'bg-surface-2',           text: 'text-text-secondary', border: 'border-surface-3' },
  enviada:    { label: 'Enviada',    bg: 'bg-blue-50',             text: 'text-blue-600',       border: 'border-blue-200' },
  visualizada:{ label: 'Visualizada',bg: 'bg-status-warningLight', text: 'text-status-warning', border: 'border-status-warning/30' },
  paga:       { label: 'Paga',       bg: 'bg-status-successLight', text: 'text-status-success', border: 'border-status-success/30' },
  vencida:    { label: 'Vencida',    bg: 'bg-status-errorLight',   text: 'text-status-error',   border: 'border-status-error/30' },
};
