import type { Obra, Fornecedor, Cotacao, Usuario, FluxoFinanceiro, EtapaEap, Medicao, CronogramaEtapa, CurvaS, DiarioObra } from './database.types';

const ID_AURORA    = '1b016876-d98f-4917-8791-1d6af5e28ef9';
const ID_MARAJO    = 'd5bfb0d5-83c1-49f0-8bda-ef71c0db69dc';
const ID_VISTA_SUL = 'a4c80866-faec-4b83-b85a-7f360fd6e47e';
const ID_GALPAO    = '6d35649a-6889-4293-bf03-5f7d9a3b95de';
const ID_IPIRANGA  = '8d070d27-a6c0-478a-85bf-a6de8f5e07a8';
const ID_RAIZEN    = 'b3aa2714-ce2b-4a60-b2fb-da730c066bf7';

export const mockFluxo: FluxoFinanceiro[] = [
  { id: '1', obra_id: 'all', mes: 1, ano: 2025, orcado: 350000, realizado: 290000, created_at: '' },
  { id: '2', obra_id: 'all', mes: 2, ano: 2025, orcado: 571000, realizado: 491000, created_at: '' },
  { id: '3', obra_id: 'all', mes: 3, ano: 2025, orcado: 818000, realizado: 730000, created_at: '' },
  { id: '4', obra_id: 'all', mes: 4, ano: 2025, orcado: 1100000, realizado: 960000, created_at: '' },
  { id: '5', obra_id: 'all', mes: 5, ano: 2025, orcado: 1300000, realizado: 1200000, created_at: '' },
  { id: '6', obra_id: 'all', mes: 6, ano: 2025, orcado: 1700000, realizado: 1400000, created_at: '' },
];

export const mockObras: Obra[] = [
  {
    id: ID_AURORA,
    nome: 'Residencial Aurora',
    codigo: 'MOS-2026-001',
    status: 'em_andamento',
    bandeira: 'Residencial Multifamiliar',
    tipo: 'Residencial Multifamiliar',
    localizacao: 'Av. das Flores, 1.200 — Jardim Paulistano, PA',
    engenheiro: 'Eng. Mariana Fonseca',
    orcado: 4975200,
    realizado: 2930000,
    avanco_fisico: 14,
    data_inicio: '2026-01-01',
    data_fim: '2028-07-31',
    imagem_url: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800',
    descricao: 'Empreendimento residencial multifamiliar com 5 etapas macro e orçamento total de R$ 4,97M',
    created_at: '',
    updated_at: '',
  },
  {
    id: ID_MARAJO,
    nome: 'Comercial Marajó',
    codigo: 'MOS-2024-002',
    status: 'em_andamento',
    bandeira: 'Comercial',
    tipo: 'Comercial',
    localizacao: 'Av. Marajó, 450 — Centro, PA',
    engenheiro: 'Eng. Ricardo Oliveira',
    orcado: 850000,
    realizado: 920000,
    avanco_fisico: 108,
    data_inicio: '2024-03-01',
    data_fim: '2025-06-30',
    imagem_url: 'https://images.pexels.com/photos/1546168/pexels-photo-1546168.jpeg?auto=compress&cs=tinysrgb&w=800',
    descricao: 'Edificio comercial no centro de Marajó',
    created_at: '',
    updated_at: '',
  },
  {
    id: ID_VISTA_SUL,
    nome: 'Condomínio Vista Sul',
    codigo: 'MOS-2024-003',
    status: 'em_andamento',
    bandeira: 'Residencial',
    tipo: 'Residencial',
    localizacao: 'Rua Vista Sul, 800 — Ananindeua, PA',
    engenheiro: 'Eng. Ana Paula Mendes',
    orcado: 750000,
    realizado: 620000,
    avanco_fisico: 55,
    data_inicio: '2024-05-01',
    data_fim: '2025-11-30',
    imagem_url: 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=800',
    descricao: 'Condomínio residencial Vista Sul',
    created_at: '',
    updated_at: '',
  },
  {
    id: ID_GALPAO,
    nome: 'Galpão Industrial Norte',
    codigo: 'MOS-2024-0071',
    status: 'em_andamento',
    bandeira: 'Industrial',
    tipo: 'Industrial',
    localizacao: 'Distrito Industrial, Quadra 12 — Castanhal, PA',
    engenheiro: 'Eng. Marcos Vinicius',
    orcado: 900000,
    realizado: 860000,
    avanco_fisico: 91,
    data_inicio: '2024-02-05',
    data_fim: '2025-08-31',
    imagem_url: 'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg?auto=compress&cs=tinysrgb&w=800',
    descricao: 'Galpão industrial de 2.400m² no Distrito Industrial de Castanhal',
    created_at: '',
    updated_at: '',
  },
  {
    id: ID_IPIRANGA,
    nome: 'Posto Ipiranga Centro',
    codigo: 'MOS-2024-005',
    status: 'em_andamento',
    bandeira: 'Bandeira Ipiranga',
    tipo: 'Posto de Combustível',
    localizacao: 'Av. Presidente Vargas, 1.200 — Centro, Belém, PA',
    engenheiro: 'Eng. Mariana Fonseca',
    orcado: 4850000,
    realizado: 2930000,
    avanco_fisico: 60,
    data_inicio: '2024-12-02',
    data_fim: '2025-11-30',
    imagem_url: 'https://images.pexels.com/photos/1004409/pexels-photo-1004409.jpeg?auto=compress&cs=tinysrgb&w=800',
    descricao: 'Posto de combustíveis Ipiranga no centro de Belém com 18 medições registradas',
    created_at: '',
    updated_at: '',
  },
  {
    id: ID_RAIZEN,
    nome: 'Posto Raízen Igarapé-Miri',
    codigo: '#2023-07',
    status: 'concluida',
    bandeira: 'Bandeira Shell',
    tipo: 'Posto de Combustível',
    localizacao: 'Igarapé-Miri, PA',
    engenheiro: 'Eng. Carlos Mendes',
    orcado: 1100000,
    realizado: 1087500,
    avanco_fisico: 100,
    data_inicio: '2023-07-01',
    data_fim: '2024-12-31',
    imagem_url: 'https://images.pexels.com/photos/1004409/pexels-photo-1004409.jpeg?auto=compress&cs=tinysrgb&w=800',
    descricao: 'Posto Raízen concluído em Igarapé-Miri',
    created_at: '',
    updated_at: '',
  },
];

