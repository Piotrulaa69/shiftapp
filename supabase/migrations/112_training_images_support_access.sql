-- Use the same effective restaurant and role as the course editor. In support
-- mode the profile's own restaurant_id is NULL and its stored role is not owner.
DROP POLICY IF EXISTS "training_images_read_111" ON storage.objects;
DROP POLICY IF EXISTS "training_images_insert_111" ON storage.objects;
DROP POLICY IF EXISTS "training_images_delete_111" ON storage.objects;

DROP POLICY IF EXISTS "training_images_read_112" ON storage.objects;
CREATE POLICY "training_images_read_112" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'training-images'
    AND (storage.foldername(name))[1] = public.my_restaurant_id()::text
  );

DROP POLICY IF EXISTS "training_images_insert_112" ON storage.objects;
CREATE POLICY "training_images_insert_112" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'training-images'
    AND (storage.foldername(name))[1] = public.my_restaurant_id()::text
    AND public.my_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "training_images_delete_112" ON storage.objects;
CREATE POLICY "training_images_delete_112" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'training-images'
    AND (storage.foldername(name))[1] = public.my_restaurant_id()::text
    AND public.my_role() IN ('owner', 'manager')
  );
