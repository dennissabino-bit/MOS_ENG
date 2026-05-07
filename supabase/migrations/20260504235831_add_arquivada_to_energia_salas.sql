/*
  # Add arquivada column to energia_salas

  1. Changes
    - `energia_salas`: adds `arquivada` (boolean, default false)
      - When true the sala is soft-deleted and hidden from active listings
      - Can be restored by setting arquivada = false

  2. Notes
    - Existing rows default to false (not archived)
    - No data is lost — archiving is fully reversible
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_salas' AND column_name = 'arquivada'
  ) THEN
    ALTER TABLE energia_salas ADD COLUMN arquivada boolean NOT NULL DEFAULT false;
  END IF;
END $$;
