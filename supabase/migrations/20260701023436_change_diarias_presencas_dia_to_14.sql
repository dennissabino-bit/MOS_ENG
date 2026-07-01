ALTER TABLE diarias_presencas
  DROP CONSTRAINT IF EXISTS diarias_presencas_dia_check,
  ADD CONSTRAINT diarias_presencas_dia_check CHECK (dia BETWEEN 1 AND 14);
