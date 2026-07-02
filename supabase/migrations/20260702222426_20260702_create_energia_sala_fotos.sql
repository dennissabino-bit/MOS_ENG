-- Galeria de fotos por sala
CREATE TABLE IF NOT EXISTS energia_sala_fotos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id     UUID NOT NULL REFERENCES energia_salas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type   TEXT NOT NULL DEFAULT 'image/jpeg',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE energia_sala_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_sala_fotos" ON energia_sala_fotos FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_sala_fotos" ON energia_sala_fotos FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_sala_fotos" ON energia_sala_fotos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_sala_fotos" ON energia_sala_fotos FOR DELETE
  TO anon, authenticated USING (true);
