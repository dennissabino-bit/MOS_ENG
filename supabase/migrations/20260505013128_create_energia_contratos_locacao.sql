/*
  # Create energia_contratos_locacao table

  ## Summary
  Adds a rental contracts table that stores the full lease period and monthly value
  for a room. When a contract is saved, individual monthly records in energia_alugueis
  are generated automatically from mes_inicio/ano_inicio through mes_fim/ano_fim.

  ## New Tables

  ### energia_contratos_locacao
  - `id` (uuid, PK)
  - `sala_id` (uuid, FK → energia_salas) — the room this contract belongs to
  - `valor_mensal` (numeric) — fixed monthly rental amount
  - `mes_inicio` (int, 1-12) — contract start month
  - `ano_inicio` (int) — contract start year
  - `mes_fim` (int, 1-12) — contract end month
  - `ano_fim` (int) — contract end year
  - `observacoes` (text) — optional notes
  - `ativo` (boolean, default true) — whether the contract is currently active
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled; anonymous users can SELECT, INSERT, UPDATE, DELETE
    (matching the existing permissive pattern used for all energia tables)
*/

CREATE TABLE IF NOT EXISTS energia_contratos_locacao (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id       uuid NOT NULL REFERENCES energia_salas(id) ON DELETE CASCADE,
  valor_mensal  numeric(12,2) NOT NULL DEFAULT 0,
  mes_inicio    int NOT NULL CHECK (mes_inicio BETWEEN 1 AND 12),
  ano_inicio    int NOT NULL,
  mes_fim       int NOT NULL CHECK (mes_fim BETWEEN 1 AND 12),
  ano_fim       int NOT NULL,
  observacoes   text NOT NULL DEFAULT '',
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE energia_contratos_locacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select contratos locacao"
  ON energia_contratos_locacao FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon can insert contratos locacao"
  ON energia_contratos_locacao FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update contratos locacao"
  ON energia_contratos_locacao FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can delete contratos locacao"
  ON energia_contratos_locacao FOR DELETE
  TO anon
  USING (true);
