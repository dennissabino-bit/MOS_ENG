/*
  # Add tarifa to energia_unidades

  ## Changes
  - Adds `tarifa` column (numeric, default 0.85) to `energia_unidades`
  - The tarifa is now managed at the unit level and applies to all rooms in that unit
  - Existing units get the default value of 0.85 R$/kWh
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_unidades' AND column_name = 'tarifa'
  ) THEN
    ALTER TABLE energia_unidades ADD COLUMN tarifa numeric NOT NULL DEFAULT 0.85;
  END IF;
END $$;