export const mockFornecedores: Fornecedor[] = [
  { id: '1', nome: 'Pará Máquinas & Equipamentos', categoria: 'Equipamentos', status: 'ativo', contato: 'João Silva', email: 'joao@paramaquinas.com.br', cnpj: '12.345.678/0001-90', telefone: '(91) 3322-1100', created_at: '' },
  { id: '2', nome: 'Concretiza Pará LTDA', categoria: 'Concreto', status: 'ativo', contato: 'Maria Santos', email: 'maria@concretizapara.com.br', cnpj: '98.765.432/0001-10', telefone: '(91) 3344-5566', created_at: '' },
  { id: '3', nome: 'Aço Norte Distribuidora', categoria: 'Materiais Metálicos', status: 'ativo', contato: 'Pedro Costa', email: 'pedro@aconorte.com.br', cnpj: '45.678.901/0001-23', telefone: '(91) 3355-7788', created_at: '' },
  { id: '4', nome: 'Distribuidora Tapajós', categoria: 'Materiais de Construção', status: 'ativo', contato: 'Ana Lima', email: 'ana@tapajosmat.com.br', cnpj: '23.456.789/0001-45', telefone: '(91) 3366-9900', created_at: '' },
  { id: '5', nome: 'Elétrica Marajó', categoria: 'Instalações Elétricas', status: 'ativo', contato: 'Carlos Ferreira', email: 'carlos@eletricamarajo.com.br', cnpj: '67.890.123/0001-67', telefone: '(91) 3377-1122', created_at: '' },
  { id: '6', nome: 'Hidráulica Belém', categoria: 'Instalações Hidráulicas', status: 'ativo', contato: 'Roberto Alves', email: 'roberto@hidraulicabelem.com.br', cnpj: '34.567.890/0001-89', telefone: '(91) 3388-3344', created_at: '' },
  { id: '7', nome: 'Cimento Norte LTDA', categoria: 'Materiais de Construção', status: 'ativo', contato: 'Fernanda Rocha', email: 'fernanda@cimentonorte.com.br', cnpj: '89.012.345/0001-01', telefone: '(91) 3399-5566', created_at: '' },
  { id: '8', nome: 'Engepara Serviços Técnicos', categoria: 'Serviços', status: 'ativo', contato: 'Marcos Souza', email: 'marcos@engepara.com.br', cnpj: '56.789.012/0001-34', telefone: '(91) 3400-7788', created_at: '' },
];

