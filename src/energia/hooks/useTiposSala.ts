import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { EnergiaTipoSala } from '../types';

export function useTiposSala() {
  const [tipos, setTipos] = useState<EnergiaTipoSala[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('energia_tipos_sala')
      .select('*')
      .order('ordem')
      .order('nome');
    setTipos((data as EnergiaTipoSala[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const labelMap: Record<string, string> = Object.fromEntries(tipos.map(t => [t.slug, t.nome]));

  function getLabel(slug: string): string {
    return labelMap[slug] ?? slug;
  }

  return { tipos, loading, refetch: fetch, getLabel, labelMap };
}
