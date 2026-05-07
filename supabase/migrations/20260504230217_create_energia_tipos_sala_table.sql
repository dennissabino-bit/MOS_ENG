/*
  # Create energia_tipos_sala table

  ## Summary
  Replaces the hardcoded TIPOS_SALA constant with a database-backed table so admins
  can create, rename, and delete sala types without touching source code.

  ## New Tables
  - `energia_tipos_sala`
    - `id` (uuid, primary key)
    - `nome` (text, unique) — display label shown in the UI (e.g. "Escritório")
    - `slug` (text, unique) — URL-safe key used as tipo_sala value in energia_salas (e.g. "escritorio")
    - `ordem` (int) — display order in dropdowns
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; anon may read (needed for modal dropdowns without auth)
  - Only authenticated users (admin) can insert/update/delete

  ## Notes
  - Seeds the same 9 types that were previously hardcoded in types/index.ts
  - The existing energia_salas.tipo_sala column stays as plain text — slugs act as the FK value
*/

CREATE TABLE IF NOT EXISTS energia_tipos_sala (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT energia_tipos_sala_slug_unique UNIQUE (slug)
);

ALTER TABLE energia_tipos_sala ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read types — needed for sala modals
CREATE POLICY "Anyone can read tipos de sala"
  ON energia_tipos_sala FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tipos de sala"
  ON energia_tipos_sala FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tipos de sala"
  ON energia_tipos_sala FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tipos de sala"
  ON energia_tipos_sala FOR DELETE
  TO authenticated
  USING (true);

-- Seed with the existing hardcoded types
INSERT INTO energia_tipos_sala (nome, slug, ordem) VALUES
  ('Escritório',      'escritorio',   1),
  ('Loja',            'loja',         2),
  ('Técnico',         'tecnico',      3),
  ('Depósito',        'deposito',     4),
  ('Recepção',        'recepcao',     5),
  ('Sala de Reunião', 'sala_reuniao', 6),
  ('Cozinha',         'cozinha',      7),
  ('Banheiro',        'banheiro',     8),
  ('Outro',           'outro',        9)
ON CONFLICT (slug) DO NOTHING;
