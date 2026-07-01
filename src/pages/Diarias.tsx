import { useState, useEffect, useMemo } from 'react';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, CheckCircle, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { NovaPlanilhaModal } from '../components/diarias/NovaPlanilhaModal';
import { supabase } from '../lib/supabase';
import type { DiariaPlanilha, DiariaFuncionario } from '../lib/database.types';
import { formatCurrencyFull } from '../lib/formatters';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PAGE_SIZE = 9;

interface PlanilhaEnriquecida extends DiariaPlanilha {
  funcCount: number;
  totalQuinzena: number;
}

export default function Diarias() {
  const navigate = useNavigate();
  const [planilhas, setPlanilhas] = useState<PlanilhaEnriquecida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [plRes, funcRes, presRes] = await Promise.all([
      supabase.from('diarias_planilhas').select('*, obras(nome, localizacao)').order('created_at', { ascending: false }),
      supabase.from('diarias_funcionarios').select('id, planilha_id, valor_dia'),
      supabase.from('diarias_presencas').select('funcionario_id'),
    ]);

    const pl = (plRes.data ?? []) as DiariaPlanilha[];
    const funcs = (funcRes.data ?? []) as Pick<DiariaFuncionario, 'id' | 'planilha_id' | 'valor_dia'>[];
    const presencas = (presRes.data ?? []) as { funcionario_id: string }[];

    const presCountByFunc: Record<string, number> = {};
    for (const p of presencas) {
      presCountByFunc[p.funcionario_id] = (presCountByFunc[p.funcionario_id] ?? 0) + 1;
    }

    const funcsByPlanilha: Record<string, typeof funcs> = {};
    for (const f of funcs) {
      if (!funcsByPlanilha[f.planilha_id]) funcsByPlanilha[f.planilha_id] = [];
      funcsByPlanilha[f.planilha_id].push(f);
    }

    const enriched: PlanilhaEnriquecida[] = pl.map(p => {
      const pFuncs = funcsByPlanilha[p.id] ?? [];
      const totalQuinzena = pFuncs.reduce((s, f) => s + (presCountByFunc[f.id] ?? 0) * f.valor_dia, 0);
      return { ...p, funcCount: pFuncs.length, totalQuinzena };
    });

    setPlanilhas(enriched);
    setLoading(false);
  }

  const filtered = useMemo(() =>
    planilhas.filter(p => !filterStatus || p.status === filterStatus),
    [planilhas, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSaved(p: DiariaPlanilha) {
    navigate(`/diarias/${p.id}`);
  }

  const totalAtivas = planilhas.filter(p => p.status === 'rascunho').length;
  const subtitle = loading ? 'Carregando...' : `${totalAtivas} planilha${totalAtivas !== 1 ? 's' : ''} em andamento`;

  return (
    <AppLayout title="Controle de Diárias" subtitle={subtitle}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1">
            {[
              { v: '', label: 'Todas' },
              { v: 'rascunho', label: 'Em Andamento' },
              { v: 'aprovada', label: 'Aprovadas' },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => { setFilterStatus(v); setPage(1); }}
                className={`px-4 py-1.5 rounded-lg font-body text-sm font-semibold transition-colors ${
                  filterStatus === v
                    ? 'bg-mos-700 text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Planilha
          </button>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-surface-2 rounded w-3/4" />
                <div className="h-3 bg-surface-2 rounded w-1/2" />
                <div className="h-8 bg-surface-2 rounded" />
              </div>
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="card py-20 text-center">
            <CalendarDays className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary mb-4">
              {planilhas.length === 0 ? 'Nenhuma planilha cadastrada' : 'Nenhuma planilha corresponde ao filtro'}
            </p>
            {planilhas.length === 0 && (
              <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" /> Nova Planilha
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map(p => (
              <PlanilhaCard key={p.id} planilha={p} onClick={() => navigate(`/diarias/${p.id}`)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <span className="font-body text-xs text-text-tertiary">
              Mostrando{' '}
              <strong className="text-text-primary">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</strong>
              {' '}de <strong className="text-text-primary">{filtered.length}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md font-body text-sm text-text-secondary border border-surface-2 hover:bg-surface-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-full font-data text-sm font-semibold transition-colors ${
                    n === page ? 'bg-mos-700 text-white' : 'text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md font-body text-sm text-text-secondary border border-surface-2 hover:bg-surface-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NovaPlanilhaModal onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
    </AppLayout>
  );
}

function PlanilhaCard({ planilha, onClick }: { planilha: PlanilhaEnriquecida; onClick: () => void }) {
  const isAprovada = planilha.status === 'aprovada';
  const periodoLabel = `${planilha.quinzena}ª Quinzena / ${MESES_ABREV[planilha.mes - 1]} ${planilha.ano}`;
  const obranome = planilha.obras?.nome;

  return (
    <div
      onClick={onClick}
      className="card overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow duration-200 flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm text-text-primary leading-snug truncate">
              {planilha.nome_equipe}
            </h3>
            {obranome && (
              <p className="font-body text-[10px] text-text-tertiary mt-0.5 truncate">{obranome}</p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-body text-[10px] font-bold tracking-wide flex-shrink-0 ${
            isAprovada
              ? 'bg-status-successLight text-status-success'
              : 'bg-status-infoLight text-status-info'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {isAprovada ? 'APROVADA' : 'RASCUNHO'}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-3 h-3 text-text-tertiary flex-shrink-0" />
          <span className="font-body text-[10px] font-semibold text-text-secondary tracking-wide uppercase">
            {periodoLabel}
          </span>
        </div>

        {planilha.localizacao && (
          <div className="flex items-center gap-1 mb-1">
            <Building2 className="w-3 h-3 text-text-disabled flex-shrink-0" />
            <span className="font-data text-xs text-text-tertiary truncate">{planilha.localizacao}</span>
          </div>
        )}
      </div>

      <div className="border-t border-surface-2 px-4 py-3 bg-surface-1 flex items-center gap-0">
        <div className="flex-1">
          <p className="font-body text-[9px] font-semibold text-text-disabled tracking-wider uppercase mb-0.5">Funcionários</p>
          <p className="font-data text-sm font-bold text-text-primary">{planilha.funcCount}</p>
        </div>
        <div className="w-px h-8 bg-surface-2 mx-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-body text-[9px] font-semibold text-text-disabled tracking-wider uppercase mb-0.5">Total</p>
          <p className="font-data text-sm font-bold text-mos-700">{formatCurrencyFull(planilha.totalQuinzena)}</p>
        </div>
        <div className="w-px h-8 bg-surface-2 mx-3 flex-shrink-0" />
        <div className="flex-1 flex justify-center">
          {isAprovada
            ? <CheckCircle className="w-5 h-5 text-status-success" />
            : <Clock className="w-5 h-5 text-status-info" />
          }
        </div>
      </div>
    </div>
  );
}

