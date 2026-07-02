ALTER TABLE energia_usuarios
  ADD COLUMN IF NOT EXISTS telas_permitidas text[] DEFAULT NULL;
