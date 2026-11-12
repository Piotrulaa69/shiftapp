-- Private images for course covers and training topics.
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS image_storage_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-images', 'training-images', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "training_images_read_111" ON storage.objects;
CREATE POLICY "training_images_read_111" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'training-images' AND (storage.foldername(name))[1] IN (
    SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "training_images_insert_111" ON storage.objects;
CREATE POLICY "training_images_insert_111" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training-images' AND (storage.foldername(name))[1] IN (
    SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));

DROP POLICY IF EXISTS "training_images_delete_111" ON storage.objects;
CREATE POLICY "training_images_delete_111" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'training-images' AND (storage.foldername(name))[1] IN (
    SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager')
  ));
