/*
# Adiciona campos de reajuste e historico aos contratos de locacao

## Contexto
Permite registrar o indice de reajuste anual (IGP-M, IPCA, INPC ou percentual fixo)
em cada contrato de locacao, e rastrear o historico de renovacoes ao vincular um
contrato reajustado ao contrato que o originou.

## Mudancas

### Tabela `energia_contratos_locacao`
- `indice_reajuste` (text, default 'fixo') - Indice de reajuste: 'igpm' | 'ipca' | 'inpc' | 'fixo'
- `percentual_reajuste` (numeric, default 0) - Percentual aplicado no reajuste (ex: 5.5 = 5,5%)
- `contrato_origem_id` (uuid, nullable) - FK para o contrato anterior quando se trata de renovacao/reajuste

### Tabela `energia_salas`
- `email_fatura` (text, default '') - Email especifico para recebimento de fatura (se diferente do email de contato)

## Seguranca
Sem mudancas de politicas RLS — as politicas existentes ja cobrem as novas colunas.
*/

-- Adiciona campos de reajuste ao contrato
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energia_contratos_locacao' AND column_name = 'indice_reajuste') THEN
    ALTER TABLE energia_contratos_locacao ADD COLUMN indice_reajuste text NOT NULL DEFAULT 'fixo' CHECK (indice_reajuste IN ('igpm', 'ipca', 'inpc', 'fixo'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energia_contratos_locacao' AND column_name = 'percentual_reajuste') THEN
    ALTER TABLE energia_contratos_locacao ADD COLUMN percentual_reajuste numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energia_contratos_locacao' AND column_name = 'contrato_origem_id') THEN
    ALTER TABLE energia_contratos_locacao ADD COLUMN contrato_origem_id uuid REFERENCES energia_contratos_locacao(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energia_salas' AND column_name = 'email_fatura') THEN
    ALTER TABLE energia_salas ADD COLUMN email_fatura text NOT NULL DEFAULT '';
  END IF;
END $$;