export const mockCotacoes: Cotacao[] = [
  { id: '1', obra_id: ID_AURORA, fornecedor_id: '1', descricao: 'Fornecimento de cimento CP-IV 50kg', valor: 45000, status: 'aberta', data_abertura: '2025-05-01', data_fechamento: null, created_at: '', obras: { nome: 'Residencial Aurora', codigo: 'MOS-2026-001' }, fornecedores: { nome: 'Pará Máquinas & Equipamentos' } },
  { id: '2', obra_id: ID_MARAJO, fornecedor_id: '2', descricao: 'Fornecimento de vergalhões CA-50', valor: 87000, status: 'aberta', data_abertura: '2025-05-03', data_fechamento: null, created_at: '', obras: { nome: 'Comercial Marajó', codigo: 'MOS-2024-002' }, fornecedores: { nome: 'Concretiza Pará LTDA' } },
  { id: '3', obra_id: ID_VISTA_SUL, fornecedor_id: '3', descricao: 'Instalação elétrica completa', valor: 120000, status: 'aprovada', data_abertura: '2025-04-15', data_fechamento: '2025-04-30', created_at: '', obras: { nome: 'Condomínio Vista Sul', codigo: 'MOS-2024-003' }, fornecedores: { nome: 'Aço Norte Distribuidora' } },
  { id: '4', obra_id: ID_GALPAO, fornecedor_id: '4', descricao: 'Sistema hidráulico predial', valor: 95000, status: 'aberta', data_abertura: '2025-05-10', data_fechamento: null, created_at: '', obras: { nome: 'Galpão Industrial Norte', codigo: 'MOS-2024-0071' }, fornecedores: { nome: 'Distribuidora Tapajós' } },
  { id: '5', obra_id: ID_IPIRANGA, fornecedor_id: '5', descricao: 'Transporte de materiais', valor: 35000, status: 'aberta', data_abertura: '2025-05-12', data_fechamento: null, created_at: '', obras: { nome: 'Posto Ipiranga Centro', codigo: 'MOS-2024-005' }, fornecedores: { nome: 'Elétrica Marajó' } },
  { id: '6', obra_id: ID_AURORA, fornecedor_id: '6', descricao: 'Fornecimento de madeira beneficiada', valor: 28000, status: 'fechada', data_abertura: '2025-04-20', data_fechamento: '2025-05-02', created_at: '', obras: { nome: 'Residencial Aurora', codigo: 'MOS-2026-001' }, fornecedores: { nome: 'Hidráulica Belém' } },
  { id: '7', obra_id: ID_VISTA_SUL, fornecedor_id: '8', descricao: 'Impermeabilização de laje', valor: 42000, status: 'aberta', data_abertura: '2025-05-08', data_fechamento: null, created_at: '', obras: { nome: 'Condomínio Vista Sul', codigo: 'MOS-2024-003' }, fornecedores: { nome: 'Engepara Serviços Técnicos' } },
];

export const mockUsuarios: Usuario[] = [
  { id: '1', nome: 'Diego Esteves', email: 'de@mosengenharia.com.br', cargo: 'administrador', avatar_iniciais: 'DE', ativo: true, created_at: '' },
  { id: '2', nome: 'Ana Paula Ribeiro', email: 'apr@mosengenharia.com.br', cargo: 'gerente', avatar_iniciais: 'AP', ativo: true, created_at: '' },
  { id: '3', nome: 'Carlos Mendes', email: 'cm@mosengenharia.com.br', cargo: 'engenheiro', avatar_iniciais: 'CM', ativo: true, created_at: '' },
  { id: '4', nome: 'Fernanda Costa', email: 'fc@mosengenharia.com.br', cargo: 'gestor', avatar_iniciais: 'FC', ativo: true, created_at: '' },
  { id: '5', nome: 'Rafael Lima', email: 'rl@mosengenharia.com.br', cargo: 'engenheiro', avatar_iniciais: 'RL', ativo: true, created_at: '' },
  { id: '6', nome: 'Mariana Souza', email: 'ms@mosengenharia.com.br', cargo: 'operacional', avatar_iniciais: 'MS', ativo: true, created_at: '' },
];

