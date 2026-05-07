/*
  # Add tarifa_override to energia_salas

  ## Summary
  Adds an optional tarifa_override column to energia_salas.
  When set, this value takes precedence over the unit's default tarifa
  when calculating energy costs for that room.

  ## Changes
  - energia_salas: new nullable column `tarifa_override` (numeric, default null)
    - null = use the unit's tarifa
    - any positive value = use this tarifa instead

  ## Notes
  - No RLS changes needed (column follows existing sala policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_salas' AND column_name = 'tarifa_override'
  ) THEN
    ALTER TABLE energia_salas ADD COLUMN tarifa_override numeric DEFAULT NULL;
  END IF;
END $$;
