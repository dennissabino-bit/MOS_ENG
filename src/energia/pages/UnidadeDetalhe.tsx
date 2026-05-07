import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, DoorOpen, Plus, CreditCard as Edit, Phone, Mail, Archive, Zap } from 'lucide-react';
import { EnergiaLayout } from '../components/EnergiaLayout';
import { NovaSalaModal } from '../components/NovaSalaModal';
import { NovaUnidadeModal } from '../components/NovaUnidadeModal';
import { supabase } from '../../lib/supabase';
import { useTiposSala } from '../hooks/useTiposSala';
import { formatCurrencyFull } from '../../lib/formatters';
import type { EnergiaUnidade, EnergiaSala } from '../types';

export default function UnidadeDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLabel } = useTiposSala();
  const [unidade, setUnidade] = useState<EnergiaUnidade | null>(null);
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [lastMedicao, setLastMedicao] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showSalaModal, setShowSalaModal] = useState(false);
  const [showEditUnidade, setShowEditUnidade] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [uRes, sRes] = await Promise.all([
        supabase.from('energia_unidades').select('*').eq('id', id).maybeSingle(),
        supabase.from('energia_salas').select('*').eq('unidade_id', id).eq('arquivada', false).order('nome'),
      ]);
      setUnidade(uRes.data as EnergiaUnidade | null);
      const salasData = (sRes.data as EnergiaSala[]) || [];
      setSalas(salasData);
      if (salasData.length > 0) {
        const salaIds = salasData.map(s => s.id);
        const { data: mData } = await supabase
          .from('energia_medicoes')
          .select('sala_id, valor_total, ano, mes')
          .in('sala_id', salaIds)
          .order('ano', { ascending: false })
          .order('mes', { ascending: false });
        const map = new Map<string, number>();
        for (const m of (mData || []) as { sala_id: string; valor_total: number }[]) {
          if (!map.has(m.sala_id)) map.set(m.sala_id, m.valor_total);
        }
        setLastMedicao(map);
      }
      setLoading(false);
    })();
  }, [id]);

  async function refetchSalas() {
    if (!id) return;
    const { data } = await supabase.from('energia_salas').select('*').eq('unidade_id', id).eq('arquivada', false).order('nome');
    const salasData = (data as EnergiaSala[]) || [];
    setSalas(salasData);
    if (salasData.length > 0) {
      const salaIds = salasData.map(s => s.id);
      const { data: mData } = await supabase
        .from('energia_medicoes')
        .select('sala_id, valor_total, ano, mes')
        .in('sala_id', salaIds)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });
      const map = new Map<string, number>();
      for (const m of (mData || []) as { sala_id: string; valor_total: number }[]) {
        if (!map.has(m.sala_id)) map.set(m.sala_id, m.valor_total);
      }
      setLastMedicao(map);
    }
  }

  async function handleToggleAtivo(sala: EnergiaSala) {
    await supabase.from('energia_salas').update({ ativo: !sala.ativo }).eq('id', sala.id);
    setSalas(prev => prev.map(s => s.id === sala.id ? { ...s, ativo: !s.ativo } : s));
  }

  if (loading) {
    return (
      <EnergiaLayout title="Unidade" subtitle="Detalhes e salas">
        <div className="p-6 space-y-4">
          <div className="skeleton h-10 w-1/3 rounded-lg" />
          <div className="skeleton h-40 w-full rounded-xl" />
        </div>
      </EnergiaLayout>
    );
  }

  if (!unidade) {
    return (
      <EnergiaLayout title="Unidade" subtitle="">
        <div className="p-6">
          <p className="font-body text-sm text-text-tertiary">Unidade não encontrada.</p>
          <button onClick={() => navigate('/energia/unidades')} className="btn-primary mt-4">Voltar</button>
        </div>
      </EnergiaLayout>
    );
  }

  const ocupadas = salas.filter(s => s.ativo).length;
  const desocupadas = salas.filter(s => !s.ativo).length;

  return (
    <EnergiaLayout title={unidade.nome} subtitle={`Código ${unidade.codigo} · ${ocupadas} salas ocupadas`}>
      <div className="p-6 space-y-6">
        {/* Back + title */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/energia/unidades')} className="p-2 rounded-lg hover:bg-surface-2 transition-colors mt-0.5">
              <ArrowLeft className="w-4 h-4 text-text-tertiary" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-text-secondary" />
                <h1 className="font-display font-extrabold text-2xl text-text-primary tracking-tight">{unidade.nome}</h1>
                <span className="font-data text-xs text-mos-700 font-semibold bg-mos-50 px-2 py-0.5 rounded">{unidade.codigo}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {unidade.endereco && <p className="font-body text-sm text-text-tertiary">{unidade.endereco}</p>}
                {unidade.gerente_nome && <span className="font-body text-sm text-text-secondary">{unidade.gerente_nome}</span>}
                {unidade.gerente_email && (
                  <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                    <Mail className="w-3 h-3" />{unidade.gerente_email}
                  </span>
                )}
                {unidade.gerente_telefone && (
                  <span className="flex items-center gap-1 font-body text-xs text-text-tertiary">
                    <Phone className="w-3 h-3" />{unidade.gerente_telefone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEditUnidade(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => setShowSalaModal(true)}
              className="flex items-center gap-2 bg-mos-700 text-white font-body font-semibold text-sm px-4 py-2 rounded-lg shadow-card transition-transform duration-[120ms] hover:scale-[1.05] active:scale-[0.93]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Nova Sala
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
              <DoorOpen className="w-5 h-5 text-text-secondary" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{salas.length}</p>
              <p className="font-body text-xs text-text-tertiary">Total de Salas</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-successLight flex items-center justify-center flex-shrink-0">
              <DoorOpen className="w-5 h-5 text-status-success" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{ocupadas}</p>
              <p className="font-body text-xs text-text-tertiary">Salas Ocupadas</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
              <DoorOpen className="w-5 h-5 text-text-tertiary" />
            </div>
            <div>
              <p className="font-display font-bold text-xl text-text-primary">{desocupadas}</p>
              <p className="font-body text-xs text-text-tertiary">Salas Desocupadas</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-infoLight flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-status-info" />
            </div>
            <div>
              <p className="font-data font-bold text-xl text-text-primary">
                {unidade.tarifa != null && unidade.tarifa > 0
                  ? Number(unidade.tarifa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '—'}
              </p>
              <p className="font-body text-xs text-text-tertiary">Tarifa (R$/kWh)</p>
            </div>
          </div>
        </div>

        {/* Salas table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-2 bg-surface-1">
            <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">{salas.length} SALAS</p>
          </div>
          {salas.length === 0 ? (
            <div className="p-10 text-center">
              <DoorOpen className="w-10 h-10 text-text-disabled mx-auto mb-3" />
              <p className="font-body text-sm text-text-tertiary">Nenhuma sala cadastrada nesta unidade</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-2">
              {salas.map(sala => (
                <div
                  key={sala.id}
                  onClick={() => navigate(`/energia/salas/${sala.id}`)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-surface-1 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                      <DoorOpen className="w-4 h-4 text-text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body font-medium text-sm text-text-primary truncate">{sala.nome}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-body text-xs text-text-tertiary">{getLabel(sala.tipo_sala)}</span>
                        {sala.responsavel && <span className="font-body text-xs text-text-tertiary">· {sala.responsavel}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 flex-shrink-0">
                    <div className="hidden sm:flex flex-col items-end min-w-[80px]">
                      <span className="font-body text-[10px] text-text-disabled tracking-wider">ALUGUEL</span>
                      <span className="font-data text-sm font-medium text-text-primary">
                        {sala.valor_aluguel != null ? formatCurrencyFull(sala.valor_aluguel) : '—'}
                      </span>
                    </div>
                    <div className="hidden sm:flex flex-col items-end min-w-[80px]">
                      <span className="font-body text-[10px] text-text-disabled tracking-wider">ENERGIA</span>
                      <span className="font-data text-sm font-medium text-text-primary">
                        {lastMedicao.has(sala.id) ? formatCurrencyFull(lastMedicao.get(sala.id)!) : '—'}
                      </span>
                    </div>
                    <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded-xs tracking-wider ${
                      sala.ativo ? 'badge-saudavel' : 'text-text-tertiary bg-surface-2'
                    }`}>
                      {sala.ativo ? 'OCUPADA' : 'DESOCUPADA'}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleAtivo(sala); }}
                      title={sala.ativo ? 'Marcar como desocupada' : 'Marcar como ocupada'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        sala.ativo
                          ? 'text-text-tertiary hover:bg-status-warningLight hover:text-status-warning'
                          : 'text-text-tertiary hover:bg-status-successLight hover:text-status-success'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-5 bg-surface-3" />
                    <ArrowLeft className="w-3.5 h-3.5 text-text-disabled group-hover:text-text-secondary rotate-180 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSalaModal && id && (
        <NovaSalaModal unidadeId={id} onClose={() => setShowSalaModal(false)} onSaved={() => { setShowSalaModal(false); refetchSalas(); }} />
      )}
      {showEditUnidade && (
        <NovaUnidadeModal
          initial={unidade}
          onClose={() => setShowEditUnidade(false)}
          onSaved={async () => {
            setShowEditUnidade(false);
            const { data } = await supabase.from('energia_unidades').select('*').eq('id', id!).maybeSingle();
            if (data) setUnidade(data as EnergiaUnidade);
          }}
        />
      )}
    </EnergiaLayout>
  );
}
