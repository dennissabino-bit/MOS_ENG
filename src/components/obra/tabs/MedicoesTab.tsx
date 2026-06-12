import { useMemo, useState } from 'react';
import { Plus, Search, CheckCircle2, Clock, XCircle, Minus, Pencil, Trash2, Receipt } from 'lucide-react';
import type { Medicao } from '../../../lib/database.types';
import { formatCurrencyFull, formatCurrency, formatCurrencyMi } from '../../../lib/formatters';
import { NovaMedicaoModal } from '../NovaMedicaoModal';

type CatGroup = 'infraestrutura' | 'superestrutura' | 'instalacoes' | 'acabamentos' | 'extra' | 'outros';

const CAT_LABELS: Record<CatGroup, string> = {
  infraestrutura: 'INFRAESTRUTURA',
  superestrutura: 'SUPERESTRUTURA',
  instalacoes: 'INSTALAÇÕES PREDIAIS',
  acabamentos: 'ACABAMENTOS',
  extra: 'EXTRAS',
  outros: 'OUTROS',
};

function computeValorTotal(m: Medicao): number {
  if (m.qtd_medida != null && m.qtd_medida > 0) {
    return m.qtd_medida * (m.valor_unitario || 0);
  }
  if (m.valor_total != null && m.valor_total > 0) return m.valor_total;
  return (m.qtd_orcada || 0) * (m.valor_unitario || 0);
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'aprovada') return <CheckCircle2 className="w-4 h-4 text-status-success" />;
  if (status === 'pendente') return <Clock className="w-4 h-4 text-status-warning" />;
  if (status === 'reprovada') return <XCircle className="w-4 h-4 text-status-error" />;
  return <Minus className="w-4 h-4 text-text-disabled" />;
}

