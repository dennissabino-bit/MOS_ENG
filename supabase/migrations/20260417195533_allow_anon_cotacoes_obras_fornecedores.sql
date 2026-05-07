/*
  # Permitir acesso anônimo a cotacoes, obras e fornecedores

  1. Alterações de segurança
    - `cotacoes`: adiciona políticas SELECT e INSERT para usuários anônimos
    - `obras`: adiciona política SELECT para usuários anônimos
    - `fornecedores`: adiciona política SELECT para usuários anônimos

  Necessário para que o app funcione sem autenticação obrigatória.
*/

CREATE POLICY "Anon users can read cotacoes"
  ON cotacoes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert cotacoes"
  ON cotacoes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update cotacoes"
  ON cotacoes FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon users can delete cotacoes"
  ON cotacoes FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon users can read obras"
  ON obras FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can read fornecedores"
  ON fornecedores FOR SELECT
  TO anon
  USING (true);
