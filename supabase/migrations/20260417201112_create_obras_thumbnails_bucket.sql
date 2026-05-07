/*
  # Create obras-thumbnails storage bucket

  Creates a public storage bucket for obra thumbnail images and sets up
  storage policies allowing anon users to upload and read images.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obras-thumbnails',
  'obras-thumbnails',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anon can upload obra thumbnails"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'obras-thumbnails');

CREATE POLICY "Anyone can read obra thumbnails"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'obras-thumbnails');

CREATE POLICY "Anon can update obra thumbnails"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'obras-thumbnails');

CREATE POLICY "Anon can delete obra thumbnails"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'obras-thumbnails');
