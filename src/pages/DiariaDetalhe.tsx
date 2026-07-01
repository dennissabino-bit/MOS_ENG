import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Users, CheckCircle,
  TrendingUp, Calculator, Printer, UserPlus, Loader2, Check,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { AdicionarFuncionarioModal } from '../components/diarias/AdicionarFuncionarioModal';
import { supabase } from '../lib/supabase';
import type { DiariaPlanilha, DiariaFuncionario } from '../lib/database.types';
import { formatCurrencyFull } from '../lib/formatters';

// ─── helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface DaySlot {
  slot: number;
  calendarDay: string;
  weekday: string;
}

function buildDays(dataInicio: string): DaySlot[] {
  const [y, m, d] = dataInicio.split('-').map(Number);
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(y, m - 1, d + i);
    return {
      slot: i + 1,
      calendarDay: String(date.getDate()).padStart(2, '0'),
      weekday: WEEKDAYS[date.getDay()],
    };
  });
}

function fmtAprovadaEm(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function presKey(funcId: string, slot: number) {
  return `${funcId}-${slot}`;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, sub, value, icon, iconBg }: {
  label: string; sub: string; value: string;
  icon: React.ReactNode; iconBg: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-body text-[9px] font-bold text-text-tertiary tracking-[0.14em] uppercase">{label}</p>
        <p className="font-body text-[9px] text-text-disabled mb-1">{sub}</p>
        <p className="font-data font-bold text-xl text-text-primary leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Approval confirm modal ────────────────────────────────────────────────────

function ApproveModal({ onConfirm, onCancel, saving }: {
  onConfirm: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-status-successLight flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-status-success" />
          </div>
          <h3 className="font-display font-bold text-base text-text-primary mb-2">Aprovar Planilha?</h3>
          <p className="font-body text-sm text-text-secondary">
            A planilha será marcada como aprovada e os registros não poderão mais ser editados.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-status-success text-white font-body text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Aprovando…' : 'Aprovar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DiariaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [planilha, setPlanilha] = useState<DiariaPlanilha | null>(null);
  const [funcionarios, setFuncionarios] = useState<DiariaFuncionario[]>([]);
  const [presencas, setPresencas] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddFunc, setShowAddFunc] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => { if (id) fetchAll(); }, [id]);

  async function fetchAll() {
    setLoading(true);
    const [plRes, funcRes, presRes] = await Promise.all([
      supabase.from('diarias_planilhas').select('*, obras(nome, localizacao)').eq('id', id!).single(),
      supabase.from('diarias_funcionarios').select('*').eq('planilha_id', id!).order('ordem').order('created_at'),
      supabase.from('diarias_presencas').select('funcionario_id, dia').eq('planilha_id', id!),
    ]);

    if (plRes.data) setPlanilha(plRes.data as DiariaPlanilha);
    if (funcRes.data) setFuncionarios(funcRes.data as DiariaFuncionario[]);

    const presSet = new Set<string>(
      ((presRes.data ?? []) as { funcionario_id: string; dia: number }[])
        .map(p => presKey(p.funcionario_id, p.dia))
    );
    setPresencas(presSet);
    setLoading(false);
  }

  const days = useMemo(() => planilha ? buildDays(planilha.data_inicio) : [], [planilha]);
  const isAprovada = planilha?.status === 'aprovada';

  const rowTotals = useMemo(() =>
    funcionarios.map(f => {
      const count = days.filter(d => presencas.has(presKey(f.id, d.slot))).length;
      return { id: f.id, diasPresentes: count, total: count * f.valor_dia };
    }),
    [funcionarios, days, presencas]);

  const totalQuinzena = rowTotals.reduce((s, r) => s + r.total, 0);
  const totalDiasTrabalhados = rowTotals.reduce((s, r) => s + r.diasPresentes, 0);
  const mediaDiaria = totalDiasTrabalhados > 0 ? totalQuinzena / totalDiasTrabalhados : 0;

  const togglePresenca = useCallback(async (funcId: string, slot: number) => {
    if (isAprovada) return;
    const key = presKey(funcId, slot);
    if (toggling.has(key)) return;

    const wasPresent = presencas.has(key);

    setPresencas(prev => {
      const next = new Set(prev);
      if (wasPresent) next.delete(key); else next.add(key);
      return next;
    });
    setToggling(prev => new Set(prev).add(key));

    if (wasPresent) {
      await supabase.from('diarias_presencas')
        .delete().eq('funcionario_id', funcId).eq('dia', slot);
    } else {
      await supabase.from('diarias_presencas')
        .insert({ planilha_id: id!, funcionario_id: funcId, dia: slot });
    }

    setToggling(prev => { const n = new Set(prev); n.delete(key); return n; });
  }, [id, isAprovada, presencas, toggling]);

  async function aprovarPlanilha() {
    setApproving(true);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('diarias_planilhas')
      .update({ status: 'aprovada', aprovada_em: now })
      .eq('id', id!)
      .select('*, obras(nome, localizacao)')
      .single();
    if (data) setPlanilha(data as DiariaPlanilha);
    setApproving(false);
    setShowApproveModal(false);
  }

  if (loading) {
    return (
      <AppLayout title="Controle de Diárias" subtitle="Carregando…">
        <div className="p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-16 animate-pulse" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!planilha) {
    return (
      <AppLayout title="Controle de Diárias">
        <div className="p-6 text-center py-20">
          <p className="font-body text-sm text-text-tertiary">Planilha não encontrada.</p>
          <button onClick={() => navigate('/diarias')} className="mt-4 btn-primary">Voltar</button>
        </div>
      </AppLayout>
    );
  }

  const periodoLabel = `${planilha.quinzena}ª Quinzena de ${MESES[planilha.mes - 1]} ${planilha.ano}`;
  const pageTitle = planilha.obras?.nome
    ? `${planilha.obras.nome} — ${planilha.nome_equipe}`
    : planilha.nome_equipe;

  return (
    <AppLayout title="Controle de Diárias" subtitle={periodoLabel}>
      <div className="p-6 space-y-5 diaria-print-root">

        {/* ── Print-only header (hidden on screen) ── */}
        <div className="print-only">
          <div className="prt-accent-bar" />

          <div className="prt-header-row">
            <div className="prt-brand">
              <span className="prt-brand-mos">MOS</span>
              <span className="prt-brand-engenharia">Engenharia</span>
              <span className="prt-brand-sep">|</span>
              <span className="prt-brand-gestor">Gestor de Obras</span>
            </div>
            <div className="prt-doc-meta">
              <span className="prt-doc-type">Controle de Diárias</span>
              <span className="prt-doc-date">
                Emitido em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="prt-title-row">
            <h1 className="prt-title">{pageTitle}</h1>
            <div className="prt-chips">
              <span className="prt-chip prt-chip-primary">{periodoLabel}</span>
              {planilha.localizacao && (
                <span className="prt-chip prt-chip-neutral">{planilha.localizacao}</span>
              )}
              {isAprovada && planilha.aprovada_em ? (
                <span className="prt-chip prt-chip-success">Aprovada em {fmtAprovadaEm(planilha.aprovada_em)}</span>
              ) : (
                <span className="prt-chip prt-chip-warning">Pendente de aprovação</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="card px-5 py-4 print-hide">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Left: back + title */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate('/diarias')}
                className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 hover:bg-surface-3 transition-colors mt-0.5"
              >
                <ArrowLeft className="w-4 h-4 text-text-secondary" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-lg text-text-primary leading-tight truncate">{pageTitle}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-mos-700 text-white font-body text-[10px] font-bold tracking-wider uppercase">
                    <Users className="w-3 h-3" />
                    {planilha.nome_equipe}
                  </span>
                  {planilha.localizacao && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2 text-text-secondary font-body text-[10px] font-semibold">
                      <MapPin className="w-3 h-3" />
                      {planilha.localizacao.toUpperCase()}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2 text-text-secondary font-body text-[10px] font-semibold">
                    <Calendar className="w-3 h-3" />
                    INÍCIO: {planilha.data_inicio}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isAprovada && (
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-surface-3 bg-surface-1 font-body text-sm font-semibold text-text-secondary hover:border-status-success hover:text-status-success hover:bg-status-successLight transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Aprovar Planilha
                </button>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); requestAnimationFrame(() => window.print()); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-3 bg-white font-body text-sm font-semibold text-text-secondary hover:bg-surface-1 transition-colors"
              >
                <Printer className="w-4 h-4" />
                PDF
              </button>
              {!isAprovada && (
                <button
                  onClick={() => setShowAddFunc(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Funcionário
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Status banner ── */}
        {isAprovada && (
          <div className="rounded-xl px-5 py-4 bg-status-successLight border border-status-success/20 flex items-center gap-3 print-hide">
            <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-sm text-status-success">Planilha Aprovada</p>
              <p className="font-body text-xs text-status-success/80 mt-0.5">
                Confirmada em {planilha.aprovada_em ? fmtAprovadaEm(planilha.aprovada_em) : '—'}. Pronta para o encerramento.
              </p>
            </div>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-hide">
          <KpiCard
            label="Total da Quinzena"
            sub="VALOR CONSOLIDADO"
            value={formatCurrencyFull(totalQuinzena)}
            iconBg="bg-status-warningLight"
            icon={<Calculator className="w-5 h-5 text-status-warning" />}
          />
          <KpiCard
            label="Funcionários"
            sub="TOTAL NA EQUIPE"
            value={String(funcionarios.length)}
            iconBg="bg-status-infoLight"
            icon={<Users className="w-5 h-5 text-status-info" />}
          />
          <KpiCard
            label="Dias Trabalhados"
            sub="TOTAL DE PRESENÇAS"
            value={String(totalDiasTrabalhados)}
            iconBg="bg-mos-50"
            icon={<Calendar className="w-5 h-5 text-mos-700" />}
          />
          <KpiCard
            label="Média Diária"
            sub="POR DIA TRABALHADO"
            value={totalDiasTrabalhados > 0 ? formatCurrencyFull(mediaDiaria) : '—'}
            iconBg="bg-status-successLight"
            icon={<TrendingUp className="w-5 h-5 text-status-success" />}
          />
        </div>

        {/* ── Presence table ── */}
        <div className="card overflow-hidden">
          {funcionarios.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-8 h-8 text-text-disabled mx-auto mb-3" />
              <p className="font-body text-sm text-text-tertiary mb-4">Nenhum funcionário cadastrado nesta planilha.</p>
              {!isAprovada && (
                <button onClick={() => setShowAddFunc(true)} className="btn-primary flex items-center gap-2 mx-auto">
                  <UserPlus className="w-4 h-4" /> Adicionar Funcionário
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto diaria-print-table-wrap">
              <table className="w-full border-collapse diaria-print-table" style={{ minWidth: '960px' }}>
                <thead>
                  <tr className="prt-thead">
                    <th className="col-nome text-left px-4 py-3 font-body text-[9px] font-bold text-text-tertiary tracking-[0.14em] uppercase w-36">
                      Nome
                    </th>
                    <th className="col-funcao text-left px-3 py-3 font-body text-[9px] font-bold text-text-tertiary tracking-[0.14em] uppercase w-28">
                      Função
                    </th>
                    <th className="col-valor text-right px-3 py-3 font-body text-[9px] font-bold text-text-tertiary tracking-[0.14em] uppercase w-20">
                      R$ Dia
                    </th>
                    {days.map(d => (
                      <th key={d.slot} className="col-dia text-center py-2 w-10">
                        <span className="prt-th-day-num">{d.calendarDay}</span>
                        <span className="prt-th-day-wk">{d.weekday}</span>
                      </th>
                    ))}
                    <th className="col-total text-right px-4 py-3 font-body text-[9px] font-bold text-text-tertiary tracking-[0.14em] uppercase w-28">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {funcionarios.map((f, fi) => {
                    const rowData = rowTotals.find(r => r.id === f.id);
                    return (
                      <tr
                        key={f.id}
                        className={`border-b border-surface-2 transition-colors ${fi % 2 === 1 ? 'bg-surface-1' : 'bg-white'}`}
                      >
                        <td className="col-nome px-4 py-3">
                          <span className="font-body font-bold text-sm text-text-primary">{f.nome}</span>
                        </td>
                        <td className="col-funcao px-3 py-3">
                          <span className="font-body text-xs text-text-secondary">{f.funcao || '—'}</span>
                        </td>
                        <td className="col-valor px-3 py-3 text-right">
                          <span className="font-data text-xs font-semibold text-text-secondary">
                            R$ {f.valor_dia.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        {days.map(d => {
                          const key = presKey(f.id, d.slot);
                          const present = presencas.has(key);
                          const busy = toggling.has(key);
                          const isWeekend = d.weekday === 'SAB' || d.weekday === 'DOM';
                          return (
                            <td
                              key={d.slot}
                              className={`col-dia day-cell py-2 text-center ${present ? 'prt-day-present' : isWeekend ? 'prt-day-weekend' : ''}`}
                            >
                              <button
                                onClick={() => togglePresenca(f.id, d.slot)}
                                disabled={isAprovada || busy}
                                className={`w-7 h-7 rounded-md flex items-center justify-center mx-auto transition-all duration-150 ${
                                  present
                                    ? 'bg-status-success text-white shadow-sm hover:bg-green-700'
                                    : 'bg-surface-3 text-transparent hover:bg-surface-2'
                                } ${isAprovada ? 'cursor-default' : 'cursor-pointer'}`}
                              >
                                {present && <Check className="w-3.5 h-3.5" />}
                              </button>
                              {present && <span className="print-day-mark">&#10003;</span>}
                            </td>
                          );
                        })}
                        <td className="col-total prt-col-total px-4 py-3 text-right">
                          <span className="font-data text-sm font-bold text-mos-700">
                            {formatCurrencyFull(rowData?.total ?? 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="prt-tfoot-row bg-surface-1 border-t-2 border-surface-3">
                    <td colSpan={3 + days.length} className="px-4 py-4 text-right">
                      <span className="prt-tfoot-label font-body text-xs font-bold text-text-tertiary tracking-widest uppercase">
                        Total Consolidado da Quinzena
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="prt-tfoot-value font-data text-base font-bold text-mos-700">
                        {formatCurrencyFull(totalQuinzena)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer (screen) ── */}
        {isAprovada && planilha.aprovada_em && (
          <p className="text-center font-body text-xs text-text-tertiary py-2 print-hide">
            Aprovada em {fmtAprovadaEm(planilha.aprovada_em)}
          </p>
        )}

        {/* ── Print document footer ── */}
        <div className="prt-footer">
          <span className="prt-footer-left">
            {isAprovada && planilha.aprovada_em
              ? `Aprovada em ${fmtAprovadaEm(planilha.aprovada_em)} · Documento oficial — não requer assinatura adicional`
              : 'Planilha pendente de aprovação'}
          </span>
          <span className="prt-footer-right">MOS Engenharia — Gestor de Obras</span>
        </div>
      </div>

      {showAddFunc && (
        <AdicionarFuncionarioModal
          planilhaId={id!}
          ordem={funcionarios.length}
          onClose={() => setShowAddFunc(false)}
          onSaved={f => {
            setFuncionarios(prev => [...prev, f]);
            setShowAddFunc(false);
          }}
        />
      )}

      {showApproveModal && (
        <ApproveModal
          onConfirm={aprovarPlanilha}
          onCancel={() => setShowApproveModal(false)}
          saving={approving}
        />
      )}
    </AppLayout>
  );
}
