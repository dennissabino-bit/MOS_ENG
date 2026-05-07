/*
  # Allow anon role to perform CRUD on medicoes

  The app operates without authentication (anon role).
  Existing policies only cover the authenticated role,
  blocking all inserts/updates/deletes for unauthenticated clients.

  This migration adds equivalent policies for the anon role.
*/

CREATE POLICY "Anon users can read medicoes"
  ON medicoes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert medicoes"
  ON medicoes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update medicoes"
  ON medicoes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete medicoes"
  ON medicoes FOR DELETE
  TO anon
  USING (true);
