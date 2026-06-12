import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, UserPlus, CheckCircle, TrendingDown,
  Printer, Loader2, X, AlertCircle, PartyPopper
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { AdicionarItemModal } from '../components/cotacoes/AdicionarItemModal';
import { AdicionarFornecedorModal } from '../components/cotacoes/AdicionarFornecedorModal';
import { supabase } from '../lib/supabase';
import type { CotacaoGrupo, CotacaoItem, CotacaoProposta, Fornecedor } from '../lib/database.types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

interface ConfirmAprovarProps {
  fornecedorNome: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

function ConfirmAprovarModal({ fornecedorNome, onConfirm, onCancel, saving }: ConfirmAprovarProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <CheckCircle className="w-10 h-10 text-status-success mx-auto mb-3" />
          <h3 className="font-display font-bold text-base text-text-primary mb-1">Aprovar Cotação?</h3>
          <p className="font-body text-sm text-text-secondary">
            O fornecedor <span className="font-semibold text-text-primary">{fornecedorNome}</span> será marcado como vencedor e a cotação ficará fechada.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-status-success text-white font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Aprovando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CotacaoComparativo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [grupo, setGrupo] = useState<CotacaoGrupo | null>(null);
  const [itens, setItens] = useState<CotacaoItem[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [propostas, setPropostas] = useState<CotacaoProposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddForn, setShowAddForn] = useState(false);
  const [confirmAprovar, setConfirmAprovar] = useState<string | null>(null); // fornecedor_id
  const [aprovando, setAprovando] = useState(false);

  // inline editing
  const [editing, setEditing] = useState<{ fornId: string; itemId: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [grupoRes, itensRes, propostasRes] = await Promise.all([
      supabase.from('cotacao_grupos').select('*, obras(nome, codigo), fornecedores(nome)').eq('id', id).single(),
      supabase.from('cotacao_itens').select('*').eq('grupo_id', id).order('ordem'),
      supabase.from('cotacao_propostas').select('*').eq('grupo_id', id),
    ]);

    if (grupoRes.error || !grupoRes.data) {
      setError('Cotação não encontrada.');
      setLoading(false);
      return;
    }

    setGrupo(grupoRes.data as CotacaoGrupo);
    setItens((itensRes.data ?? []) as CotacaoItem[]);

    // Extract distinct fornecedor IDs from propostas and fetch their data
    const fornIds = [...new Set((propostasRes.data ?? []).map((p: CotacaoProposta) => p.fornecedor_id))];
    if (fornIds.length > 0) {
      const { data: forns } = await supabase.from('fornecedores').select('*').in('id', fornIds).order('nome');
      setFornecedores((forns ?? []) as Fornecedor[]);
    } else {
      setFornecedores([]);
    }
    setPropostas((propostasRes.data ?? []) as CotacaoProposta[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── derived data ────────────────────────────────────────────────────────────

  function getPreco(fornId: string, itemId: string): number | null {
    return propostas.find(p => p.fornecedor_id === fornId && p.item_id === itemId)?.preco_unitario ?? null;
  }

  function totalFornecedor(fornId: string): number {
    return itens.reduce((acc, item) => {
      const p = getPreco(fornId, item.id);
      return acc + (p != null ? p * item.quantidade : 0);
    }, 0);
  }

  const totais = fornecedores.map(f => ({ id: f.id, total: totalFornecedor(f.id) }));
  const totaisValidos = totais.filter(t => t.total > 0);
  const minTotal = totaisValidos.length > 0 ? Math.min(...totaisValidos.map(t => t.total)) : null;
  const maxTotal = totaisValidos.length > 0 ? Math.max(...totaisValidos.map(t => t.total)) : null;
  const economia = (minTotal != null && maxTotal != null && minTotal !== maxTotal) ? maxTotal - minTotal : null;

  function vencedorId(): string | null {
    if (!minTotal || totaisValidos.length === 0) return null;
    return totaisValidos.find(t => t.total === minTotal)?.id ?? null;
  }

  function precoMinItem(itemId: string): number | null {
    const prices = fornecedores.map(f => getPreco(f.id, itemId)).filter((p): p is number => p != null);
    return prices.length > 0 ? Math.min(...prices) : null;
  }

  function precoMaxItem(itemId: string): number | null {
    const prices = fornecedores.map(f => getPreco(f.id, itemId)).filter((p): p is number => p != null);
    return prices.length > 0 ? Math.max(...prices) : null;
  }

  // ── inline price edit ───────────────────────────────────────────────────────

  function startEdit(fornId: string, itemId: string) {
    if (grupo?.status === 'fechada') return;
    const current = getPreco(fornId, itemId);
    setEditing({ fornId, itemId });
    setEditValue(current != null ? String(current) : '');
  }

  async function commitEdit() {
    if (!editing) return;
    const { fornId, itemId } = editing;
    const preco = editValue === '' ? null : parseFloat(editValue.replace(',', '.'));

    setEditing(null);

    const existing = propostas.find(p => p.fornecedor_id === fornId && p.item_id === itemId);
    if (existing) {
      setPropostas(prev => prev.map(p =>
        p.fornecedor_id === fornId && p.item_id === itemId
          ? { ...p, preco_unitario: preco }
          : p
      ));
      await supabase.from('cotacao_propostas').update({ preco_unitario: preco }).eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('cotacao_propostas')
        .insert({ grupo_id: id!, fornecedor_id: fornId, item_id: itemId, preco_unitario: preco })
        .select()
        .single();
      if (data) setPropostas(prev => [...prev, data as CotacaoProposta]);
    }
  }

  // ── remove supplier ─────────────────────────────────────────────────────────

  async function handleRemoveFornecedor(fornId: string) {
    setFornecedores(prev => prev.filter(f => f.id !== fornId));
    setPropostas(prev => prev.filter(p => p.fornecedor_id !== fornId));
    await supabase.from('cotacao_propostas').delete().eq('grupo_id', id!).eq('fornecedor_id', fornId);
  }

  // ── approve ─────────────────────────────────────────────────────────────────

  async function handleAprovar() {
    const wId = vencedorId();
    if (!wId || !grupo) return;
    setAprovando(true);

    await supabase.from('cotacao_grupos').update({
      status: 'fechada',
      fornecedor_vencedor_id: wId,
    }).eq('id', grupo.id);

    setGrupo(prev => prev ? { ...prev, status: 'fechada', fornecedor_vencedor_id: wId } : prev);
    setConfirmAprovar(null);
    setAprovando(false);
  }

  // ── event handlers for child modals ─────────────────────────────────────────

  function handleItemSaved(item: CotacaoItem) {
    setItens(prev => [...prev, item]);
  }

  function handleFornecedorSaved(forn: Fornecedor, novasPropostas: CotacaoProposta[]) {
    setFornecedores(prev => [...prev, forn]);
    setPropostas(prev => [...prev, ...novasPropostas]);
  }

  // ── render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout title="Cotação" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !grupo) {
    return (
      <AppLayout title="Cotação" subtitle="">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-10 h-10 text-status-error" />
          <p className="font-body text-sm text-text-secondary">{error ?? 'Cotação não encontrada.'}</p>
          <button onClick={() => navigate('/cotacoes')} className="btn-primary">Voltar</button>
        </div>
      </AppLayout>
    );
  }

  const isFechada = grupo.status === 'fechada';
  const winId = grupo.fornecedor_vencedor_id ?? vencedorId();
  const winForn = fornecedores.find(f => f.id === winId);
  const canAprovar = !isFechada && fornecedores.length >= 1 && itens.length >= 1 && vencedorId() != null;

  return (
    <AppLayout title={grupo.titulo} subtitle="">
      <div className="p-6 space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/cotacoes')}
            className="flex items-center gap-1.5 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Cotações
          </button>
          <div className="h-4 w-px bg-surface-3" />
          <div className="flex items-center gap-2 flex-wrap">
            {grupo.obras && (
              <span className="font-body text-sm text-text-secondary">{grupo.obras.nome}</span>
            )}
            {grupo.categoria && (
              <>
                <span className="text-text-disabled">·</span>
                <span className="font-body text-sm text-text-secondary">{grupo.categoria}</span>
              </>
            )}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-body font-medium ${
              isFechada ? 'bg-status-successLight text-status-success' : 'bg-status-infoLight text-status-info'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {isFechada ? 'Fechada' : 'Aberta'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-3 bg-surface-0 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors shadow-card"
            >
              <Printer className="w-4 h-4" />
              Imprimir PDF
            </button>
            {!isFechada && (
              <>
                <button
                  onClick={() => setShowAddItem(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-3 bg-surface-0 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors shadow-card"
                >
                  <Plus className="w-4 h-4" />
                  Novo Item
                </button>
                <button
                  onClick={() => setShowAddForn(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-3 bg-surface-0 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors shadow-card"
                >
                  <UserPlus className="w-4 h-4" />
                  Adicionar Fornecedor
                </button>
                {canAprovar && (
                  <button
                    onClick={() => setConfirmAprovar(vencedorId()!)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors shadow-card"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar Cotação
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Economy banner ── */}
        {economia != null && (
          <div className="card p-5 bg-gradient-to-r from-status-success/5 to-status-success/10 border-status-success/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-status-success/10 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-5 h-5 text-status-success" />
              </div>
              <div>
                <p className="font-body text-[10px] font-semibold text-status-success tracking-widest mb-0.5">ECONOMIA ESTIMADA</p>
                <p className="font-display font-bold text-2xl text-status-success">{fmt(economia)}</p>
              </div>
              <p className="ml-auto font-body text-xs text-text-tertiary hidden sm:block">
                Negociado em relação à cotação mais alta
              </p>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {itens.length === 0 && fornecedores.length === 0 && (
          <div className="card p-10 text-center">
            <Plus className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="font-body text-sm text-text-tertiary mb-4">Nenhum item ou fornecedor adicionado ainda.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowAddItem(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Novo Item
              </button>
              <button onClick={() => setShowAddForn(true)} className="btn-secondary flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Adicionar Fornecedor
              </button>
            </div>
          </div>
        )}

        {/* ── Comparison table ── */}
        {(itens.length > 0 || fornecedores.length > 0) && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-surface-2">
                    {/* Fixed cols */}
                    <th className="text-left px-5 py-3.5 font-body text-[10px] font-semibold text-text-tertiary tracking-wider bg-surface-1 min-w-[200px]">ITEM / DESCRIÇÃO</th>
                    <th className="text-center px-4 py-3.5 font-body text-[10px] font-semibold text-text-tertiary tracking-wider bg-surface-1 w-20">UND</th>
                    <th className="text-center px-4 py-3.5 font-body text-[10px] font-semibold text-text-tertiary tracking-wider bg-surface-1 w-20">QTD</th>
                    {/* Supplier cols */}
                    {fornecedores.map(forn => (
                      <th
                        key={forn.id}
                        className={`text-center px-5 py-3.5 min-w-[160px] border-l border-surface-2 ${
                          forn.id === winId && isFechada ? 'bg-status-success/5' : 'bg-surface-1'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {forn.id === winId && isFechada && (
                            <span className="px-2 py-0.5 rounded bg-status-success text-white font-body text-[9px] font-bold tracking-wider">
                              SELECIONADO
                            </span>
                          )}
                          <span className="font-body text-xs font-semibold text-text-primary uppercase">{forn.nome}</span>
                          {!isFechada && (
                            <button
                              onClick={() => handleRemoveFornecedor(forn.id)}
                              className="font-body text-[10px] text-status-error hover:underline flex items-center gap-0.5"
                            >
                              <X className="w-3 h-3" /> remover
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => {
                    const minP = precoMinItem(item.id);
                    const maxP = precoMaxItem(item.id);
                    const hasSpread = minP != null && maxP != null && minP !== maxP;

                    return (
                      <tr key={item.id} className="border-b border-surface-2 last:border-0">
                        <td className="px-5 py-4 bg-surface-1/50">
                          <p className="font-body font-semibold text-sm text-text-primary">{item.descricao}</p>
                        </td>
                        <td className="px-4 py-4 text-center bg-surface-1/50">
                          <span className="font-data text-sm text-text-secondary">{item.unidade}</span>
                        </td>
                        <td className="px-4 py-4 text-center bg-surface-1/50">
                          <span className="font-data text-sm text-text-primary font-medium">
                            {item.quantidade % 1 === 0 ? item.quantidade : item.quantidade.toFixed(2)}
                          </span>
                        </td>
                        {fornecedores.map(forn => {
                          const preco = getPreco(forn.id, item.id);
                          const total = preco != null ? preco * item.quantidade : null;
                          const isMin = hasSpread && preco === minP;
                          const isMax = hasSpread && preco === maxP;
                          const isWinCol = forn.id === winId && isFechada;
                          const isActive = editing?.fornId === forn.id && editing?.itemId === item.id;

                          return (
                            <td
                              key={forn.id}
                              className={`px-5 py-4 border-l border-surface-2 cursor-pointer select-none transition-colors ${
                                isWinCol ? 'bg-status-success/5' : 'hover:bg-surface-1'
                              } ${isMin ? 'bg-green-50' : ''} ${isMax ? 'bg-red-50' : ''}`}
                              onClick={() => startEdit(forn.id, item.id)}
                            >
                              {isActive ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  autoFocus
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                                  className="w-full text-right font-data text-sm font-bold border border-mos-700 rounded px-2 py-1 focus:outline-none bg-white"
                                  onClick={e => e.stopPropagation()}
                                />
                              ) : (
                                <div className="text-right">
                                  <div className="flex items-baseline justify-end gap-1">
                                    <span className="font-data text-[10px] text-text-tertiary">R$</span>
                                    <span className={`font-data font-bold text-lg leading-tight ${
                                      isMin ? 'text-status-success' : isMax ? 'text-status-error' : 'text-text-primary'
                                    }`}>
                                      {preco != null ? preco.toLocaleString('pt-BR') : '—'}
                                    </span>
                                  </div>
                                  {total != null && (
                                    <p className="font-data text-[10px] text-text-tertiary mt-0.5">
                                      Custo total: <span className="font-semibold">{fmt(total)}</span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Footer totals row */}
                {fornecedores.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-surface-3 bg-surface-1">
                      <td colSpan={3} className="px-5 py-4">
                        <span className="font-body text-[10px] font-semibold text-text-tertiary tracking-widest">VALOR TOTAL DA COTAÇÃO</span>
                      </td>
                      {fornecedores.map(forn => {
                        const total = totalFornecedor(forn.id);
                        const isWinner = forn.id === winId;
                        const isWinCol = isWinner && isFechada;

                        return (
                          <td key={forn.id} className={`px-5 py-4 border-l border-surface-3 text-right ${isWinCol ? 'bg-status-success/5' : ''}`}>
                            <div className="flex items-center justify-end gap-1.5">
                              <p className={`font-data font-bold text-base ${
                                isWinCol ? 'text-status-success' :
                                isWinner && !isFechada ? 'text-status-success' :
                                'text-text-primary'
                              }`}>
                                {total > 0 ? fmt(total) : '—'}
                              </p>
                              {isWinner && total > 0 && (
                                <CheckCircle className={`w-4 h-4 flex-shrink-0 ${isFechada ? 'text-status-success' : 'text-status-success/60'}`} />
                              )}
                            </div>
                            <p className="font-body text-[9px] font-semibold text-text-disabled tracking-widest mt-0.5">BUDGET ACUMULADO</p>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── Winner banner ── */}
        {isFechada && winForn && (
          <div className="card p-5 bg-gradient-to-r from-status-success/5 to-status-success/10 border-status-success/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-status-success flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-body text-[10px] font-semibold text-status-success tracking-widest mb-0.5">PROCESSO DE COTAÇÃO FINALIZADO</p>
                <p className="font-body text-sm text-text-primary">
                  O fornecedor <span className="font-bold text-status-success">{winForn.nome}</span> foi o vencedor!
                </p>
              </div>
              <PartyPopper className="w-6 h-6 text-status-success ml-auto opacity-60" />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddItem && (
        <AdicionarItemModal
          grupoId={grupo.id}
          proximaOrdem={itens.length}
          fornecedorIds={fornecedores.map(f => f.id)}
          onClose={() => setShowAddItem(false)}
          onSaved={handleItemSaved}
        />
      )}

      {showAddForn && (
        <AdicionarFornecedorModal
          grupoId={grupo.id}
          itens={itens}
          fornecedorIdsJaAdicionados={fornecedores.map(f => f.id)}
          onClose={() => setShowAddForn(false)}
          onSaved={handleFornecedorSaved}
        />
      )}

      {confirmAprovar && (
        <ConfirmAprovarModal
          fornecedorNome={fornecedores.find(f => f.id === confirmAprovar)?.nome ?? ''}
          onConfirm={handleAprovar}
          onCancel={() => setConfirmAprovar(null)}
          saving={aprovando}
        />
      )}
    </AppLayout>
  );
}
