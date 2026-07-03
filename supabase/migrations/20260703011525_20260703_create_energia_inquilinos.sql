/*
# Create energia_inquilinos table and link to contratos

## Summary
Adds a dedicated inquilinos (tenants) table so tenants can be registered independently
of rooms (salas), enabling the Cadastro flow: register Imóvel first, then Inquilino,
then create a Contrato that links both.

## New Tables

### energia_inquilinos
Stores registered tenants independently from salas.
- `id` (uuid, PK)
- `nome` (text, not null) — full name or company name
- `cpf_cnpj` (text) — CPF or CNPJ identifier
- `rg` (text) — optional RG document number
- `email` (text) — contact email
- `email_fatura` (text) — billing email where invoices are sent
- `telefone` (text) — contact phone
- `ativo` (boolean, default true) — whether tenant is active/available for new contracts
- `created_at` (timestamptz)

## Modified Tables

### energia_contratos_locacao
- Added `inquilino_id` (uuid, nullable FK → energia_inquilinos ON DELETE SET NULL)
  Links a contract to a registered tenant. Nullable for backwards compatibility with
  existing contracts that were created before this migration.

## Security
- RLS enabled on energia_inquilinos with anon CRUD policies (matches existing pattern).
- No changes to existing RLS on energia_contratos_locacao.

## Notes
1. The `inquilino_id` column is nullable so all existing contracts remain valid.
2. Tenant fields on energia_salas (responsavel, cpf_cnpj, email, telefone) are kept
   as-is for backwards compatibility with existing SalaDetalhe views.
3. New contracts created via the Cadastro module will reference inquilino_id.
*/

CREATE TABLE IF NOT EXISTS energia_inquilinos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  cpf_cnpj     text NOT NULL DEFAULT '',
  rg           text NOT NULL DEFAULT '',
  email        text NOT NULL DEFAULT '',
  email_fatura text NOT NULL DEFAULT '',
  telefone     text NOT NULL DEFAULT '',
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE energia_inquilinos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon select inquilinos" ON energia_inquilinos;
CREATE POLICY "anon select inquilinos" ON energia_inquilinos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon insert inquilinos" ON energia_inquilinos;
CREATE POLICY "anon insert inquilinos" ON energia_inquilinos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon update inquilinos" ON energia_inquilinos;
CREATE POLICY "anon update inquilinos" ON energia_inquilinos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon delete inquilinos" ON energia_inquilinos;
CREATE POLICY "anon delete inquilinos" ON energia_inquilinos FOR DELETE
  TO anon, authenticated USING (true);

-- Add inquilino_id FK to contratos (nullable for backwards compat)
ALTER TABLE energia_contratos_locacao
  ADD COLUMN IF NOT EXISTS inquilino_id uuid REFERENCES energia_inquilinos(id) ON DELETE SET NULL;