export const mockEtapasEap: EtapaEap[] = [
  { id: 'e1', obra_id: ID_AURORA, codigo: '1.0', descricao: 'Infraestrutura', nivel: 'macro', data_inicio: 'Jan/26', data_fim: 'Fev/26', valor_unitario: 0, valor_total: 850000, categoria: 'infraestrutura', is_extra: false, created_at: '' },
  { id: 'e1-1', obra_id: ID_AURORA, codigo: '1.1', descricao: 'Sondagem à percussão e locação de obra', nivel: 'sub', data_inicio: 'Jan/26', data_fim: 'Jan/26', unidade: 'vb', quantidade: 1, valor_unitario: 28000, valor_total: 28000, categoria: 'infraestrutura', is_extra: false, created_at: '' },
  { id: 'e1-2', obra_id: ID_AURORA, codigo: '1.2', descricao: 'Fundação em estacas raiz D=30cm', nivel: 'sub', data_inicio: 'Jan/26', data_fim: 'Fev/26', unidade: 'm', quantidade: 500, valor_unitario: 560, valor_total: 280000, categoria: 'infraestrutura', is_extra: false, created_at: '' },
  { id: 'e1-3', obra_id: ID_AURORA, codigo: '1.3', descricao: 'Estrutura em concreto armado (fck 30)', nivel: 'sub', data_inicio: 'Fev/26', data_fim: 'Mai/26', unidade: 'm²', quantidade: 300, valor_unitario: 1420, valor_total: 426000, categoria: 'infraestrutura', is_extra: false, created_at: '' },
  { id: 'e1-4', obra_id: ID_AURORA, codigo: '1.4', descricao: 'Impermeabilização de fundações (manta)', nivel: 'sub', data_inicio: 'Fev/26', data_fim: 'Fev/26', unidade: 'm²', quantidade: 580, valor_unitario: 200, valor_total: 116000, categoria: 'infraestrutura', is_extra: false, created_at: '' },

  { id: 'e2', obra_id: ID_AURORA, codigo: '2.0', descricao: 'Superestrutura', nivel: 'macro', data_inicio: 'Mar/26', data_fim: 'Jun/26', valor_unitario: 0, valor_total: 920000, categoria: 'superestrutura', is_extra: false, created_at: '' },
  { id: 'e2-1', obra_id: ID_AURORA, codigo: '2.1', descricao: 'Alvenaria de vedação (BL cerâmico 14cm)', nivel: 'sub', data_inicio: 'Mar/26', data_fim: 'Jun/26', unidade: 'm²', quantidade: 3200, valor_unitario: 90, valor_total: 288000, categoria: 'superestrutura', is_extra: false, created_at: '' },
  { id: 'e2-2', obra_id: ID_AURORA, codigo: '2.2', descricao: 'Cobertura — estrutura metálica + telha', nivel: 'sub', data_inicio: 'Abr/26', data_fim: 'Jun/26', unidade: 'm²', quantidade: 700, valor_unitario: 180, valor_total: 126000, categoria: 'superestrutura', is_extra: false, created_at: '' },
  { id: 'e2-3', obra_id: ID_AURORA, codigo: '2.3', descricao: 'Escadas e rampas de concreto', nivel: 'sub', data_inicio: 'Mar/26', data_fim: 'Mai/26', unidade: 'vb', quantidade: 1, valor_unitario: 185000, valor_total: 185000, categoria: 'superestrutura', is_extra: false, created_at: '' },
  { id: 'e2-4', obra_id: ID_AURORA, codigo: '2.4', descricao: 'Laje impermeabilizada de cobertura', nivel: 'sub', data_inicio: 'Mai/26', data_fim: 'Jun/26', unidade: 'm²', quantidade: 600, valor_unitario: 535, valor_total: 321000, categoria: 'superestrutura', is_extra: false, created_at: '' },

  { id: 'e3', obra_id: ID_AURORA, codigo: '3.0', descricao: 'Instalações Prediais', nivel: 'macro', data_inicio: 'Mai/26', data_fim: 'Ago/26', valor_unitario: 0, valor_total: 1280000, categoria: 'instalacoes', is_extra: false, created_at: '' },
  { id: 'e3-1', obra_id: ID_AURORA, codigo: '3.1', descricao: 'Instalações elétricas e iluminação', nivel: 'sub', data_inicio: 'Mai/26', data_fim: 'Ago/26', unidade: 'vb', quantidade: 1, valor_unitario: 620000, valor_total: 620000, categoria: 'instalacoes', is_extra: false, created_at: '' },
  { id: 'e3-2', obra_id: ID_AURORA, codigo: '3.2', descricao: 'Instalações hidrossanitárias completas', nivel: 'sub', data_inicio: 'Mai/26', data_fim: 'Ago/26', unidade: 'vb', quantidade: 1, valor_unitario: 480000, valor_total: 480000, categoria: 'instalacoes', is_extra: false, created_at: '' },
  { id: 'e3-3', obra_id: ID_AURORA, codigo: '3.3', descricao: 'SPDA e sistema de aterramento', nivel: 'sub', data_inicio: 'Jun/26', data_fim: 'Jul/26', unidade: 'vb', quantidade: 1, valor_unitario: 85000, valor_total: 85000, categoria: 'instalacoes', is_extra: false, created_at: '' },
  { id: 'e3-4', obra_id: ID_AURORA, codigo: '3.4', descricao: 'Cabeamento estruturado e interfonia', nivel: 'sub', data_inicio: 'Jul/26', data_fim: 'Ago/26', unidade: 'vb', quantidade: 1, valor_unitario: 95000, valor_total: 95000, categoria: 'instalacoes', is_extra: false, created_at: '' },

  { id: 'e4', obra_id: ID_AURORA, codigo: '4.0', descricao: 'Acabamentos', nivel: 'macro', data_inicio: 'Set/26', data_fim: 'Dez/26', valor_unitario: 0, valor_total: 1800000, categoria: 'acabamentos', is_extra: false, created_at: '' },
  { id: 'e4-1', obra_id: ID_AURORA, codigo: '4.1', descricao: 'Piso cerâmico — áreas comuns 60×60cm', nivel: 'sub', data_inicio: 'Set/26', data_fim: 'Out/26', unidade: 'm²', quantidade: 1800, valor_unitario: 150, valor_total: 270000, categoria: 'acabamentos', is_extra: false, created_at: '' },
  { id: 'e4-2', obra_id: ID_AURORA, codigo: '4.2', descricao: 'Piso porcelanato — apartamentos 60×60cm', nivel: 'sub', data_inicio: 'Set/26', data_fim: 'Nov/26', unidade: 'm²', quantidade: 2950, valor_unitario: 200, valor_total: 590000, categoria: 'acabamentos', is_extra: false, created_at: '' },
  { id: 'e4-3', obra_id: ID_AURORA, codigo: '4.3', descricao: 'Revestimento cerâmico — banheiros', nivel: 'sub', data_inicio: 'Out/26', data_fim: 'Nov/26', unidade: 'm²', quantidade: 1000, valor_unitario: 110, valor_total: 110000, categoria: 'acabamentos', is_extra: false, created_at: '' },
  { id: 'e4-4', obra_id: ID_AURORA, codigo: '4.4', descricao: 'Pintura acrílica premium (paredes/teto)', nivel: 'sub', data_inicio: 'Nov/26', data_fim: 'Dez/26', unidade: 'm²', quantidade: 9200, valor_unitario: 28, valor_total: 257600, categoria: 'acabamentos', is_extra: false, created_at: '' },
  { id: 'e4-5', obra_id: ID_AURORA, codigo: '4.5', descricao: 'Esquadrias de alumínio — fachada e unidades', nivel: 'sub', data_inicio: 'Set/26', data_fim: 'Out/26', unidade: 'm²', quantidade: 310, valor_unitario: 1800, valor_total: 558000, categoria: 'acabamentos', is_extra: false, created_at: '' },
  { id: 'e4-6', obra_id: ID_AURORA, codigo: '4.6', descricao: 'Louças, metais e acessórios sanitários', nivel: 'sub', data_inicio: 'Nov/26', data_fim: 'Dez/26', unidade: 'cj', quantidade: 48, valor_unitario: 300, valor_total: 14400, categoria: 'acabamentos', is_extra: false, created_at: '' },

  { id: 'e5', obra_id: ID_AURORA, codigo: 'E.0', descricao: 'Custo Extraordinário (Variações Aprovadas)', nivel: 'macro', valor_unitario: 0, valor_total: 125200, categoria: 'extra', is_extra: true, created_at: '' },
  { id: 'e5-1', obra_id: ID_AURORA, codigo: 'E.01', descricao: 'Acréscimo no quantitativo de estacas (variação de projeto)', nivel: 'sub', data_inicio: 'Jan/26', data_fim: 'Fev/26', unidade: 'm', quantidade: 141, valor_unitario: 580, valor_total: 81780, categoria: 'extra', is_extra: true, created_at: '' },
  { id: 'e5-2', obra_id: ID_AURORA, codigo: 'E.02', descricao: 'Ampliação hall de entrada — aprovado em reunião 04/2024', nivel: 'sub', data_inicio: 'Mar/26', data_fim: 'Abr/26', unidade: 'vb', quantidade: 1, valor_unitario: 43420, valor_total: 43420, categoria: 'extra', is_extra: true, created_at: '' },
];

