import { useMemo, useState } from 'react';
import { Plus, TrendingUp, DollarSign, FileText, TrendingDown, Pencil, Trash2 } from 'lucide-react';
import type { EtapaEap, Obra } from '../../../lib/database.types';
import type { ObraKpis } from '../../../hooks/useObraData';
import { formatCurrencyFull, formatCurrency } from '../../../lib/formatters';
import { supabase } from '../../../lib/supabase';
import { NovoItemModal } from '../NovoItemModal';
import { EditarItemModal } from '../EditarItemModal';

type FilterCat = 'todas' | 'infraestrutura' | 'superestrutura' | 'instalacoes' | 'acabamentos' | 'extra';

const FILTER_TABS: { id: FilterCat; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'infraestrutura', label: '1.0 Infraestrutura' },
  { id: 'superestrutura', label: '2.0 Superestrutura' },
  { id: 'instalacoes', label: '3.0 Instalações Prediais' },
  { id: 'acabamentos', label: '4.0 Acabamentos' },
  { id: 'extra', label: 'E.0 Custo Extraordinário (Variações Aprovadas)' },
];

interface OrcamentoTabProps {
  obra: Obra;
  etapas: EtapaEap[];
  kpis: ObraKpis;
  onEtapasChange: () => void | Promise<void>;
}

