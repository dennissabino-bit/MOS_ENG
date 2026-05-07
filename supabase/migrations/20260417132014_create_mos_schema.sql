/*
  # MOS Engenharia - Schema Completo

  ## Descrição
  Schema completo para o sistema de gestão de obras MOS Engenharia.

  ## Tabelas Criadas

  1. **obras** - Empreendimentos de construção
     - id, nome, codigo, status, bandeira, localizacao, orcado, realizado, avanco_fisico, data_inicio, data_fim, imagem_url, descricao

  2. **fornecedores** - Fornecedores cadastrados
     - id, nome, categoria, status, contato, email, cnpj, telefone

  3. **cotacoes** - Cotações de suprimentos
     - id, obra_id, fornecedor_id, descricao, valor, status, data_abertura, data_fechamento

  4. **usuarios** - Usuários do sistema
     - id, nome, email, cargo, avatar_iniciais, ativo

  5. **fluxo_financeiro** - Fluxo financeiro mensal por obra
     - id, obra_id, mes, ano, orcado, realizado

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Políticas de acesso para usuários autenticados
*/

CREATE TABLE IF NOT EXISTS obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'planejamento', 'concluida', 'pausada')),
  bandeira text NOT NULL DEFAULT 'BANDEIRA BRANCA',
  localizacao text NOT NULL DEFAULT '',
  orcado numeric(15,2) NOT NULL DEFAULT 0,
  realizado numeric(15,2) NOT NULL DEFAULT 0,
  avanco_fisico numeric(5,2) NOT NULL DEFAULT 0,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  imagem_url text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  contato text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  cnpj text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES obras(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'aprovada', 'cancelada')),
  data_abertura date NOT NULL DEFAULT CURRENT_DATE,
  data_fechamento date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  cargo text NOT NULL DEFAULT 'engenheiro' CHECK (cargo IN ('master', 'gestor', 'engenheiro', 'comprador')),
  avatar_iniciais text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fluxo_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES obras(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  orcado numeric(15,2) NOT NULL DEFAULT 0,
  realizado numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(obra_id, mes, ano)
);

ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view obras"
  ON obras FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert obras"
  ON obras FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update obras"
  ON obras FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete obras"
  ON obras FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fornecedores"
  ON fornecedores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fornecedores"
  ON fornecedores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fornecedores"
  ON fornecedores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fornecedores"
  ON fornecedores FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view cotacoes"
  ON cotacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cotacoes"
  ON cotacoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update cotacoes"
  ON cotacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete cotacoes"
  ON cotacoes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view usuarios"
  ON usuarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert usuarios"
  ON usuarios FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update usuarios"
  ON usuarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete usuarios"
  ON usuarios FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fluxo"
  ON fluxo_financeiro FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fluxo"
  ON fluxo_financeiro FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fluxo"
  ON fluxo_financeiro FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fluxo"
  ON fluxo_financeiro FOR DELETE TO authenticated USING (true);
