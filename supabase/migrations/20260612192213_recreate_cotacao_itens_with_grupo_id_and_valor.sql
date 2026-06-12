-- Drop old cotacao_itens (it references cotacoes, not cotacao_grupos)
-- First drop tables that depend on it
DROP TABLE IF EXISTS cotacao_precos CASCADE;
DROP TABLE IF EXISTS cotacao_fornecedores CASCADE;
DROP TABLE IF EXISTS cotacao_itens CASCADE;

-- Recreate cotacao_itens linked to cotacao_grupos, with valor_unitario
CREATE TABLE cotacao_itens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       UUID NOT NULL REFERENCES cotacao_grupos(id) ON DELETE CASCADE,
  descricao      TEXT NOT NULL DEFAULT '',
  unidade        TEXT NOT NULL DEFAULT 'Un',
  quantidade     NUMERIC(12,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2),
  ordem          INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cotacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_cotacao_itens" ON cotacao_itens FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_cotacao_itens" ON cotacao_itens FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_cotacao_itens" ON cotacao_itens FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_cotacao_itens" ON cotacao_itens FOR DELETE TO anon USING (true);

-- Re-add the FK from cotacao_propostas that was dropped with CASCADE
ALTER TABLE cotacao_propostas
  ADD CONSTRAINT cotacao_propostas_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES cotacao_itens(id) ON DELETE CASCADE;
