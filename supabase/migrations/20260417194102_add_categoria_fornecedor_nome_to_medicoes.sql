/*
  # Adicionar colunas categoria e fornecedor_nome em medicoes

  1. Alterações
    - `medicoes`
      - Adiciona coluna `categoria` (text) para categorizar a medição (infraestrutura, superestrutura, etc.)
      - Adiciona coluna `fornecedor_nome` (text) para registrar o nome do fornecedor diretamente
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicoes' AND column_name = 'categoria'
  ) THEN
    ALTER TABLE medicoes ADD COLUMN categoria text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicoes' AND column_name = 'fornecedor_nome'
  ) THEN
    ALTER TABLE medicoes ADD COLUMN fornecedor_nome text;
  END IF;
END $$;
