import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getMesAtual, getAnoAtual } from '../utils/calculos';
import type { EnergiaUsuario } from '../types';

export interface SalaPendente {
  id: string;
  nome: string;
  unidade_id: string;
  unidade_nome: string;
}

export function usePendencias(user: EnergiaUsuario | null, isAdmin: boolean) {
  const [pendentes, setPendentes] = useState<SalaPendente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPendencias();
  }, [user, isAdmin]);

  async function fetchPendencias() {
    setLoading(true);
    const mes = getMesAtual();
    const ano = getAnoAtual();

    let salasQuery = supabase
      .from('energia_salas')
      .select('id, nome, unidade_id, energia_unidades(nome)')
      .eq('ativo', true)
      .eq('arquivada', false)
      .eq('medicao_tipo', 'medido');

    if (!isAdmin && user?.unidade_id) {
      salasQuery = salasQuery.eq('unidade_id', user.unidade_id);
    }

    const { data: salasData } = await salasQuery;
    if (!salasData || salasData.length === 0) { setLoading(false); return; }

    const salaIds = salasData.map((s: { id: string }) => s.id);

    const { data: medicoesData } = await supabase
      .from('energia_medicoes')
      .select('sala_id')
      .in('sala_id', salaIds)
      .eq('mes', mes)
      .eq('ano', ano);

    const medidosSet = new Set((medicoesData || []).map((m: { sala_id: string }) => m.sala_id));

    const result: SalaPendente[] = salasData
      .filter((s: { id: string }) => !medidosSet.has(s.id))
      .map((s: { id: string; nome: string; unidade_id: string; energia_unidades: { nome: string } | null }) => ({
        id: s.id,
        nome: s.nome,
        unidade_id: s.unidade_id,
        unidade_nome: s.energia_unidades?.nome ?? '',
      }));

    setPendentes(result);
    setLoading(false);
  }

  return { pendentes, loading, refetch: fetchPendencias };
}
