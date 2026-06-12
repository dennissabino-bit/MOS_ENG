DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diario_obra' AND policyname = 'anon_select_diario_obra') THEN
    CREATE POLICY "anon_select_diario_obra" ON diario_obra FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diario_obra' AND policyname = 'anon_insert_diario_obra') THEN
    CREATE POLICY "anon_insert_diario_obra" ON diario_obra FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diario_obra' AND policyname = 'anon_update_diario_obra') THEN
    CREATE POLICY "anon_update_diario_obra" ON diario_obra FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diario_obra' AND policyname = 'anon_delete_diario_obra') THEN
    CREATE POLICY "anon_delete_diario_obra" ON diario_obra FOR DELETE TO anon USING (true);
  END IF;
END $$;