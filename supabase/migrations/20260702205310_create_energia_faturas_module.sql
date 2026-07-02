-- energia_faturas: unified invoice per unidade per period
CREATE TABLE IF NOT EXISTS energia_faturas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id      UUID NOT NULL REFERENCES energia_unidades(id) ON DELETE CASCADE,
  mes             INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano             INTEGER NOT NULL CHECK (ano >= 2020),
  status          TEXT NOT NULL DEFAULT 'rascunho'
                    CHECK (status IN ('rascunho','enviada','visualizada','paga','vencida')),
  valor_energia   NUMERIC NOT NULL DEFAULT 0,
  valor_aluguel   NUMERIC NOT NULL DEFAULT 0,
  valor_total     NUMERIC GENERATED ALWAYS AS (valor_energia + valor_aluguel) STORED,
  destinatario_nome   TEXT NOT NULL DEFAULT '',
  destinatario_email  TEXT NOT NULL DEFAULT '',
  destinatario_cpf_cnpj TEXT NOT NULL DEFAULT '',
  pix_chave       TEXT,
  codigo_barras   TEXT,
  data_vencimento DATE,
  data_envio      TIMESTAMPTZ,
  data_pagamento  DATE,
  observacoes     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE energia_faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_energia_faturas" ON energia_faturas FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_energia_faturas" ON energia_faturas FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_energia_faturas" ON energia_faturas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_energia_faturas" ON energia_faturas FOR DELETE
  TO anon, authenticated USING (true);

-- energia_fatura_itens: line items per invoice
CREATE TABLE IF NOT EXISTS energia_fatura_itens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id   UUID NOT NULL REFERENCES energia_faturas(id) ON DELETE CASCADE,
  sala_id     UUID REFERENCES energia_salas(id) ON DELETE SET NULL,
  medicao_id  UUID REFERENCES energia_medicoes(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('energia','aluguel')),
  descricao   TEXT NOT NULL DEFAULT '',
  valor       NUMERIC NOT NULL DEFAULT 0,
  mes         INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano         INTEGER NOT NULL CHECK (ano >= 2020),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE energia_fatura_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_energia_fatura_itens" ON energia_fatura_itens FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_energia_fatura_itens" ON energia_fatura_itens FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_energia_fatura_itens" ON energia_fatura_itens FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_energia_fatura_itens" ON energia_fatura_itens FOR DELETE
  TO anon, authenticated USING (true);

-- Add fatura_id link to energia_alugueis
ALTER TABLE energia_alugueis
  ADD COLUMN IF NOT EXISTS fatura_id UUID REFERENCES energia_faturas(id) ON DELETE SET NULL;

ALTER TABLE energia_alugueis
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','faturado','recebido'));

-- Add fatura_id link to energia_medicoes
ALTER TABLE energia_medicoes
  ADD COLUMN IF NOT EXISTS fatura_id UUID REFERENCES energia_faturas(id) ON DELETE SET NULL;
