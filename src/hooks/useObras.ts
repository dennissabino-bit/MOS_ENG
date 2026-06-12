import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Obra } from '../lib/database.types';

export function useObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObras = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setObras(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchObras();
  }, [fetchObras]);

  function updateObraImagem(obraId: string, newUrl: string) {
    setObras(prev => prev.map(o => o.id === obraId ? { ...o, imagem_url: newUrl } : o));
  }

  function addObra(obra: Obra) {
    setObras(prev => [obra, ...prev]);
  }

  async function arquivarObra(obraId: string) {
    await supabase.from('obras').update({ arquivada: true }).eq('id', obraId);
    setObras(prev => prev.map(o => o.id === obraId ? { ...o, arquivada: true } : o));
  }

  async function desarquivarObra(obraId: string) {
    await supabase.from('obras').update({ arquivada: false }).eq('id', obraId);
    setObras(prev => prev.map(o => o.id === obraId ? { ...o, arquivada: false } : o));
  }

  return { obras, loading, error, updateObraImagem, addObra, arquivarObra, desarquivarObra, refetch: fetchObras };
}
