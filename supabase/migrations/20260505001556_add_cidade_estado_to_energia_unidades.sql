/*
  # Add cidade and estado to energia_unidades

  Adds two optional text columns to the energia_unidades table:
  - `cidade`: city name
  - `estado`: state abbreviation (e.g., SP, RJ)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_unidades' AND column_name = 'cidade'
  ) THEN
    ALTER TABLE energia_unidades ADD COLUMN cidade text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_unidades' AND column_name = 'estado'
  ) THEN
    ALTER TABLE energia_unidades ADD COLUMN estado text NOT NULL DEFAULT '';
  END IF;
END $$;
