-- cotacao_grupos: one quotation request (e.g. "Brita e Areia")
CREATE TABLE IF NOT EXISTS cotacao_grupos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                TEXT NOT NULL,
  obra_id               UUID REFERENCES obras(id) ON DELETE SET NULL,
  categoria             TEXT,
  status                TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada')),
  fornecedor_vencedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cotacao_grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_cotacao_grupos" ON cotacao_grupos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_cotacao_grupos" ON cotacao_grupos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_cotacao_grupos" ON cotacao_grupos FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_cotacao_grupos" ON cotacao_grupos FOR DELETE TO anon USING (true);

-- cotacao_itens: products/services to be quoted
CREATE TABLE IF NOT EXISTS cotacao_itens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id   UUID NOT NULL REFERENCES cotacao_grupos(id) ON DELETE CASCADE,
  descricao  TEXT NOT NULL,
  unidade    TEXT NOT NULL DEFAULT 'Un',
  quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
  ordem      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cotacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_cotacao_itens" ON cotacao_itens FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_cotacao_itens" ON cotacao_itens FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_cotacao_itens" ON cotacao_itens FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_cotacao_itens" ON cotacao_itens FOR DELETE TO anon USING (true);

-- cotacao_propostas: price per supplier per item
CREATE TABLE IF NOT EXISTS cotacao_propostas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id        UUID NOT NULL REFERENCES cotacao_grupos(id) ON DELETE CASCADE,
  fornecedor_id   UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES cotacao_itens(id) ON DELETE CASCADE,
  preco_unitario  NUMERIC(12,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fornecedor_id, item_id)
);

ALTER TABLE cotacao_propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_cotacao_propostas" ON cotacao_propostas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_cotacao_propostas" ON cotacao_propostas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_cotacao_propostas" ON cotacao_propostas FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_cotacao_propostas" ON cotacao_propostas FOR DELETE TO anon USING (true);