function MiniBar({ percent, status }: { percent: number; status: string }) {
  const color = status === 'aprovada' ? 'bg-status-success' : status === 'pendente' ? 'bg-status-warning' : status === 'reprovada' ? 'bg-status-error' : 'bg-surface-3';
  return (
    <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

interface MedicoesTabProps {
  medicoes: Medicao[];
  obraOrcado: number;
  obraId: string;
  onMedicoesChange: (updater: (prev: Medicao[]) => Medicao[]) => void;
}

export function MedicoesTab({ medicoes, obraOrcado, obraId, onMedicoesChange }: MedicoesTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas as categorias');
  const [statusFilter, setStatusFilter] = useState('Todos os status');
  const [fornFilter, setFornFilter] = useState('Todos os fornecedores');

  function handleMedicaoSaved(item: Medicao) {
    onMedicoesChange(prev => [...prev, item]);
  }

  const { totalMedido, totalAprovado, totalPendente, totalReprovado } = useMemo(() => {
    let medido = 0, aprovado = 0, pendente = 0, reprovado = 0;
    for (const m of medicoes) {
      const v = computeValorTotal(m);
      medido += v;
      if (m.status === 'aprovada') aprovado += v;
      else if (m.status === 'pendente') pendente += v;
      else if (m.status === 'reprovada') reprovado += v;
    }
    return { totalMedido: medido, totalAprovado: aprovado, totalPendente: pendente, totalReprovado: reprovado };
  }, [medicoes]);

  const totalAMedir = obraOrcado - totalMedido;

  const aprovPercent = obraOrcado > 0 ? (totalAprovado / obraOrcado) * 100 : 0;
  const pendPercent = obraOrcado > 0 ? (totalPendente / obraOrcado) * 100 : 0;
  const reprovPercent = obraOrcado > 0 ? (totalReprovado / obraOrcado) * 100 : 0;
  const aMedirPercent = 100 - aprovPercent - pendPercent - reprovPercent;

  const filteredMeds = useMemo(() => medicoes.filter(m => {
    if (search && !m.descricao.toLowerCase().includes(search.toLowerCase()) && !m.codigo.includes(search)) return false;
    return true;
  }), [medicoes, search]);

  const cats: CatGroup[] = ['infraestrutura', 'superestrutura', 'instalacoes', 'acabamentos', 'extra', 'outros'];

  const medicoesByCat = useMemo(() => {
    const groups = new Map<CatGroup, Medicao[]>();
    for (const m of filteredMeds) {
      const key: CatGroup = (cats as string[]).includes(m.categoria as string) && m.categoria !== 'outros'
        ? (m.categoria as CatGroup)
        : 'outros';
      const list = groups.get(key) || [];
      list.push(m);
      groups.set(key, list);
    }
    return groups;
  }, [filteredMeds]);

  const fornecedores = [...new Set(medicoes.map(m => m.fornecedor_nome).filter(Boolean))];

  const catTotal = (cat: CatGroup) => {
    const list = medicoesByCat.get(cat) || [];
    return list.reduce((s, m) => s + computeValorTotal(m), 0);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            iconEl: <div className="w-9 h-9 rounded-lg bg-mos-700 flex items-center justify-center"><Receipt className="w-5 h-5 text-white" /></div>,
            label: 'Total Medido',
            value: formatCurrencyMi(totalMedido),
            sub: `${medicoes.length} medições registradas`,
            color: 'text-text-primary',
          },
          {
            iconEl: <div className="w-9 h-9 rounded-lg bg-status-successLight flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-status-success" /></div>,
            label: 'Realizado (Aprovado)',
            value: formatCurrencyMi(totalAprovado),
            sub: `${Math.round(aprovPercent)}% do orçamento · ${medicoes.filter(m => m.status === 'aprovada').length} itens`,
            color: 'text-status-success',
          },
          {
            iconEl: <div className="w-9 h-9 rounded-lg bg-status-warningLight flex items-center justify-center"><Clock className="w-5 h-5 text-status-warning" /></div>,
            label: 'Aguardando Aprovação',
            value: formatCurrencyMi(totalPendente),
            sub: `${medicoes.filter(m => m.status === 'pendente').length} medições pendentes`,
            color: 'text-status-warning',
          },
          {
            iconEl: <div className="w-9 h-9 rounded-lg bg-status-errorLight flex items-center justify-center"><XCircle className="w-5 h-5 text-status-error" /></div>,
            label: 'Reprovadas',
            value: formatCurrencyMi(totalReprovado),
            sub: `${medicoes.filter(m => m.status === 'reprovada').length} medições reprovadas`,
            color: 'text-status-error',
          },
        ].map((k, i) => (
          <div key={i} className="card p-4">
            <div className="mb-3">{k.iconEl}</div>
            <p className={`font-display font-bold text-xl ${k.color} mb-0.5`}>{k.value}</p>
            <p className="font-body text-xs font-semibold text-text-secondary mb-1">{k.label}</p>
            <p className="font-body text-xs text-text-tertiary">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-text-primary">Avanço Financeiro — Medido vs. Orçado</h3>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Apenas medições <span className="font-semibold text-text-primary">Aprovadas</span> entram no Realizado</p>
          </div>
          <div className="text-right">
            <span className="font-data font-bold text-2xl text-mos-700 block">
              {aprovPercent.toFixed(1)}%
            </span>
            <span className="font-body text-xs text-text-tertiary">
              {formatCurrencyMi(totalAprovado)} de {formatCurrencyMi(obraOrcado)}
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden flex mb-2">
          <div className="h-full bg-status-success rounded-l-full transition-all" style={{ width: `${aprovPercent}%` }} />
          <div className="h-full bg-status-warning transition-all" style={{ width: `${pendPercent}%` }} />
          <div className="h-full bg-status-error transition-all" style={{ width: `${reprovPercent}%` }} />
          <div className="h-full bg-surface-3 transition-all" style={{ width: `${Math.max(aMedirPercent, 0)}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-status-success inline-block" />
            Aprovado {formatCurrency(totalAprovado)}
          </span>
          <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-status-warning inline-block" />
            Pendente {formatCurrency(totalPendente)}
          </span>
          <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-status-error inline-block" />
            Reprovado {formatCurrency(totalReprovado)}
          </span>
          <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-surface-3 border border-surface-3 inline-block" />
            A medir {formatCurrency(Math.max(totalAMedir, 0))}
          </span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="font-body text-sm text-text-primary bg-transparent outline-none flex-1 placeholder:text-text-disabled"
            />
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-surface-3 font-body text-xs text-text-secondary bg-surface-0 outline-none"
          >
            <option>Todas as categorias</option>
            <option>Infraestrutura</option>
            <option>Superestrutura</option>
            <option>Instalações Prediais</option>
            <option>Acabamentos</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-surface-3 font-body text-xs text-text-secondary bg-surface-0 outline-none"
          >
            <option>Todos os status</option>
            <option>Aprovada</option>
            <option>Pendente</option>
            <option>Reprovada</option>
            <option>A medir</option>
          </select>
          <select
            value={fornFilter}
            onChange={e => setFornFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-surface-3 font-body text-xs text-text-secondary bg-surface-0 outline-none"
          >
            <option>Todos os fornecedores</option>
            {fornecedores.map(f => <option key={f}>{f}</option>)}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-mos-700 text-white font-body text-xs font-medium hover:bg-mos-800 transition-colors ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Medição
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-2 bg-surface-1">
                <th className="text-left py-2.5 px-4 font-body text-xs font-semibold text-text-tertiary tracking-wider w-16">CÓDIGO</th>
                <th className="text-left py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider">DESCRIÇÃO</th>
                <th className="text-left py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider">FORNECEDOR</th>
                <th className="text-center py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-10">UN.</th>
                <th className="text-right py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-24">QTD. ORC.</th>
                <th className="text-right py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-24">QTD. MED.</th>
                <th className="text-right py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-28">VALOR UNIT.</th>
                <th className="text-right py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-28">VALOR TOTAL</th>
                <th className="text-center py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-16">STATUS</th>
                <th className="py-2.5 px-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {cats.map((cat) => {
                const rows = medicoesByCat.get(cat) || [];
                if (rows.length === 0) return null;
                const catSum = catTotal(cat);
                return (
                  <>
                    <tr key={`h-${cat}`} className="bg-surface-1 border-b border-surface-2">
                      <td colSpan={8} className="py-2 px-4">
                        <span className="font-body text-xs font-bold text-mos-700 tracking-widest">{CAT_LABELS[cat]}</span>
                      </td>
                      <td colSpan={2} className="py-2 px-3 text-right">
                        <span className="font-body text-xs font-semibold text-text-secondary">Total: {formatCurrencyMi(catSum)}</span>
                      </td>
                    </tr>
                    {rows.map((m) => {
                      const medPercent = m.qtd_orcada > 0 && m.qtd_medida != null ? (m.qtd_medida / m.qtd_orcada) * 100 : 0;
                      const canEdit = m.status === 'pendente' || m.status === 'a_medir';
                      return (
                        <tr key={m.id} className="border-b border-surface-2 hover:bg-surface-1 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="font-data text-xs text-text-tertiary">{m.codigo}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div>
                              <span className="font-body text-sm text-text-primary">{m.descricao}</span>
                              <MiniBar percent={medPercent} status={m.status} />
                              {medPercent > 0 && (
                                <span className="font-data text-[10px] text-text-tertiary">{Math.round(medPercent)}%</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-body text-xs text-text-secondary">{m.fornecedor_nome || '—'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-data text-xs text-text-secondary">{m.unidade}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-data text-sm text-text-secondary">{m.qtd_orcada.toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-data text-sm text-text-secondary">
                              {m.qtd_medida != null ? m.qtd_medida.toLocaleString('pt-BR') : '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-data text-sm text-text-secondary">{formatCurrencyFull(m.valor_unitario)}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-data text-sm font-semibold text-text-primary">
                              {formatCurrencyFull(computeValorTotal(m))}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusIcon status={m.status} />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 justify-center">
                              {canEdit && (
                                <button className="p-1 rounded hover:bg-surface-2 transition-colors">
                                  <Pencil className="w-3.5 h-3.5 text-text-tertiary" />
                                </button>
                              )}
                              {canEdit && (
                                <button className="p-1 rounded hover:bg-status-errorLight transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 text-status-error" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })}
              {medicoes.length > 0 && (
                <tr className="border-t-2 border-surface-3 bg-surface-1">
                  <td colSpan={7} className="py-3 px-4">
                    <span className="font-display font-bold text-sm text-text-primary">TOTAL MEDIÇÕES</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-data font-bold text-base text-mos-700">{formatCurrencyMi(totalMedido)}</span>
                  </td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-surface-1 border-t border-surface-2">
          <p className="font-body text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1 mr-1"><TrendingUpIcon className="w-3 h-3" /></span>
            Realizado Total = {formatCurrencyMi(totalAprovado)} — Este valor é calculado automaticamente a partir das medições com status <span className="font-semibold text-text-primary">Aprovada</span> e sincroniza com os Scorecards da Visão Geral e do Dashboard Consolidado.{' '}
            <span className="text-text-disabled">Em produção, a query é: SELECT SUM(qtd_medida * valor_unitario) FROM medicoes WHERE status = 'Aprovada'</span>
          </p>
        </div>
      </div>

      {showModal && (
        <NovaMedicaoModal
          obraId={obraId}
          onClose={() => setShowModal(false)}
          onSaved={handleMedicaoSaved}
        />
      )}
    </div>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