export const mockMedicoes: Medicao[] = [
  { id: 'm1', obra_id: ID_IPIRANGA, codigo: '1.1', descricao: 'Escavação Mecânica', unidade: 'm²', qtd_orcada: 520, qtd_medida: 520, valor_unitario: 115, valor_total: 59800, status: 'aprovada', fornecedor_nome: 'Pará Máquinas & Equipamentos', categoria: 'infraestrutura', created_at: '' },
  { id: 'm2', obra_id: ID_IPIRANGA, codigo: '1.2', descricao: 'Concreto para Fundações', unidade: 'm²', qtd_orcada: 245, qtd_medida: 245, valor_unitario: 1250, valor_total: 306250, status: 'aprovada', fornecedor_nome: 'Concretiza Pará LTDA', categoria: 'infraestrutura', created_at: '' },
  { id: 'm3', obra_id: ID_IPIRANGA, codigo: '1.3', descricao: 'Armação — Fundações (CA-50)', unidade: 't', qtd_orcada: 1, qtd_medida: 32, valor_unitario: 5800, valor_total: 185600, status: 'aprovada', fornecedor_nome: 'Aço Norte Distribuidora', categoria: 'infraestrutura', created_at: '' },
  { id: 'm4', obra_id: ID_IPIRANGA, codigo: '1.4', descricao: 'Impermeabilização de Fundações', unidade: 'm²', qtd_orcada: 980, qtd_medida: 980, valor_unitario: 88, valor_total: 86240, status: 'aprovada', fornecedor_nome: 'Distribuidora Tapajós', categoria: 'infraestrutura', created_at: '' },

  { id: 'm5', obra_id: ID_IPIRANGA, codigo: '2.1', descricao: 'Concreto — Pilares e Vigas', unidade: 'm²', qtd_orcada: 215, qtd_medida: 215, valor_unitario: 1100, valor_total: 236500, status: 'aprovada', fornecedor_nome: 'Concretiza Pará LTDA', categoria: 'superestrutura', created_at: '' },
  { id: 'm6', obra_id: ID_IPIRANGA, codigo: '2.2', descricao: 'Concreto — Lajes Maciças', unidade: 'm²', qtd_orcada: 480, qtd_medida: 480, valor_unitario: 975, valor_total: 468000, status: 'aprovada', fornecedor_nome: 'Concretiza Pará LTDA', categoria: 'superestrutura', created_at: '' },
  { id: 'm7', obra_id: ID_IPIRANGA, codigo: '2.3', descricao: 'Armação Estrutural (CA-50/60)', unidade: 't', qtd_orcada: 1, qtd_medida: 92, valor_unitario: 5200, valor_total: 478400, status: 'aprovada', fornecedor_nome: 'Aço Norte Distribuidora', categoria: 'superestrutura', created_at: '' },
  { id: 'm8', obra_id: ID_IPIRANGA, codigo: '2.4', descricao: 'Forma para Concreto (compensado)', unidade: 'm²', qtd_orcada: 1350, qtd_medida: 1200, valor_unitario: 68, valor_total: 81600, status: 'pendente', fornecedor_nome: 'Distribuidora Tapajós', categoria: 'superestrutura', created_at: '' },
  { id: 'm9', obra_id: ID_IPIRANGA, codigo: '2.5', descricao: 'Alvenaria de Vedação (bloco cerâmico)', unidade: 'm²', qtd_orcada: 4200, qtd_medida: 1800, valor_unitario: 52, valor_total: 93600, status: 'pendente', fornecedor_nome: 'Cimento Norte LTDA', categoria: 'superestrutura', created_at: '' },

  { id: 'm10', obra_id: ID_IPIRANGA, codigo: '3.1', descricao: 'Instalação Elétrica (por unidade)', unidade: 'vb', qtd_orcada: 48, qtd_medida: 48, valor_unitario: 8400, valor_total: 403200, status: 'aprovada', fornecedor_nome: 'Elétrica Marajó', categoria: 'instalacoes', created_at: '' },
  { id: 'm11', obra_id: ID_IPIRANGA, codigo: '3.2', descricao: 'Instalação Hidrossanitária (por unidade)', unidade: 'vb', qtd_orcada: 48, qtd_medida: 48, valor_unitario: 5600, valor_total: 268800, status: 'aprovada', fornecedor_nome: 'Hidráulica Belém', categoria: 'instalacoes', created_at: '' },
  { id: 'm12', obra_id: ID_IPIRANGA, codigo: '3.3', descricao: 'SPDA — Para-raios e Aterramento', unidade: 'vb', qtd_orcada: 1, qtd_medida: 1, valor_unitario: 48000, valor_total: 48000, status: 'aprovada', fornecedor_nome: 'Elétrica Marajó', categoria: 'instalacoes', created_at: '' },
  { id: 'm13', obra_id: ID_IPIRANGA, codigo: '3.4', descricao: 'Instalação de Gás Natural (por unidade)', unidade: 'vb', qtd_orcada: 48, qtd_medida: 20, valor_unitario: 1950, valor_total: 39000, status: 'reprovada', fornecedor_nome: 'Hidráulica Belém', categoria: 'instalacoes', created_at: '' },

  { id: 'm14', obra_id: ID_IPIRANGA, codigo: '4.1', descricao: 'Revestimento Cerâmico Interno', unidade: 'm²', qtd_orcada: 3200, qtd_medida: 1800, valor_unitario: 95, valor_total: 171000, status: 'aprovada', fornecedor_nome: 'Distribuidora Tapajós', categoria: 'acabamentos', created_at: '' },
  { id: 'm15', obra_id: ID_IPIRANGA, codigo: '4.2', descricao: 'Pintura Interna (látex PVA)', unidade: 'm²', qtd_orcada: 8400, qtd_medida: 3200, valor_unitario: 24, valor_total: 76800, status: 'pendente', fornecedor_nome: 'Distribuidora Tapajós', categoria: 'acabamentos', created_at: '' },
  { id: 'm16', obra_id: ID_IPIRANGA, codigo: '4.3', descricao: 'Esquadrias de Alumínio', unidade: 'un', qtd_orcada: 192, qtd_medida: 48, valor_unitario: 850, valor_total: 40800, status: 'pendente', fornecedor_nome: 'Aço Norte Distribuidora', categoria: 'acabamentos', created_at: '' },
  { id: 'm17', obra_id: ID_IPIRANGA, codigo: '4.4', descricao: 'Forro de Gesso Liso', unidade: 'm²', qtd_orcada: 2400, qtd_medida: undefined, valor_unitario: 42, valor_total: undefined, status: 'a_medir', fornecedor_nome: 'Engepara Serviços Técnicos', categoria: 'acabamentos', created_at: '' },
  { id: 'm18', obra_id: ID_IPIRANGA, codigo: '4.5', descricao: 'Limpeza Geral e Entrega de Unidades', unidade: 'm²', qtd_orcada: 4800, qtd_medida: 2400, valor_unitario: 46, valor_total: 110400, status: 'aprovada', fornecedor_nome: 'Engepara Serviços Técnicos', categoria: 'acabamentos', created_at: '' },
];

