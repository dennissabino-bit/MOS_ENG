/*
# Criar tabelas grupos e filiais

## Objetivo
Suporte ao módulo de Configurações do portal MOS Gestor de Obras.

## Novas tabelas

### grupos
- id (uuid, PK)
- codigo (text) — código numérico do grupo, ex: "02"
- nome (text) — nome do grupo, ex: "Grupo Sul"
- created_at (timestamptz)

### filiais
- id (uuid, PK)
- grupo_id (uuid, FK → grupos) — grupo ao qual a filial pertence
- codigo (text) — código da filial, ex: "0401"
- descricao (text) — descrição/nome da filial
- ativa (boolean, default true)
- created_at (timestamptz)
- UNIQUE(grupo_id, codigo) — sem código duplicado dentro do mesmo grupo

## Segurança
- RLS habilitado em ambas as tabelas
- Políticas anon + authenticated para CRUD (app sem autenticação obrigatória)

## Notas
- Estrutura hierárquica: Grupo → Filiais
- Um grupo pode ter múltiplas filiais
- Uma filial pertence a exatamente um grupo
*/

CREATE TABLE IF NOT EXISTS grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS filiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao text NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(grupo_id, codigo)
);

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiais ENABLE ROW LEVEL SECURITY;

-- Grupos policies
DROP POLICY IF EXISTS "anon_select_grupos" ON grupos;
CREATE POLICY "anon_select_grupos" ON grupos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_grupos" ON grupos;
CREATE POLICY "anon_insert_grupos" ON grupos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_grupos" ON grupos;
CREATE POLICY "anon_update_grupos" ON grupos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_grupos" ON grupos;
CREATE POLICY "anon_delete_grupos" ON grupos FOR DELETE TO anon, authenticated USING (true);

-- Filiais policies
DROP POLICY IF EXISTS "anon_select_filiais" ON filiais;
CREATE POLICY "anon_select_filiais" ON filiais FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_filiais" ON filiais;
CREATE POLICY "anon_insert_filiais" ON filiais FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_filiais" ON filiais;
CREATE POLICY "anon_update_filiais" ON filiais FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_filiais" ON filiais;
CREATE POLICY "anon_delete_filiais" ON filiais FOR DELETE TO anon, authenticated USING (true);
