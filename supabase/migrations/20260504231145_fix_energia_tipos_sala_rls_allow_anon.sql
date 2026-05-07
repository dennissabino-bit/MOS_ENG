/*
  # Fix energia_tipos_sala RLS — allow anon writes

  The energia module uses a custom auth system with the anon Supabase role for all
  requests. The previous policies restricted INSERT/UPDATE/DELETE to authenticated,
  which silently blocked all writes. This migration drops those policies and recreates
  them to also include the anon role, matching the pattern used by all other energia tables.
*/

DROP POLICY IF EXISTS "Authenticated users can insert tipos de sala" ON energia_tipos_sala;
DROP POLICY IF EXISTS "Authenticated users can update tipos de sala" ON energia_tipos_sala;
DROP POLICY IF EXISTS "Authenticated users can delete tipos de sala" ON energia_tipos_sala;

CREATE POLICY "Energia tipos sala insert"
  ON energia_tipos_sala FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Energia tipos sala update"
  ON energia_tipos_sala FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Energia tipos sala delete"
  ON energia_tipos_sala FOR DELETE
  TO anon, authenticated
  USING (true);
