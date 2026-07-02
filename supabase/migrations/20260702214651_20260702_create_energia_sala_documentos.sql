/*
# Cria tabela de documentos de sala e bucket de storage

## Contexto
Permite anexar documentos a uma sala: contratos gerados automaticamente,
documentos do locatario (RG, contrato assinado, etc.) e outros arquivos relevantes.

## Novas Tabelas

### `energia_sala_documentos`
- `id` (uuid, primary key)
- `sala_id` (uuid, FK energia_salas) - Sala a qual o documento pertence
- `nome` (text) - Nome de exibicao do documento
- `tipo` (text) - Categoria: 'contrato_gerado' | 'documento_locatario' | 'outro'
- `url` (text) - URL publica do arquivo no Supabase Storage
- `tamanho_bytes` (integer) - Tamanho do arquivo em bytes (opcional)
- `mime_type` (text) - MIME type do arquivo (ex: application/pdf)
- `created_at` (timestamptz)

## Seguranca
- RLS habilitado
- Politicas para anon + authenticated (app sem autenticacao de usuario final)

## Storage
- Bucket `energia-sala-documentos` com acesso publico para leitura
*/

CREATE TABLE IF NOT EXISTS energia_sala_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id uuid NOT NULL REFERENCES energia_salas(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('contrato_gerado', 'documento_locatario', 'outro')),
  url text NOT NULL DEFAULT '',
  tamanho_bytes integer,
  mime_type text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_energia_sala_documentos_sala ON energia_sala_documentos(sala_id);

ALTER TABLE energia_sala_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sala_documentos" ON energia_sala_documentos;
CREATE POLICY "anon_select_sala_documentos" ON energia_sala_documentos FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sala_documentos" ON energia_sala_documentos;
CREATE POLICY "anon_insert_sala_documentos" ON energia_sala_documentos FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sala_documentos" ON energia_sala_documentos;
CREATE POLICY "anon_update_sala_documentos" ON energia_sala_documentos FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sala_documentos" ON energia_sala_documentos;
CREATE POLICY "anon_delete_sala_documentos" ON energia_sala_documentos FOR DELETE
TO anon, authenticated USING (true);

-- Cria bucket de storage para documentos (idempotente via INSERT ... ON CONFLICT DO NOTHING)
INSERT INTO storage.buckets (id, name, public)
VALUES ('energia-sala-documentos', 'energia-sala-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Politicas de storage
DROP POLICY IF EXISTS "energia_sala_docs_select" ON storage.objects;
CREATE POLICY "energia_sala_docs_select" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'energia-sala-documentos');

DROP POLICY IF EXISTS "energia_sala_docs_insert" ON storage.objects;
CREATE POLICY "energia_sala_docs_insert" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'energia-sala-documentos');

DROP POLICY IF EXISTS "energia_sala_docs_delete" ON storage.objects;
CREATE POLICY "energia_sala_docs_delete" ON storage.objects FOR DELETE
TO anon, authenticated USING (bucket_id = 'energia-sala-documentos');
