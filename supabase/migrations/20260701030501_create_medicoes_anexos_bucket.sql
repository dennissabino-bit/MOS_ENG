/*
# Create medicoes-anexos storage bucket

Creates a public storage bucket for measurement attachments (invoices, PDFs, images).
Anon users can read and write, matching the rest of the app's single-tenant policy.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('medicoes-anexos', 'medicoes-anexos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_select_medicoes_anexos" ON storage.objects;
CREATE POLICY "anon_select_medicoes_anexos" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'medicoes-anexos');

DROP POLICY IF EXISTS "anon_insert_medicoes_anexos" ON storage.objects;
CREATE POLICY "anon_insert_medicoes_anexos" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'medicoes-anexos');

DROP POLICY IF EXISTS "anon_update_medicoes_anexos" ON storage.objects;
CREATE POLICY "anon_update_medicoes_anexos" ON storage.objects FOR UPDATE
TO anon, authenticated USING (bucket_id = 'medicoes-anexos') WITH CHECK (bucket_id = 'medicoes-anexos');

DROP POLICY IF EXISTS "anon_delete_medicoes_anexos" ON storage.objects;
CREATE POLICY "anon_delete_medicoes_anexos" ON storage.objects FOR DELETE
TO anon, authenticated USING (bucket_id = 'medicoes-anexos');
