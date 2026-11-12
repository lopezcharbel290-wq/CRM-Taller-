CREATE POLICY "evidencias_leer" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidencias');
CREATE POLICY "evidencias_subir" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidencias');
CREATE POLICY "evidencias_borrar_jefe" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'evidencias' AND public.has_role(auth.uid(), 'jefe_taller'));