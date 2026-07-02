import { supabase } from '../../lib/supabase';
import type { EnergiaMedicao, EnergiaSala, EnergiaFatura, EnergiaAluguel } from '../types';
import { MESES_ABREV } from '../types';

export interface GerarFaturaResult {
  fatura: EnergiaFatura;
  criada: boolean; // true = nova fatura, false = adicionado a fatura existente
}

/**
 * Automatically creates or updates a unified fatura (energia + aluguel)
 * for the unidade + mes + ano combination when a medicao is approved.
 *
 * Logic:
 * 1. Look up the sala to get unidade_id
 * 2. Find or create a 'rascunho' fatura for unidade + mes + ano
 * 3. Add the energia item (if not already present)
 * 4. Find pending alugueis for all salas in that unidade+period and add them
 * 5. Recalculate and update fatura totals
 * 6. Link medicao.fatura_id
 */
export async function gerarFaturaAutomatica(
  medicao: EnergiaMedicao,
  sala: EnergiaSala,
): Promise<GerarFaturaResult> {
  const { mes, ano } = medicao;
  const unidadeId = sala.unidade_id;

  // --- 1. Find or create fatura ---
  const { data: existingFaturas } = await supabase
    .from('energia_faturas')
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('mes', mes)
    .eq('ano', ano)
    .in('status', ['rascunho', 'enviada', 'visualizada'])
    .limit(1);

  let fatura: EnergiaFatura;
  let criada = false;

  if (existingFaturas && existingFaturas.length > 0) {
    fatura = existingFaturas[0] as EnergiaFatura;
  } else {
    // Fetch unidade details for destinatario fallback
    const { data: unidadeData } = await supabase
      .from('energia_unidades')
      .select('*')
      .eq('id', unidadeId)
      .single();

    const { data: newFatura, error: faturaErr } = await supabase
      .from('energia_faturas')
      .insert({
        unidade_id: unidadeId,
        mes,
        ano,
        status: 'rascunho',
        valor_energia: 0,
        valor_aluguel: 0,
        destinatario_nome: unidadeData?.gerente_nome || '',
        destinatario_email: unidadeData?.gerente_email || '',
        destinatario_cpf_cnpj: '',
        observacoes: '',
      })
      .select()
      .single();

    if (faturaErr || !newFatura) throw new Error(faturaErr?.message || 'Erro ao criar fatura');
    fatura = newFatura as EnergiaFatura;
    criada = true;
  }

  // --- 2. Add energia item if not already present ---
  const { data: existingEnergiaItem } = await supabase
    .from('energia_fatura_itens')
    .select('id')
    .eq('fatura_id', fatura.id)
    .eq('medicao_id', medicao.id)
    .limit(1);

  if (!existingEnergiaItem || existingEnergiaItem.length === 0) {
    await supabase.from('energia_fatura_itens').insert({
      fatura_id: fatura.id,
      sala_id: sala.id,
      medicao_id: medicao.id,
      tipo: 'energia',
      descricao: `Energia — ${sala.nome} — ${MESES_ABREV[mes - 1]}/${ano}`,
      valor: Number(medicao.valor_total),
      mes,
      ano,
    });
  }

  // --- 3. Find all salas of this unidade ---
  const { data: salasUnidade } = await supabase
    .from('energia_salas')
    .select('id, nome, valor_aluguel')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true);

  const salaIds = (salasUnidade || []).map((s: { id: string }) => s.id);

  // --- 4. Find pending alugueis for this unidade+period ---
  if (salaIds.length > 0) {
    const { data: pendingAlugueis } = await supabase
      .from('energia_alugueis')
      .select('*')
      .in('sala_id', salaIds)
      .eq('mes', mes)
      .eq('ano', ano)
      .eq('status', 'pendente')
      .is('fatura_id', null);

    const alugueis = (pendingAlugueis as EnergiaAluguel[]) || [];

    if (alugueis.length > 0) {
      // Check which ones are not already in this fatura
      const { data: existingAluguelItems } = await supabase
        .from('energia_fatura_itens')
        .select('sala_id')
        .eq('fatura_id', fatura.id)
        .eq('tipo', 'aluguel');

      const alreadyAddedSalaIds = new Set(
        (existingAluguelItems || []).map((i: { sala_id: string }) => i.sala_id)
      );

      const salaMap = new Map(
        (salasUnidade || []).map((s: { id: string; nome: string; valor_aluguel: number }) => [s.id, s])
      );

      const newAluguelItems = alugueis
        .filter(a => !alreadyAddedSalaIds.has(a.sala_id))
        .map(a => {
          const salaInfo = salaMap.get(a.sala_id);
          return {
            fatura_id: fatura.id,
            sala_id: a.sala_id,
            medicao_id: null,
            tipo: 'aluguel' as const,
            descricao: `Aluguel — ${salaInfo?.nome || '?'} — ${MESES_ABREV[mes - 1]}/${ano}`,
            valor: Number(a.valor),
            mes,
            ano,
          };
        });

      if (newAluguelItems.length > 0) {
        await supabase.from('energia_fatura_itens').insert(newAluguelItems);
      }

      // Mark alugueis as faturado
      await supabase
        .from('energia_alugueis')
        .update({ status: 'faturado', fatura_id: fatura.id })
        .in('id', alugueis.filter(a => !alreadyAddedSalaIds.has(a.sala_id)).map(a => a.id));
    }
  }

  // --- 5. Recalculate totals from all items ---
  const { data: allItems } = await supabase
    .from('energia_fatura_itens')
    .select('tipo, valor')
    .eq('fatura_id', fatura.id);

  let valorEnergia = 0;
  let valorAluguel = 0;
  for (const item of allItems || []) {
    if (item.tipo === 'energia') valorEnergia += Number(item.valor);
    else valorAluguel += Number(item.valor);
  }

  const { data: updatedFatura } = await supabase
    .from('energia_faturas')
    .update({ valor_energia: valorEnergia, valor_aluguel: valorAluguel })
    .eq('id', fatura.id)
    .select()
    .single();

  // --- 6. Link medicao to fatura ---
  await supabase
    .from('energia_medicoes')
    .update({ fatura_id: fatura.id })
    .eq('id', medicao.id);

  return { fatura: (updatedFatura as EnergiaFatura) || fatura, criada };
}
