-- Adiciona tipo (energia | aluguel) em energia_faturas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_faturas' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE energia_faturas
      ADD COLUMN tipo text NOT NULL DEFAULT 'energia'
        CHECK (tipo IN ('energia', 'aluguel'));
  END IF;
END $$;

-- Adiciona sala_id (opcional) em energia_faturas para faturas de aluguel por sala
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_faturas' AND column_name = 'sala_id'
  ) THEN
    ALTER TABLE energia_faturas
      ADD COLUMN sala_id uuid REFERENCES energia_salas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adiciona dia_vencimento em energia_contratos_locacao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'energia_contratos_locacao' AND column_name = 'dia_vencimento'
  ) THEN
    ALTER TABLE energia_contratos_locacao
      ADD COLUMN dia_vencimento int NOT NULL DEFAULT 10 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 28);
  END IF;
END $$;
