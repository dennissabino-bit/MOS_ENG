/*
  # Add cpf_cnpj to energia_salas

  1. Changes
    - Adds `cpf_cnpj` (text) column to `energia_salas` table, nullable, defaults to empty string.
      Stores the CPF (individual) or CNPJ (company) of the tenant.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_salas' AND column_name = 'cpf_cnpj'
  ) THEN
    ALTER TABLE energia_salas ADD COLUMN cpf_cnpj text NOT NULL DEFAULT '';
  END IF;
END $$;
