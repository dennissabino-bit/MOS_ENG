/*
# Medicoes extras + fornecedores dados bancarios

## Changes

### medicoes table
- `descricao_servico` (text, nullable) — free-text description of the service related to this measurement
- `cotacao_grupo_id` (uuid, nullable, FK → cotacao_grupos) — links the measurement to an existing quotation group
- `notas_fiscais` (jsonb, default '[]') — JSON array of attached files: [{nome, url, tipo}]

### fornecedores table
- `dados_bancarios` (text, nullable) — free-text field for bank details (bank, agency, account, PIX)

## Security
No new RLS policies needed — existing anon policies on medicoes and fornecedores cover the new columns.
*/

ALTER TABLE medicoes
  ADD COLUMN IF NOT EXISTS descricao_servico TEXT,
  ADD COLUMN IF NOT EXISTS cotacao_grupo_id UUID REFERENCES cotacao_grupos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notas_fiscais JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS dados_bancarios TEXT;
