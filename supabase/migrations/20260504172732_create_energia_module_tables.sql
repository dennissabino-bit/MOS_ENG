/*
  # Controle de Medicoes de Energia - Modulo Independente

  1. New Tables
    - `energia_usuarios` - Users of the energy module (admin/gerente)
      - `id` (uuid, primary key)
      - `nome` (text) - Full name
      - `email` (text, unique) - Login email
      - `senha_hash` (text) - Password (stored as plain for demo, use bcrypt in prod)
      - `perfil` (text) - 'admin' or 'gerente'
      - `unidade_id` (uuid, nullable) - Linked unit for gerente profile
      - `ativo` (boolean) - Active status
      - `created_at` (timestamptz)

    - `energia_unidades` - Physical units/locations
      - `id` (uuid, primary key)
      - `nome` (text) - Unit name
      - `codigo` (text, unique) - Unit code
      - `endereco` (text) - Address (optional)
      - `gerente_nome` (text) - Manager name
      - `gerente_email` (text) - Manager email
      - `gerente_telefone` (text) - Manager phone
      - `created_at` (timestamptz)

    - `energia_salas` - Rooms within units
      - `id` (uuid, primary key)
      - `unidade_id` (uuid, FK) - Parent unit
      - `nome` (text) - Room name
      - `tipo_sala` (text) - Room type (escritorio, loja, tecnico, etc.)
      - `responsavel` (text) - Responsible person
      - `email` (text) - Contact email
      - `telefone` (text) - Contact phone
      - `ativo` (boolean) - Active status
      - `created_at` (timestamptz)

    - `energia_medicoes` - Monthly energy readings
      - `id` (uuid, primary key)
      - `sala_id` (uuid, FK) - Which room
      - `mes` (integer) - Month (1-12)
      - `ano` (integer) - Year
      - `leitura_anterior` (numeric) - Previous reading kWh
      - `leitura_atual` (numeric) - Current reading kWh
      - `consumo` (numeric) - Calculated: atual - anterior
      - `tarifa` (numeric) - Rate R$/kWh
      - `valor_total` (numeric) - Calculated: consumo * tarifa
      - `foto_url` (text) - Base64 encoded photo or storage URL
      - `observacoes` (text) - Notes
      - `created_at` (timestamptz)
      - UNIQUE constraint on (sala_id, mes, ano)

  2. Security
    - RLS enabled on all tables
    - Policies allow anon + authenticated access (demo module without Supabase Auth)

  3. Seed Data
    - Creates default admin user (admin@energia.com / admin123)
*/

-- energia_usuarios
CREATE TABLE IF NOT EXISTS energia_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  senha_hash text NOT NULL DEFAULT '',
  perfil text NOT NULL DEFAULT 'gerente' CHECK (perfil IN ('admin', 'gerente')),
  unidade_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- energia_unidades
CREATE TABLE IF NOT EXISTS energia_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  codigo text UNIQUE NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  gerente_nome text NOT NULL DEFAULT '',
  gerente_email text NOT NULL DEFAULT '',
  gerente_telefone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- energia_salas
CREATE TABLE IF NOT EXISTS energia_salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES energia_unidades(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  tipo_sala text NOT NULL DEFAULT 'escritorio',
  responsavel text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- energia_medicoes
CREATE TABLE IF NOT EXISTS energia_medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id uuid NOT NULL REFERENCES energia_salas(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano integer NOT NULL CHECK (ano >= 2020),
  leitura_anterior numeric NOT NULL DEFAULT 0,
  leitura_atual numeric NOT NULL DEFAULT 0,
  consumo numeric NOT NULL DEFAULT 0,
  tarifa numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  foto_url text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (sala_id, mes, ano)
);

-- Add FK from usuarios to unidades (after both exist)
ALTER TABLE energia_usuarios
  ADD CONSTRAINT fk_energia_usuarios_unidade
  FOREIGN KEY (unidade_id) REFERENCES energia_unidades(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_energia_salas_unidade ON energia_salas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_energia_medicoes_sala ON energia_medicoes(sala_id);
CREATE INDEX IF NOT EXISTS idx_energia_medicoes_periodo ON energia_medicoes(ano, mes);
CREATE INDEX IF NOT EXISTS idx_energia_usuarios_email ON energia_usuarios(email);

-- Enable RLS
ALTER TABLE energia_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE energia_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE energia_salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE energia_medicoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (demo: allow anon + authenticated full access)
DO $$
BEGIN
  -- energia_usuarios
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_usuarios' AND policyname = 'Energia usuarios select') THEN
    CREATE POLICY "Energia usuarios select" ON energia_usuarios FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_usuarios' AND policyname = 'Energia usuarios insert') THEN
    CREATE POLICY "Energia usuarios insert" ON energia_usuarios FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_usuarios' AND policyname = 'Energia usuarios update') THEN
    CREATE POLICY "Energia usuarios update" ON energia_usuarios FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_usuarios' AND policyname = 'Energia usuarios delete') THEN
    CREATE POLICY "Energia usuarios delete" ON energia_usuarios FOR DELETE TO anon, authenticated USING (true);
  END IF;

  -- energia_unidades
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_unidades' AND policyname = 'Energia unidades select') THEN
    CREATE POLICY "Energia unidades select" ON energia_unidades FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_unidades' AND policyname = 'Energia unidades insert') THEN
    CREATE POLICY "Energia unidades insert" ON energia_unidades FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_unidades' AND policyname = 'Energia unidades update') THEN
    CREATE POLICY "Energia unidades update" ON energia_unidades FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_unidades' AND policyname = 'Energia unidades delete') THEN
    CREATE POLICY "Energia unidades delete" ON energia_unidades FOR DELETE TO anon, authenticated USING (true);
  END IF;

  -- energia_salas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_salas' AND policyname = 'Energia salas select') THEN
    CREATE POLICY "Energia salas select" ON energia_salas FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_salas' AND policyname = 'Energia salas insert') THEN
    CREATE POLICY "Energia salas insert" ON energia_salas FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_salas' AND policyname = 'Energia salas update') THEN
    CREATE POLICY "Energia salas update" ON energia_salas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_salas' AND policyname = 'Energia salas delete') THEN
    CREATE POLICY "Energia salas delete" ON energia_salas FOR DELETE TO anon, authenticated USING (true);
  END IF;

  -- energia_medicoes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_medicoes' AND policyname = 'Energia medicoes select') THEN
    CREATE POLICY "Energia medicoes select" ON energia_medicoes FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_medicoes' AND policyname = 'Energia medicoes insert') THEN
    CREATE POLICY "Energia medicoes insert" ON energia_medicoes FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_medicoes' AND policyname = 'Energia medicoes update') THEN
    CREATE POLICY "Energia medicoes update" ON energia_medicoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energia_medicoes' AND policyname = 'Energia medicoes delete') THEN
    CREATE POLICY "Energia medicoes delete" ON energia_medicoes FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

-- Seed admin user
INSERT INTO energia_usuarios (nome, email, senha_hash, perfil, ativo)
VALUES ('Administrador', 'admin@energia.com', 'admin123', 'admin', true)
ON CONFLICT (email) DO NOTHING;
