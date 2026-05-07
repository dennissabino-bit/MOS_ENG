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

export interface EnergiaAluguel {
  id: string;
  sala_id: string;
  mes: number;
  ano: number;
  valor: number;
  pago: boolean;
  observacoes: string;
  created_at: string;
}

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
