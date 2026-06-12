export type ObraStatus = 'em_andamento' | 'planejamento' | 'concluida' | 'pausada';
export type CotacaoStatus = 'aberta' | 'fechada' | 'aprovada' | 'cancelada';
export type FornecedorStatus = 'ativo' | 'inativo';
export type UserCargo = 'master' | 'gestor' | 'engenheiro' | 'comprador';
export type MedicaoStatus = 'aprovada' | 'pendente' | 'reprovada' | 'a_medir';
export type CronogramaStatus = 'concluida' | 'em_andamento' | 'atrasada' | 'aguardando';
export type EapCategoria = 'infraestrutura' | 'superestrutura' | 'instalacoes' | 'acabamentos' | 'extra';
export type EapNivel = 'macro' | 'sub';

export interface Obra {
  id: string;
  nome: string;
  codigo: string;
  status: ObraStatus;
  arquivada: boolean;
  bandeira: string;
  tipo: string;
  localizacao: string;
  engenheiro: string;
  orcado: number;
  realizado: number;
  avanco_fisico: number;
  data_inicio: string;
  data_fim: string;
  imagem_url: string;
  descricao: string;
  created_at: string;
  updated_at: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  categoria: string;
  status: FornecedorStatus;
  contato: string;
  email: string;
  cnpj: string;
  telefone: string;
  cidade?: string;
  estado?: string;
  created_at: string;
}

export interface Cotacao {
  id: string;
  obra_id: string | null;
  fornecedor_id: string | null;
  descricao: string;
  valor: number;
  status: CotacaoStatus;
  data_abertura: string;
  data_fechamento: string | null;
  created_at: string;
  obras?: Pick<Obra, 'nome' | 'codigo'>;
  fornecedores?: Pick<Fornecedor, 'nome'>;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: UserCargo;
  avatar_iniciais: string;
  ativo: boolean;
  created_at: string;
}

export interface FluxoFinanceiro {
  id: string;
  obra_id: string;
  mes: number;
  ano: number;
  orcado: number;
  realizado: number;
  created_at: string;
}

export interface EtapaEap {
  id: string;
  obra_id: string;
  codigo: string;
  descricao: string;
  nivel: EapNivel;
  data_inicio?: string;
  data_fim?: string;
  unidade?: string;
  quantidade?: number;
  valor_unitario: number;
  valor_total: number;
  categoria: EapCategoria;
  is_extra: boolean;
  created_at: string;
}

export interface Medicao {
  id: string;
  obra_id: string;
  etapa_eap_id?: string;
  fornecedor_id?: string;
  codigo: string;
  descricao: string;
  unidade: string;
  qtd_orcada: number;
  qtd_medida?: number;
  valor_unitario: number;
  valor_total?: number;
  status: MedicaoStatus;
  data_medicao?: string;
  created_at: string;
  fornecedor_nome?: string;
  categoria?: EapCategoria;
}

export interface CronogramaEtapa {
  id: string;
  obra_id: string;
  etapa_eap_id?: string;
  etapa_codigo: string;
  etapa_nome: string;
  valor_total: number;
  status: CronogramaStatus;
  avanco_percent: number;
  data_inicio_planejada?: string;
  data_fim_planejada?: string;
  data_inicio_real?: string;
  data_fim_real?: string;
  created_at: string;
}

export interface CurvaS {
  id: string;
  obra_id: string;
  mes: number;
  ano: number;
  planejado_acum: number;
  realizado_acum: number;
  mensal: number;
  created_at: string;
}

export interface DiarioObra {
  id: string;
  obra_id: string;
  data: string;
  autor_nome: string;
  autor_iniciais: string;
  autor_cargo: UserCargo;
  titulo: string;
  descricao: string;
  etapa_tag?: string;
  created_at: string;
}

export type CotacaoGrupoStatus = 'aberta' | 'fechada';

export interface CotacaoGrupo {
  id: string;
  titulo: string;
  obra_id: string | null;
  categoria: string | null;
  status: CotacaoGrupoStatus;
  fornecedor_vencedor_id: string | null;
  created_at: string;
  obras?: Pick<Obra, 'nome' | 'codigo'>;
  fornecedores?: Pick<Fornecedor, 'nome'>;
}

export interface CotacaoItem {
  id: string;
  grupo_id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number | null;
  ordem: number;
  created_at: string;
}

export interface CotacaoProposta {
  id: string;
  grupo_id: string;
  fornecedor_id: string;
  item_id: string;
  preco_unitario: number | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      obras: { Row: Obra; Insert: Omit<Obra, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Obra, 'id'>> };
      fornecedores: { Row: Fornecedor; Insert: Omit<Fornecedor, 'id' | 'created_at'>; Update: Partial<Omit<Fornecedor, 'id'>> };
      cotacoes: { Row: Cotacao; Insert: Omit<Cotacao, 'id' | 'created_at' | 'obras' | 'fornecedores'>; Update: Partial<Omit<Cotacao, 'id'>> };
      usuarios: { Row: Usuario; Insert: Omit<Usuario, 'id' | 'created_at'>; Update: Partial<Omit<Usuario, 'id'>> };
      fluxo_financeiro: { Row: FluxoFinanceiro; Insert: Omit<FluxoFinanceiro, 'id' | 'created_at'>; Update: Partial<Omit<FluxoFinanceiro, 'id'>> };
      etapas_eap: { Row: EtapaEap; Insert: Omit<EtapaEap, 'id' | 'created_at'>; Update: Partial<Omit<EtapaEap, 'id'>> };
      medicoes: { Row: Medicao; Insert: Omit<Medicao, 'id' | 'created_at'>; Update: Partial<Omit<Medicao, 'id'>> };
      cronograma_etapas: { Row: CronogramaEtapa; Insert: Omit<CronogramaEtapa, 'id' | 'created_at'>; Update: Partial<Omit<CronogramaEtapa, 'id'>> };
      curva_s: { Row: CurvaS; Insert: Omit<CurvaS, 'id' | 'created_at'>; Update: Partial<Omit<CurvaS, 'id'>> };
      diario_obra: { Row: DiarioObra; Insert: Omit<DiarioObra, 'id' | 'created_at'>; Update: Partial<Omit<DiarioObra, 'id'>> };
      energia_usuarios: { Row: import('../energia/types').EnergiaUsuario; Insert: Omit<import('../energia/types').EnergiaUsuario, 'id' | 'created_at'>; Update: Partial<Omit<import('../energia/types').EnergiaUsuario, 'id'>> };
      energia_unidades: { Row: import('../energia/types').EnergiaUnidade; Insert: Omit<import('../energia/types').EnergiaUnidade, 'id' | 'created_at'>; Update: Partial<Omit<import('../energia/types').EnergiaUnidade, 'id'>> };
      energia_salas: { Row: import('../energia/types').EnergiaSala; Insert: Omit<import('../energia/types').EnergiaSala, 'id' | 'created_at'>; Update: Partial<Omit<import('../energia/types').EnergiaSala, 'id'>> };
      energia_medicoes: { Row: import('../energia/types').EnergiaMedicao; Insert: Omit<import('../energia/types').EnergiaMedicao, 'id' | 'created_at'>; Update: Partial<Omit<import('../energia/types').EnergiaMedicao, 'id'>> };
    };
  };
}
