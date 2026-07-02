-- Storage RLS policies for sala-fotos bucket
CREATE POLICY "sala_fotos_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sala-fotos');

CREATE POLICY "sala_fotos_anon_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'sala-fotos');

CREATE POLICY "sala_fotos_anon_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'sala-fotos');