export function OrcamentoTab({ obra, etapas, kpis, onEtapasChange }: OrcamentoTabProps) {
  const [filter, setFilter] = useState<FilterCat>('todas');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EtapaEap | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleItemSaved() {
    await onEtapasChange();
    setShowModal(false);
  }

  async function handleItemEdited() {
    await onEtapasChange();
    setEditingItem(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from('etapas_eap').delete().eq('id', id);
    await onEtapasChange();
    setDeletingId(null);
  }

  const { totalOrcado, totalRealizado, desvio, desvioPercent, isOver } = kpis;

  const filtered = useMemo(
    () => filter === 'todas' ? etapas : etapas.filter(e => e.categoria === filter),
    [etapas, filter]
  );

  const macros = filtered.filter(e => e.nivel === 'macro');
  const getSubs = (categoria: string) =>
    filtered.filter(e => e.nivel === 'sub' && e.categoria === categoria);

  const totalGeral = useMemo(
    () => filtered.reduce((sum, e) => sum + (e.valor_total ?? 0), 0),
    [filtered]
  );

  const categoriaNome: Record<string, string> = {
    infraestrutura: 'Infraestrutura',
    superestrutura: 'Superestrutura',
    instalacoes: 'Instalações Prediais',
    acabamentos: 'Acabamentos',
    extra: 'Custo Extraordinário (Variações Aprovadas)',
  };

  const dotColor: Record<string, string> = {
    infraestrutura: 'bg-mos-700',
    superestrutura: 'bg-status-info',
    instalacoes: 'bg-status-warning',
    acabamentos: 'bg-status-success',
    extra: 'bg-status-error',
  };

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-mos-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-text-primary">{formatCurrency(totalOrcado)}</p>
          <p className="font-body text-xs font-semibold text-text-secondary mt-0.5">ORÇAMENTO TOTAL</p>
          <p className="font-body text-xs text-text-tertiary mt-0.5">{obra.codigo} · soma das etapas EAP</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOver ? 'bg-status-error' : 'bg-status-success'}`}>
              {isOver ? <TrendingUp className="w-4 h-4 text-white" /> : <TrendingDown className="w-4 h-4 text-white" />}
            </div>
            <span className={`flex items-center gap-0.5 font-data text-xs font-semibold ${isOver ? 'text-status-error' : 'text-status-success'}`}>
              {isOver ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isOver ? '+' : '-'}{desvioPercent}%
            </span>
          </div>
          <p className="font-display font-bold text-xl text-text-primary">{formatCurrency(Math.abs(desvio))}</p>
          <p className="font-body text-xs font-semibold text-text-secondary mt-0.5">DESVIO TOTAL</p>
          <p className="font-body text-xs text-text-tertiary mt-0.5">{isOver ? 'Estouro de custo' : 'Economia registrada'}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center">
              <FileText className="w-4 h-4 text-text-secondary" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-text-primary">{formatCurrency(totalRealizado)}</p>
          <p className="font-body text-xs font-semibold text-text-secondary mt-0.5">REALIZADO TOTAL</p>
          <p className="font-body text-xs text-text-tertiary mt-0.5">Puxado das medições aprovadas</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-2 flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {FILTER_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-md font-body text-xs font-medium transition-colors ${
                  filter === t.id
                    ? 'bg-surface-2 text-text-primary'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-1'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-mos-700 text-white font-body text-xs font-medium hover:bg-mos-800 transition-colors ml-3 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-2">
                <th className="text-left py-2.5 px-4 font-body text-xs font-semibold text-text-tertiary tracking-wider w-24">ITEM (EAP)</th>
                <th className="text-left py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider">DESCRIÇÃO</th>
                <th className="text-left py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-20">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> INÍCIO</span>
                </th>
                <th className="text-left py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-20">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> FIM</span>
                </th>
                <th className="text-left py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-20">UNIDADE</th>
                <th className="text-right py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-24">QUANTIDADE</th>
                <th className="text-right py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-36">VALOR UNITÁRIO (R$)</th>
                <th className="text-right py-2.5 px-3 font-body text-xs font-semibold text-text-tertiary tracking-wider w-36">VALOR TOTAL (R$)</th>
                <th className="py-2.5 px-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {macros.map((macro) => {
                const subs = getSubs(macro.categoria);
                return (
                  <>
                    <tr key={macro.id} className="bg-surface-1 border-b border-surface-2 group">
                      <td className="py-2.5 px-4">
                        <span className="font-data text-sm font-bold text-text-primary">{macro.codigo}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${dotColor[macro.categoria] || 'bg-text-disabled'}`} />
                          <span className="font-display font-semibold text-sm text-text-primary">
                            {macro.descricao}
                            {macro.is_extra && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-warningLight text-status-warning">EXTRA</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {macro.data_inicio && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-status-successLight font-data text-xs text-status-success font-medium">
                            {macro.data_inicio}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {macro.data_fim && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-status-errorLight font-data text-xs text-status-error font-medium">
                            {macro.data_fim}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3" />
                      <td className="py-2.5 px-3" />
                      <td className="py-2.5 px-3" />
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-data text-sm font-bold text-mos-700">
                          {formatCurrencyFull(macro.valor_total)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingItem(macro)}
                            className="p-1 rounded hover:bg-surface-2 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5 text-text-tertiary hover:text-mos-700 transition-colors" />
                          </button>
                          <button
                            onClick={() => handleDelete(macro.id)}
                            disabled={deletingId === macro.id}
                            className="p-1 rounded hover:bg-status-errorLight transition-colors disabled:opacity-40"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-status-error transition-colors" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {subs.map((sub) => (
                      <tr key={sub.id} className="border-b border-surface-2 hover:bg-surface-1 transition-colors group">
                        <td className="py-2.5 px-4">
                          <span className="font-data text-sm text-text-secondary">{sub.codigo}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-body text-sm text-text-primary group-hover:text-mos-700 transition-colors">
                            {sub.descricao}
                            {sub.is_extra && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-warningLight text-status-warning">EXTRA</span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {sub.data_inicio && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-status-successLight font-data text-xs text-status-success font-medium">
                              {sub.data_inicio}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {sub.data_fim && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-status-errorLight font-data text-xs text-status-error font-medium">
                              {sub.data_fim}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-data text-sm text-text-secondary">{sub.unidade || '—'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-data text-sm text-text-secondary">
                            {sub.quantidade != null ? sub.quantidade.toLocaleString('pt-BR') : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-data text-sm text-text-secondary">
                            {sub.valor_unitario ? formatCurrencyFull(sub.valor_unitario) : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-data text-sm font-semibold text-text-primary">
                            {formatCurrencyFull(sub.valor_total)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingItem(sub)}
                              className="p-1 rounded hover:bg-surface-2 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5 text-text-tertiary hover:text-mos-700 transition-colors" />
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              disabled={deletingId === sub.id}
                              className="p-1 rounded hover:bg-status-errorLight transition-colors disabled:opacity-40"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-status-error transition-colors" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
              <tr className="bg-text-primary">
                <td className="py-3 px-4" colSpan={7}>
                  <span className="font-display font-bold text-sm text-white">
                    {filter === 'todas' ? 'TOTAL GERAL' : `TOTAL · ${categoriaNome[filter] ?? filter}`}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-data font-bold text-sm text-white">{formatCurrencyFull(totalGeral)}</span>
                </td>
                <td className="py-3 px-3" />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-surface-1 border-t border-surface-2 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-body text-xs text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-mos-700 inline-block" /> Etapas macro (EAP nível 1)
          </span>
          <span className="flex items-center gap-1.5 font-body text-xs text-text-tertiary">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-warningLight text-status-warning">EXTRA</span>
            Variações aprovadas em reunião
          </span>
          <span className="flex items-center gap-1.5 font-body text-xs text-text-tertiary">
            <span className="px-1.5 py-0.5 rounded-full bg-status-successLight text-status-success text-[10px] font-medium">Jan/26</span>
            Prazo Início/Fim · alimenta o Cronograma Físico
          </span>
          <span className="font-body text-xs text-text-tertiary">
            {etapas.filter(e => e.nivel === 'sub').length} itens · {etapas.filter(e => e.nivel === 'macro').length} etapas macro
          </span>
        </div>
      </div>

      <p className="font-body text-xs text-text-disabled text-center italic">
        Passe o mouse sobre uma linha para ver as ações de editar e excluir
      </p>

      {showModal && (
        <NovoItemModal
          obraId={obra.id}
          onClose={() => setShowModal(false)}
          onSaved={handleItemSaved}
        />
      )}

      {editingItem && (
        <EditarItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleItemEdited}
        />
      )}
    </div>
  );
}
