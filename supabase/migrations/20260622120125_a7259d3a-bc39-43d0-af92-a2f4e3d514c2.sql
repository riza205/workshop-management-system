
CREATE POLICY "auth read car-photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'car-photos');
CREATE POLICY "auth insert car-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'car-photos');
CREATE POLICY "auth delete car-photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'car-photos');
