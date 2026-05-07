/*
  # Permitir acesso anônimo à tabela usuarios

  1. Alterações de segurança
    - `usuarios`: adiciona políticas SELECT, INSERT, UPDATE e DELETE para usuários anônimos
*/

CREATE POLICY "Anon users can read usuarios"
  ON usuarios FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert usuarios"
  ON usuarios FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update usuarios"
  ON usuarios FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon users can delete usuarios"
  ON usuarios FOR DELETE
  TO anon
  USING (true);
