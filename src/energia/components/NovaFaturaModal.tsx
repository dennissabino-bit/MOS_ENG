import { useState, useEffect, useMemo } from 'react';
import { X, Zap, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Building2, Home, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatMesAno, getMesAtual, getAnoAtual } from '../utils/calculos';
import type {
  EnergiaUnidade, EnergiaSala, EnergiaMedicao, EnergiaAluguel,
  EnergiaFatura, EnergiaFaturaItem,
} from '../types';
import { MESES_ABREV } from '../types';

interface Props {
  unidades: EnergiaUnidade[];
  isAdmin: boolean;
  userUnidadeId: string;
  onClose: () => void;
  onSaved: (fatura: EnergiaFatura) => void;
}

interface SalaItem {
  sala: EnergiaSala;
  medicao: EnergiaMedicao | null;
  aluguel: EnergiaAluguel | null;
  incluirEnergia: boolean;
  incluirAluguel: boolean;
}

type Step = 1 | 2 | 3;

const inputClass = 'w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card';

export function NovaFaturaModal({ unidades, isAdmin, userUnidadeId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 state
  const [unidadeId, setUnidadeId] = useState(isAdmin ? (unidades[0]?.id || '') : userUnidadeId);
  const [mes, setMes] = useState(getMesAtual());
  const [ano, setAno] = useState(getAnoAtual());
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [destinatarioCpfCnpj, setDestinatarioCpfCnpj] = useState('');

  // Step 2 state
  const [salas, setSalas] = useState<EnergiaSala[]>([]);
  const [items, setItems] = useState<SalaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Step 3 state
  const [pixChave, setPixChave] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const selectedUnidade = useMemo(() => unidades.find(u => u.id === unidadeId), [unidades, unidadeId]);

  async function loadStep2() {
    setLoadingItems(true);
    setError('');
    const [sRes, mRes, aRes] = await Promise.all([
      supabase.from('energia_salas').select('*').eq('unidade_id', unidadeId).eq('ativo', true).order('nome'),
      supabase.from('energia_medicoes').select('*').eq('mes', mes).eq('ano', ano),
      supabase.from('energia_alugueis').select('*').eq('mes', mes).eq('ano', ano),
    ]);

    const fetchedSalas = (sRes.data as EnergiaSala[]) || [];
    const fetchedMedicoes = (mRes.data as EnergiaMedicao[]) || [];
    const fetchedAlugueis = (aRes.data as EnergiaAluguel[]) || [];

    const medMap = new Map(fetchedMedicoes.map(m => [m.sala_id, m]));
    const alqMap = new Map(fetchedAlugueis.map(a => [a.sala_id, a]));

    const salaItems: SalaItem[] = fetchedSalas
      .filter(s => !s.arquivada)
      .map(sala => {
        const medicao = medMap.get(sala.id) ?? null;
        const aluguel = alqMap.get(sala.id) ?? null;
        const isRelógioProprio = sala.medicao_tipo === 'relogio_proprio';
        return {
          sala,
          medicao,
          aluguel,
          incluirEnergia: !isRelógioProprio && medicao != null,
          incluirAluguel: aluguel != null && Number(sala.valor_aluguel) > 0,
        };
      });

    setSalas(fetchedSalas);
    setItems(salaItems);
    setLoadingItems(false);
  }

  function handleNext() {
    setError('');
    if (step === 1) {
      if (!unidadeId) { setError('Selecione uma unidade.'); return; }
      if (!destinatarioNome.trim()) { setError('Informe o nome do destinatário.'); return; }
      loadStep2();
      setStep(2);
    } else if (step === 2) {
      const hasAny = items.some(i => i.incluirEnergia || i.incluirAluguel);
      if (!hasAny) { setError('Selecione ao menos um item para incluir na fatura.'); return; }
      setStep(3);
    }
  }

  function toggleEnergia(salaId: string) {
    setItems(prev => prev.map(i => i.sala.id === salaId ? { ...i, incluirEnergia: !i.incluirEnergia } : i));
  }

  function toggleAluguel(salaId: string) {
    setItems(prev => prev.map(i => i.sala.id === salaId ? { ...i, incluirAluguel: !i.incluirAluguel } : i));
  }

  const totals = useMemo(() => {
    let energia = 0;
    let aluguel = 0;
    for (const item of items) {
      if (item.incluirEnergia && item.medicao) energia += Number(item.medicao.valor_total);
      if (item.incluirAluguel) {
        if (item.aluguel) aluguel += Number(item.aluguel.valor);
        else aluguel += Number(item.sala.valor_aluguel);
      }
    }
    return { energia, aluguel, total: energia + aluguel };
  }, [items]);

  async function handleSave() {
    setSaving(true);
    setError('');

    const { data: faturaData, error: faturaErr } = await supabase
      .from('energia_faturas')
      .insert({
        unidade_id: unidadeId,
        mes,
        ano,
        status: 'rascunho',
        valor_energia: totals.energia,
        valor_aluguel: totals.aluguel,
        destinatario_nome: destinatarioNome.trim(),
        destinatario_email: destinatarioEmail.trim(),
        destinatario_cpf_cnpj: destinatarioCpfCnpj.trim(),
        pix_chave: pixChave.trim() || null,
        codigo_barras: codigoBarras.trim() || null,
        data_vencimento: dataVencimento || null,
        observacoes: observacoes.trim(),
      })
      .select()
      .single();

    if (faturaErr || !faturaData) {
      setError(faturaErr?.message || 'Erro ao criar fatura.');
      setSaving(false);
      return;
    }

    const fatura = faturaData as EnergiaFatura;

    // Build line items
    const lineItems: Omit<EnergiaFaturaItem, 'id' | 'created_at'>[] = [];
    const medicaoIds: string[] = [];
    const aluguelIds: string[] = [];

    for (const item of items) {
      if (item.incluirEnergia && item.medicao) {
        lineItems.push({
          fatura_id: fatura.id,
          sala_id: item.sala.id,
          medicao_id: item.medicao.id,
          tipo: 'energia',
          descricao: `Energia — ${item.sala.nome} — ${MESES_ABREV[mes - 1]}/${ano}`,
          valor: Number(item.medicao.valor_total),
          mes,
          ano,
        });
        medicaoIds.push(item.medicao.id);
      }
      if (item.incluirAluguel) {
        const valorAluguel = item.aluguel ? Number(item.aluguel.valor) : Number(item.sala.valor_aluguel);
        lineItems.push({
          fatura_id: fatura.id,
          sala_id: item.sala.id,
          medicao_id: null,
          tipo: 'aluguel',
          descricao: `Aluguel — ${item.sala.nome} — ${MESES_ABREV[mes - 1]}/${ano}`,
          valor: valorAluguel,
          mes,
          ano,
        });
        if (item.aluguel) aluguelIds.push(item.aluguel.id);
      }
    }

    if (lineItems.length > 0) {
      await supabase.from('energia_fatura_itens').insert(lineItems);
    }

    // Mark medicoes as boleto_enviado and link fatura
    if (medicaoIds.length > 0) {
      await supabase.from('energia_medicoes')
        .update({ status: 'boleto_enviado', fatura_id: fatura.id })
        .in('id', medicaoIds);
    }

    // Mark alugueis as faturado and link fatura
    if (aluguelIds.length > 0) {
      await supabase.from('energia_alugueis')
        .update({ status: 'faturado', fatura_id: fatura.id })
        .in('id', aluguelIds);
    }

    setSaving(false);
    onSaved(fatura);
  }

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const stepLabels: Record<Step, string> = {
    1: 'Destinatário & Competência',
    2: 'Itens da Fatura',
    3: 'Dados de Pagamento',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Nova Fatura</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Passo {step} de 3 — {stepLabels[step]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-2">
          <div className="h-full bg-mos-700 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-status-errorLight border border-status-error/20">
              <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0" />
              <p className="font-body text-xs text-status-error">{error}</p>
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin && (
                  <div>
                    <label className="font-body text-xs text-text-tertiary mb-1.5 block">Unidade *</label>
                    <select value={unidadeId} onChange={e => setUnidadeId(e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="font-body text-xs text-text-tertiary mb-1.5 block">Competência *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={mes} onChange={e => setMes(Number(e.target.value))} className={inputClass}>
                      {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select value={ano} onChange={e => setAno(Number(e.target.value))} className={inputClass}>
                      {Array.from({ length: 5 }, (_, i) => getAnoAtual() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="border-t border-surface-2 pt-4">
                <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-3">DADOS DO DESTINATÁRIO</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs text-text-tertiary mb-1.5 block">Nome / Razão Social *</label>
                    <input className={inputClass} value={destinatarioNome} onChange={e => setDestinatarioNome(e.target.value)} placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-text-tertiary mb-1.5 block">CPF / CNPJ</label>
                    <input className={inputClass} value={destinatarioCpfCnpj} onChange={e => setDestinatarioCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-body text-xs text-text-tertiary mb-1.5 block">E-mail</label>
                    <input className={inputClass} type="email" value={destinatarioEmail} onChange={e => setDestinatarioEmail(e.target.value)} placeholder="destinatario@email.com" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-body text-xs text-text-tertiary">Selecione os itens a incluir na fatura de <strong className="text-text-primary">{MESES_ABREV[mes-1]}/{ano}</strong></p>
              </div>
              {loadingItems ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-text-tertiary" /></div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-text-tertiary">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-text-disabled" />
                  <p className="font-body text-sm">Nenhuma sala ativa nesta unidade.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {items.map(item => {
                    const isRelógioProprio = item.sala.medicao_tipo === 'relogio_proprio';
                    const hasAluguel = Number(item.sala.valor_aluguel) > 0 || item.aluguel != null;
                    return (
                      <div key={item.sala.id} className="rounded-lg border border-surface-2 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-1">
                          <Home className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                          <span className="font-body text-sm font-semibold text-text-primary flex-1">{item.sala.nome}</span>
                          {isRelógioProprio && (
                            <span className="font-body text-[10px] text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">Relógio próprio</span>
                          )}
                        </div>
                        <div className="divide-y divide-surface-2">
                          {/* Energia */}
                          <div className={`flex items-center justify-between px-4 py-2.5 ${isRelógioProprio ? 'opacity-40' : ''}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id={`en-${item.sala.id}`}
                                checked={item.incluirEnergia}
                                disabled={isRelógioProprio}
                                onChange={() => toggleEnergia(item.sala.id)}
                                className="w-4 h-4 accent-mos-700"
                              />
                              <label htmlFor={`en-${item.sala.id}`} className="flex items-center gap-1.5 cursor-pointer">
                                <Zap className="w-3.5 h-3.5 text-mos-700" />
                                <span className="font-body text-xs text-text-secondary">Energia</span>
                              </label>
                            </div>
                            <div className="text-right">
                              {item.medicao ? (
                                <span className="font-data text-sm font-semibold text-text-primary">{formatCurrencyBR(Number(item.medicao.valor_total))}</span>
                              ) : isRelógioProprio ? (
                                <span className="font-body text-xs text-text-disabled">Não aplicável</span>
                              ) : (
                                <span className="font-body text-xs text-status-warning">Sem medição</span>
                              )}
                            </div>
                          </div>
                          {/* Aluguel */}
                          {hasAluguel && (
                            <div className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`al-${item.sala.id}`}
                                  checked={item.incluirAluguel}
                                  onChange={() => toggleAluguel(item.sala.id)}
                                  className="w-4 h-4 accent-mos-700"
                                />
                                <label htmlFor={`al-${item.sala.id}`} className="flex items-center gap-1.5 cursor-pointer">
                                  <Home className="w-3.5 h-3.5 text-text-secondary" />
                                  <span className="font-body text-xs text-text-secondary">Aluguel</span>
                                </label>
                              </div>
                              <span className="font-data text-sm font-semibold text-text-primary">
                                {formatCurrencyBR(item.aluguel ? Number(item.aluguel.valor) : Number(item.sala.valor_aluguel))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Subtotals */}
              <div className="rounded-lg bg-mos-700 px-4 py-3 grid grid-cols-3 gap-3 text-center mt-2">
                <div>
                  <p className="font-body text-xs text-white/75 font-semibold">Energia</p>
                  <p className="font-data font-bold text-sm text-white">{formatCurrencyBR(totals.energia)}</p>
                </div>
                <div>
                  <p className="font-body text-xs text-white/75 font-semibold">Aluguel</p>
                  <p className="font-data font-bold text-sm text-white">{formatCurrencyBR(totals.aluguel)}</p>
                </div>
                <div>
                  <p className="font-body text-xs text-white/75 font-semibold">Total</p>
                  <p className="font-data font-bold text-base text-white">{formatCurrencyBR(totals.total)}</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs text-text-tertiary mb-1.5 block">Chave PIX</label>
                  <input
                    className={inputClass}
                    value={pixChave}
                    onChange={e => setPixChave(e.target.value)}
                    placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                  />
                  <p className="font-body text-[10px] text-text-disabled mt-1">Geração do QR Code automática</p>
                </div>
                <div>
                  <label className="font-body text-xs text-text-tertiary mb-1.5 block">Data de Vencimento</label>
                  <input
                    className={inputClass}
                    type="date"
                    value={dataVencimento}
                    onChange={e => setDataVencimento(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="font-body text-xs text-text-tertiary mb-1.5 block">Código de Barras / Linha Digitável</label>
                <input
                  className={`${inputClass} font-data`}
                  value={codigoBarras}
                  onChange={e => setCodigoBarras(e.target.value)}
                  placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
                />
              </div>
              <div>
                <label className="font-body text-xs text-text-tertiary mb-1.5 block">Observações</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Instruções de pagamento, prazo, etc."
                />
              </div>
              {/* Summary */}
              <div className="rounded-xl border border-surface-2 p-4 space-y-2">
                <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-2">RESUMO DA FATURA</p>
                <div className="flex justify-between">
                  <span className="font-body text-sm text-text-secondary">Competência</span>
                  <span className="font-data text-sm font-semibold text-text-primary">{formatMesAno(mes, ano)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-sm text-text-secondary">Destinatário</span>
                  <span className="font-body text-sm text-text-primary">{destinatarioNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-sm text-text-secondary">Energia</span>
                  <span className="font-data text-sm text-text-primary">{formatCurrencyBR(totals.energia)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-sm text-text-secondary">Aluguel</span>
                  <span className="font-data text-sm text-text-primary">{formatCurrencyBR(totals.aluguel)}</span>
                </div>
                <div className="flex justify-between border-t border-surface-2 pt-2 mt-2">
                  <span className="font-body text-sm font-semibold text-text-primary">Total</span>
                  <span className="font-data text-base font-bold text-mos-700">{formatCurrencyBR(totals.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep(s => (s - 1) as Step)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
          >
            {step > 1 && <ChevronLeft className="w-3.5 h-3.5" />}
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors"
            >
              Próximo
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Salvando…' : 'Criar Fatura'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