export const mockCronograma: CronogramaEtapa[] = [
  { id: 'c1', obra_id: ID_AURORA, etapa_codigo: '1.0', etapa_nome: 'Infraestrutura', valor_total: 2810000, status: 'em_andamento', avanco_percent: 14, data_inicio_planejada: 'Jan/26', data_fim_planejada: 'Jul/26', created_at: '' },
  { id: 'c2', obra_id: ID_AURORA, etapa_codigo: '2.0', etapa_nome: 'Superestrutura', valor_total: 920000, status: 'em_andamento', avanco_percent: 33, data_inicio_planejada: 'Mar/26', data_fim_planejada: 'Jun/26', created_at: '' },
  { id: 'c3', obra_id: ID_AURORA, etapa_codigo: '3.0', etapa_nome: 'Instalações Prediais', valor_total: 3260000, status: 'aguardando', avanco_percent: 0, data_inicio_planejada: 'Mai/26', data_fim_planejada: 'Nov/26', created_at: '' },
  { id: 'c4', obra_id: ID_AURORA, etapa_codigo: '4.0', etapa_nome: 'Acabamentos', valor_total: 1800000, status: 'aguardando', avanco_percent: 0, data_inicio_planejada: 'Set/26', data_fim_planejada: 'Dez/26', created_at: '' },
  { id: 'c5', obra_id: ID_AURORA, etapa_codigo: 'E.0', etapa_nome: 'Custo Extraordinário (Variaç...)', valor_total: 125000, status: 'em_andamento', avanco_percent: 21, data_inicio_planejada: 'Jan/26', data_fim_planejada: 'Abr/26', created_at: '' },
];

