
CREATE POLICY "receipts_read" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_update" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');
CREATE POLICY "receipts_delete" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');
