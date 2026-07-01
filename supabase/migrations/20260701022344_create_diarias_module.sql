-- Planilhas de controle de diárias (uma por equipe / quinzena / obra)
CREATE TABLE diarias_planilhas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id     UUID REFERENCES obras(id) ON DELETE SET NULL,
  nome_equipe TEXT        NOT NULL DEFAULT '',
  quinzena    SMALLINT    NOT NULL CHECK (quinzena IN (1, 2)),
  mes         SMALLINT    NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano         INTEGER     NOT NULL,
  data_inicio DATE        NOT NULL,
  localizacao TEXT,
  status      TEXT        NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovada')),
  aprovada_em TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE diarias_planilhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_diarias_planilhas" ON diarias_planilhas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_diarias_planilhas" ON diarias_planilhas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_diarias_planilhas" ON diarias_planilhas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_diarias_planilhas" ON diarias_planilhas FOR DELETE TO anon, authenticated USING (true);

-- Funcionários vinculados a uma planilha
CREATE TABLE diarias_funcionarios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  planilha_id UUID        NOT NULL REFERENCES diarias_planilhas(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  funcao      TEXT        NOT NULL DEFAULT '',
  valor_dia   NUMERIC(10,2) NOT NULL DEFAULT 0,
  ordem       SMALLINT    NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE diarias_funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_diarias_funcionarios" ON diarias_funcionarios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_diarias_funcionarios" ON diarias_funcionarios FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_diarias_funcionarios" ON diarias_funcionarios FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_diarias_funcionarios" ON diarias_funcionarios FOR DELETE TO anon, authenticated USING (true);

-- Presenças (cada registro = funcionário presente naquele slot de dia 1-15)
CREATE TABLE diarias_presencas (
  id             UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  planilha_id    UUID     NOT NULL REFERENCES diarias_planilhas(id) ON DELETE CASCADE,
  funcionario_id UUID     NOT NULL REFERENCES diarias_funcionarios(id) ON DELETE CASCADE,
  dia            SMALLINT NOT NULL CHECK (dia BETWEEN 1 AND 15),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, dia)
);

ALTER TABLE diarias_presencas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_diarias_presencas" ON diarias_presencas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_diarias_presencas" ON diarias_presencas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_diarias_presencas" ON diarias_presencas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_diarias_presencas" ON diarias_presencas FOR DELETE TO anon, authenticated USING (true);
