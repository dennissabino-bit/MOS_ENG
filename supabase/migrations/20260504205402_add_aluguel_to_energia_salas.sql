/*
  # Add rent (aluguel) tracking to energia module

  1. Modified Tables
    - `energia_salas`
      - `valor_aluguel` (numeric, default 0) - Monthly rent value in BRL

  2. New Tables
    - `energia_alugueis` - Monthly rent records per room
      - `id` (uuid, primary key)
      - `sala_id` (uuid, FK to energia_salas)
      - `mes` (integer, 1-12)
      - `ano` (integer)
      - `valor` (numeric) - Rent amount for that month
      - `pago` (boolean, default false) - Whether rent was paid
      - `observacoes` (text) - Notes
      - `created_at` (timestamptz)
      - UNIQUE constraint on (sala_id, mes, ano)

  3. Security
    - RLS enabled on `energia_alugueis`
    - Anon + authenticated access (demo module pattern)
*/

-- Add valor_aluguel column to energia_salas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_salas' AND column_name = 'valor_aluguel'
  ) THEN
    ALTER TABLE energia_salas ADD COLUMN valor_aluguel numeric DEFAULT 0;
  END IF;
END $$;

-- energia_alugueis table
CREATE TABLE IF NOT EXISTS energia_alugueis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id uuid NOT NULL REFERENCES energia_salas(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020),
  valor numeric NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  observacoes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(sala_id, mes, ano)
);

ALTER TABLE energia_alugueis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select energia_alugueis"
  ON energia_alugueis FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert energia_alugueis"
  ON energia_alugueis FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update energia_alugueis"
  ON energia_alugueis FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete energia_alugueis"
  ON energia_alugueis FOR DELETE TO anon
  USING (true);

CREATE POLICY "Allow authenticated select energia_alugueis"
  ON energia_alugueis FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert energia_alugueis"
  ON energia_alugueis FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update energia_alugueis"
  ON energia_alugueis FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete energia_alugueis"
  ON energia_alugueis FOR DELETE TO authenticated
  USING (true);
