/*
  # Allow anon role to perform CRUD on etapas_eap

  The app does not use authentication, so the Supabase client
  operates as the anon role. The existing policies only cover
  the authenticated role, blocking all inserts/updates/deletes.

  This migration adds equivalent policies for the anon role so
  that new budget items can be created without requiring login.
*/

CREATE POLICY "Anon users can read etapas_eap"
  ON etapas_eap FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert etapas_eap"
  ON etapas_eap FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update etapas_eap"
  ON etapas_eap FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete etapas_eap"
  ON etapas_eap FOR DELETE
  TO anon
  USING (true);
