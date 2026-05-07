/*
  # Create Obra Detail Tables: etapas_eap, medicoes, cronograma_etapas, curva_s

  ## Summary
  This migration creates the four tables required to support the detailed obra pages:
  Orçamento, Cronograma, Medições, and the Curva S charts.

  ## New Tables

  ### 1. etapas_eap
  The budget breakdown table (Work Breakdown Structure). Stores hierarchical items
  for each obra, including macro-phases (level 1) and sub-items (level 2).
  - id, obra_id, codigo (e.g. "1.0", "1.1"), descricao, nivel ("macro" | "sub")
  - data_inicio, data_fim (ISO date strings like "Jan/26")
  - unidade, quantidade, valor_unitario, valor_total
  - categoria (infraestrutura | superestrutura | instalacoes | acabamentos | extra)
  - is_extra (boolean for variações aprovadas)

  ### 2. medicoes
  Measurement records per line item per obra. Links to etapas_eap and fornecedores.
  - id, obra_id, etapa_eap_id, fornecedor_id
  - codigo, descricao, unidade
  - qtd_orcada, qtd_medida, valor_unitario, valor_total
  - status (aprovada | pendente | reprovada | a_medir)
  - data_medicao

  ### 3. cronograma_etapas
  Physical schedule tracking per EAP phase per obra.
  - id, obra_id, etapa_eap_id, status (concluida | em_andamento | atrasada | aguardando)
  - avanco_percent (0-100)
  - data_inicio_real, data_fim_real

  ### 4. curva_s
  Monthly S-curve data points for planned vs realized progress.
  - id, obra_id, mes, ano, planejado_acum (%), realizado_acum (%)

  ## Security
  - RLS enabled on all four tables
  - Authenticated users can read all rows
  - Only master/gestor roles would write (enforced at app level; RLS allows authenticated inserts)
*/

CREATE TABLE IF NOT EXISTS etapas_eap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL,
  codigo text NOT NULL,
  descricao text NOT NULL,
  nivel text NOT NULL DEFAULT 'sub',
  data_inicio text,
  data_fim text,
  unidade text,
  quantidade numeric,
  valor_unitario numeric DEFAULT 0,
  valor_total numeric DEFAULT 0,
  categoria text NOT NULL DEFAULT 'infraestrutura',
  is_extra boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE etapas_eap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read etapas_eap"
  ON etapas_eap FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert etapas_eap"
  ON etapas_eap FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update etapas_eap"
  ON etapas_eap FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete etapas_eap"
  ON etapas_eap FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL,
  etapa_eap_id uuid,
  fornecedor_id uuid,
  codigo text NOT NULL,
  descricao text NOT NULL,
  unidade text DEFAULT 'm²',
  qtd_orcada numeric DEFAULT 0,
  qtd_medida numeric,
  valor_unitario numeric DEFAULT 0,
  valor_total numeric,
  status text NOT NULL DEFAULT 'a_medir',
  data_medicao date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read medicoes"
  ON medicoes FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert medicoes"
  ON medicoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update medicoes"
  ON medicoes FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete medicoes"
  ON medicoes FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS cronograma_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL,
  etapa_eap_id uuid,
  etapa_codigo text NOT NULL,
  etapa_nome text NOT NULL,
  valor_total numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando',
  avanco_percent numeric DEFAULT 0,
  data_inicio_planejada text,
  data_fim_planejada text,
  data_inicio_real text,
  data_fim_real text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cronograma_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cronograma_etapas"
  ON cronograma_etapas FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cronograma_etapas"
  ON cronograma_etapas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cronograma_etapas"
  ON cronograma_etapas FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cronograma_etapas"
  ON cronograma_etapas FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS curva_s (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL,
  mes integer NOT NULL,
  ano integer NOT NULL,
  planejado_acum numeric DEFAULT 0,
  realizado_acum numeric DEFAULT 0,
  mensal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE curva_s ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read curva_s"
  ON curva_s FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert curva_s"
  ON curva_s FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update curva_s"
  ON curva_s FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete curva_s"
  ON curva_s FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS diario_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL,
  data date NOT NULL,
  autor_nome text NOT NULL,
  autor_iniciais text NOT NULL,
  autor_cargo text NOT NULL DEFAULT 'engenheiro',
  titulo text NOT NULL,
  descricao text NOT NULL,
  etapa_tag text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diario_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read diario_obra"
  ON diario_obra FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert diario_obra"
  ON diario_obra FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update diario_obra"
  ON diario_obra FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete diario_obra"
  ON diario_obra FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
