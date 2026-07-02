ALTER TABLE energia_medicoes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'a_medir'
    CHECK (status IN ('a_medir', 'aprovado', 'boleto_enviado', 'recebido'));
