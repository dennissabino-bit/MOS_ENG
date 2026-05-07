/*
  # Allow anon to update obras imagem_url

  Adds an UPDATE policy so unauthenticated (anon) users can update the
  imagem_url column on obras, enabling thumbnail saves without authentication.
*/

CREATE POLICY "Anon users can update obras imagem_url"
  ON obras
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