export const mockCurvaS: CurvaS[] = [
  { id: 'cs1', obra_id: ID_AURORA, mes: 1, ano: 2026, planejado_acum: 2, realizado_acum: 1, mensal: 1, created_at: '' },
  { id: 'cs2', obra_id: ID_AURORA, mes: 2, ano: 2026, planejado_acum: 5, realizado_acum: 3, mensal: 2, created_at: '' },
  { id: 'cs3', obra_id: ID_AURORA, mes: 3, ano: 2026, planejado_acum: 9, realizado_acum: 7, mensal: 4, created_at: '' },
  { id: 'cs4', obra_id: ID_AURORA, mes: 4, ano: 2026, planejado_acum: 14, realizado_acum: 14, mensal: 7, created_at: '' },
  { id: 'cs5', obra_id: ID_AURORA, mes: 5, ano: 2026, planejado_acum: 21, realizado_acum: 0, mensal: 0, created_at: '' },
  { id: 'cs6', obra_id: ID_AURORA, mes: 6, ano: 2026, planejado_acum: 29, realizado_acum: 0, mensal: 0, created_at: '' },

  { id: 'cs7', obra_id: ID_GALPAO, mes: 2, ano: 2024, planejado_acum: 8, realizado_acum: 8, mensal: 8, created_at: '' },
  { id: 'cs8', obra_id: ID_GALPAO, mes: 3, ano: 2024, planejado_acum: 22, realizado_acum: 22, mensal: 14, created_at: '' },
  { id: 'cs9', obra_id: ID_GALPAO, mes: 4, ano: 2024, planejado_acum: 38, realizado_acum: 39, mensal: 17, created_at: '' },
  { id: 'cs10', obra_id: ID_GALPAO, mes: 5, ano: 2024, planejado_acum: 54, realizado_acum: 55, mensal: 16, created_at: '' },
  { id: 'cs11', obra_id: ID_GALPAO, mes: 6, ano: 2024, planejado_acum: 68, realizado_acum: 70, mensal: 15, created_at: '' },
  { id: 'cs12', obra_id: ID_GALPAO, mes: 7, ano: 2024, planejado_acum: 80, realizado_acum: 80, mensal: 10, created_at: '' },
  { id: 'cs13', obra_id: ID_GALPAO, mes: 8, ano: 2024, planejado_acum: 88, realizado_acum: 87, mensal: 7, created_at: '' },
  { id: 'cs14', obra_id: ID_GALPAO, mes: 9, ano: 2024, planejado_acum: 94, realizado_acum: 90, mensal: 3, created_at: '' },
  { id: 'cs15', obra_id: ID_GALPAO, mes: 10, ano: 2024, planejado_acum: 97, realizado_acum: 91, mensal: 1, created_at: '' },
  { id: 'cs16', obra_id: ID_GALPAO, mes: 11, ano: 2024, planejado_acum: 99, realizado_acum: 91, mensal: 0, created_at: '' },
  { id: 'cs17', obra_id: ID_GALPAO, mes: 12, ano: 2024, planejado_acum: 100, realizado_acum: 91, mensal: 0, created_at: '' },
];

