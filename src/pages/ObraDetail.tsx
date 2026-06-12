import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ObraHeader } from '../components/obra/ObraHeader';
import { ObraTabs } from '../components/obra/ObraTabs';
import type { TabId } from '../components/obra/ObraTabs';
import { VisaoGeralTab } from '../components/obra/tabs/VisaoGeralTab';
import { OrcamentoTab } from '../components/obra/tabs/OrcamentoTab';
import { CronogramaTab } from '../components/obra/tabs/CronogramaTab';
import { MedicoesTab } from '../components/obra/tabs/MedicoesTab';
import { DiarioTab } from '../components/obra/tabs/DiarioTab';
import type { Obra, EtapaEap, Medicao, DiarioObra } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { useObraData } from '../hooks/useObraData';
import { useObras } from '../hooks/useObras';

export default function ObraDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { arquivarObra } = useObras();
  const [activeTab, setActiveTab] = useState<TabId>('visao-geral');
  const [obra, setObra] = useState<Obra | null>(null);
  const [etapas, setEtapas] = useState<EtapaEap[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [diario, setDiario] = useState<DiarioObra[]>([]);
  const [cotacoesAbertas, setCotacoesAbertas] = useState(0);
  const [loadingObra, setLoadingObra] = useState(true);
  const [loadingEtapas, setLoadingEtapas] = useState(true);
  const [loadingMedicoes, setLoadingMedicoes] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoadingObra(true);
    supabase
      .from('obras')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setObra(data ?? null);
        setLoadingObra(false);
      });
  }, [id]);

  const refetchEtapas = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('etapas_eap')
      .select('*')
      .eq('obra_id', id)
      .order('codigo');
    setEtapas(data ?? []);
  }, [id]);

  useEffect(() => {
    setLoadingEtapas(true);
    refetchEtapas().then(() => setLoadingEtapas(false));
  }, [refetchEtapas]);

  useEffect(() => {
    if (!id) return;
    setLoadingMedicoes(true);
    supabase
      .from('medicoes')
      .select('*')
      .eq('obra_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMedicoes(data ?? []);
        setLoadingMedicoes(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', id)
      .order('data', { ascending: false })
      .then(({ data }) => setDiario(data ?? []));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('cotacoes')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', id)
      .eq('status', 'aberta')
      .then(({ count }) => setCotacoesAbertas(count ?? 0));
  }, [id]);

  const obraForHook: Obra = obra ?? {
    id: id ?? '',
    nome: '',
    codigo: '',
    status: 'em_andamento' as const,
    bandeira: '',
    tipo: '',
    localizacao: '',
    engenheiro: '',
    orcado: 0,
    realizado: 0,
    avanco_fisico: 0,
    data_inicio: '',
    data_fim: '',
    imagem_url: '',
    descricao: '',
    created_at: '',
    updated_at: '',
  };

  const { kpis, fluxo, curvaS, cronogramaFromEtapas } = useObraData(obraForHook, etapas, medicoes);

  const isLoading = loadingObra || loadingEtapas || loadingMedicoes;

  if (!isLoading && !obra) {
    return (
      <AppLayout title="Obra não encontrada">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Building2 className="w-12 h-12 text-text-disabled" />
          <p className="font-body text-text-tertiary">Obra não encontrada</p>
          <button onClick={() => navigate('/obras')} className="px-4 py-2 rounded-md bg-mos-700 text-white font-body text-sm">Voltar para Obras</button>
        </div>
      </AppLayout>
    );
  }

  if (isLoading && !obra) {
    return (
      <AppLayout title="Carregando…">
        <div className="flex items-center justify-center h-64 gap-2 text-text-tertiary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-body text-sm">Carregando obra…</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={obra!.nome} subtitle={`${obra!.codigo} · ${obra!.localizacao}`}>
      <div className="flex flex-col min-h-full">
        <ObraHeader obra={obra!} onArchive={async () => { await arquivarObra(obra!.id); navigate('/obras'); }} />
        <ObraTabs activeTab={activeTab} onChange={setActiveTab} />
        <div className="flex-1 bg-surface-1">
          {activeTab === 'visao-geral' && (
            isLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text-tertiary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-body text-sm">Carregando dados…</span>
              </div>
            ) : (
              <VisaoGeralTab
                obra={obra!}
                kpis={kpis}
                fluxo={fluxo}
                curvaS={curvaS}
                cotacoesAbertas={cotacoesAbertas}
              />
            )
          )}
          {activeTab === 'orcamento' && (
            isLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text-tertiary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-body text-sm">Carregando orçamento…</span>
              </div>
            ) : (
              <OrcamentoTab obra={obra!} etapas={etapas} kpis={kpis} onEtapasChange={refetchEtapas} />
            )
          )}
          {activeTab === 'cronograma' && (
            isLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text-tertiary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-body text-sm">Carregando cronograma…</span>
              </div>
            ) : (
              <CronogramaTab etapas={cronogramaFromEtapas} curvaS={curvaS} />
            )
          )}
          {activeTab === 'medicoes' && (
            isLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text-tertiary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-body text-sm">Carregando medições…</span>
              </div>
            ) : (
              <MedicoesTab medicoes={medicoes} obraOrcado={kpis.totalOrcado || obra!.orcado} obraId={obra!.id} onMedicoesChange={setMedicoes} />
            )
          )}
          {activeTab === 'diario' && (
            <DiarioTab entradas={diario} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
