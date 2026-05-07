/*
  # Permitir acesso anônimo de escrita em fornecedores

  1. Alterações de segurança
    - `fornecedores`: adiciona políticas INSERT, UPDATE e DELETE para usuários anônimos
*/

CREATE POLICY "Anon users can insert fornecedores"
  ON fornecedores FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update fornecedores"
  ON fornecedores FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon users can delete fornecedores"
  ON fornecedores FOR DELETE
  TO anon
  USING (true);