export const mockFluxoObra: Record<string, FluxoFinanceiro[]> = {
  [ID_GALPAO]: [
    { id: 'fo1', obra_id: ID_GALPAO, mes: 2, ano: 2024, orcado: 72000, realizado: 70000, created_at: '' },
    { id: 'fo2', obra_id: ID_GALPAO, mes: 3, ano: 2024, orcado: 198000, realizado: 194000, created_at: '' },
    { id: 'fo3', obra_id: ID_GALPAO, mes: 4, ano: 2024, orcado: 342000, realizado: 836000, created_at: '' },
    { id: 'fo4', obra_id: ID_GALPAO, mes: 5, ano: 2024, orcado: 486000, realizado: 477000, created_at: '' },
    { id: 'fo5', obra_id: ID_GALPAO, mes: 6, ano: 2024, orcado: 612000, realizado: 598000, created_at: '' },
    { id: 'fo6', obra_id: ID_GALPAO, mes: 7, ano: 2024, orcado: 720000, realizado: 706000, created_at: '' },
    { id: 'fo7', obra_id: ID_GALPAO, mes: 8, ano: 2024, orcado: 810000, realizado: 794000, created_at: '' },
    { id: 'fo8', obra_id: ID_GALPAO, mes: 9, ano: 2024, orcado: 873000, realizado: 855000, created_at: '' },
    { id: 'fo9', obra_id: ID_GALPAO, mes: 10, ano: 2024, orcado: 900000, realizado: 880000, created_at: '' },
    { id: 'fo10', obra_id: ID_GALPAO, mes: 11, ano: 2024, orcado: 900000, realizado: 868000, created_at: '' },
    { id: 'fo11', obra_id: ID_GALPAO, mes: 12, ano: 2024, orcado: 900000, realizado: 860000, created_at: '' },
  ],
  [ID_AURORA]: [
    { id: 'fo12', obra_id: ID_AURORA, mes: 1, ano: 2026, orcado: 250000, realizado: 180000, created_at: '' },
    { id: 'fo13', obra_id: ID_AURORA, mes: 2, ano: 2026, orcado: 500000, realizado: 380000, created_at: '' },
    { id: 'fo14', obra_id: ID_AURORA, mes: 3, ano: 2026, orcado: 750000, realizado: 620000, created_at: '' },
    { id: 'fo15', obra_id: ID_AURORA, mes: 4, ano: 2026, orcado: 1100000, realizado: 930000, created_at: '' },
    { id: 'fo16', obra_id: ID_AURORA, mes: 5, ano: 2026, orcado: 1500000, realizado: 0, created_at: '' },
    { id: 'fo17', obra_id: ID_AURORA, mes: 6, ano: 2026, orcado: 2000000, realizado: 0, created_at: '' },
  ],
};

export const mockDiario: DiarioObra[] = [
  { id: 'd1', obra_id: ID_AURORA, data: '2026-04-15', autor_nome: 'Eng. Mariana Fonseca', autor_iniciais: 'MF', autor_cargo: 'engenheiro', titulo: 'Concretagem das vigas do 3º pavimento', descricao: 'Realizada concretagem de 48m³ de concreto fck 30 para as vigas do 3º pavimento. Lançamento iniciado às 07h30 e finalizado às 14h. Cobertura com lona úmida para cura. Slump test dentro do esperado (10±2cm). Presença de fiscal da concessionária.', etapa_tag: '1.0 Infraestrutura', created_at: '' },
  { id: 'd2', obra_id: ID_AURORA, data: '2026-04-14', autor_nome: 'Diego Esteves', autor_iniciais: 'DE', autor_cargo: 'administrador', titulo: 'Aprovação das variações de projeto — Reunião 04/2026', descricao: 'Reunião com cliente aprovando ampliação do hall de entrada (E.02) e acréscimo no quantitativo de estacas (E.01). Ata assinada por ambas as partes. Valores aditados ao contrato: R$ 125.200,00. Prazo não impactado.', etapa_tag: 'E.0 Custo Extraordinário', created_at: '' },
  { id: 'd3', obra_id: ID_AURORA, data: '2026-04-12', autor_nome: 'Eng. Mariana Fonseca', autor_iniciais: 'MF', autor_cargo: 'engenheiro', titulo: 'Sondagem complementar — resultados', descricao: 'Recebidos resultados da sondagem complementar (SPT pontos 09 a 14). Solo argiloso encontrado a partir de 6m de profundidade em 3 pontos da área nordeste. Profundidade de cravação das estacas ajustada para 12m nesta região. Impacto em custo já aprovado na reunião de variação.', etapa_tag: '1.0 Infraestrutura', created_at: '' },
  { id: 'd4', obra_id: ID_AURORA, data: '2026-04-10', autor_nome: 'Ana Paula Ribeiro', autor_iniciais: 'AP', autor_cargo: 'gerente', titulo: 'Medição #04 submetida para aprovação', descricao: 'Medição do mês de abril submetida ao cliente com total de R$ 412.000,00 abrangendo as etapas 1.0 e 2.0. Aguardando aprovação do responsável técnico do cliente em até 5 dias úteis.', etapa_tag: '2.0 Superestrutura', created_at: '' },
  { id: 'd5', obra_id: ID_AURORA, data: '2026-04-08', autor_nome: 'Eng. Mariana Fonseca', autor_iniciais: 'MF', autor_cargo: 'engenheiro', titulo: 'Instalação das formas para fundação — blocos B3 e B4', descricao: 'Finalizada instalação de formas metálicas nos blocos B3 e B4. Armação já posicionada e conferida pelo engenheiro de estruturas. Concretagem programada para 15/04 sujeita a condições climáticas.', etapa_tag: '1.0 Infraestrutura', created_at: '' },
];
