/*
  # Add medicao_tipo to energia_salas

  ## Summary
  Adds a new column `medicao_tipo` to the `energia_salas` table to support rooms
  that have their own independent electricity meter and do not require monthly
  energy measurements through the system.

  ## Changes

  ### Modified Tables
  - `energia_salas`
    - New column: `medicao_tipo` (text, NOT NULL, DEFAULT 'medido')
      - `'medido'`         — room shares the building meter; monthly readings required
      - `'relogio_proprio'` — room has its own separate meter; no system measurements needed

  ## Notes
  1. Default value `'medido'` ensures all existing rooms continue working without any data change.
  2. No destructive operations — purely additive migration.
  3. No RLS changes required; existing policies cover the new column automatically.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_salas' AND column_name = 'medicao_tipo'
  ) THEN
    ALTER TABLE energia_salas
      ADD COLUMN medicao_tipo text NOT NULL DEFAULT 'medido';
  END IF;
END $$;
