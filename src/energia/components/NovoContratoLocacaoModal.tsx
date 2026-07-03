import { useState, useMemo, useEffect } from 'react';
import {
  X, Home, Loader2, CalendarRange, Info, TrendingUp,
  Building2, User, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MESES_LABEL, INDICE_REAJUSTE_LABEL } from '../types';
import type { IndiceReajuste, EnergiaSala, EnergiaUnidade, EnergiaInquilino, EnergiaContratoLocacao } from '../types';
import { gerarMesesContrato, formatCurrencyBR, formatMesAno, getMesAtual, getAnoAtual } from '../utils/calculos';

interface Props {
  sala?: EnergiaSala | null;
  salas?: EnergiaSala[];
  unidades?: EnergiaUnidade[];
  inquilinos?: EnergiaInquilino[];
  initial?: EnergiaContratoLocacao | null;
  isReajuste?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const YEAR_RANGE = Array.from({ length: 8 }, (_, i) => getAnoAtual() - 1 + i);

const inputClass =
  'w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors';

export function NovoContratoLocacaoModal({
  sala,
  salas,
  unidades,
  inquilinos,
  initial,
  isReajuste = false,
  onClose,
  onSaved,
}: Props) {
  const isEditing = !!initial && !isReajuste;

  // When sala is not provided upfront, user selects from dropdown
  const [selectedSalaId, setSelectedSalaId] = useState(sala?.id ?? initial?.sala_id ?? '');
  const [selectedInquilinoId, setSelectedInquilinoId] = useState(initial?.inquilino_id ?? '');
  const [salaConflict, setSalaConflict] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const effectiveSala = sala ?? salas?.find(s => s.id === selectedSalaId) ?? null;
  const effectiveSalaId = sala?.id ?? selectedSalaId;

  // When user picks a sala from dropdown, populate default valor and check conflicts
  function handleSalaSelect(salaId: string) {
    setSelectedSalaId(salaId);
    setSalaConflict(false);
    const s = salas?.find(s => s.id === salaId);
    if (s?.valor_aluguel && !valorMensal) {
      setValorMensal(String(s.valor_aluguel));
    }
  }

  // Check if selected sala already has an active contract (only for new contracts)
  useEffect(() => {
    if (!selectedSalaId || sala || isEditing || isReajuste) return;
    let cancelled = false;
    setCheckingConflict(true);
    supabase
      .from('energia_contratos_locacao')
      .select('id')
      .eq('sala_id', selectedSalaId)
      .eq('ativo', true)
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) {
          setSalaConflict((data?.length ?? 0) > 0);
          setCheckingConflict(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedSalaId, sala, isEditing, isReajuste]);

  const [valorMensal, setValorMensal] = useState(
    initial ? String(Number(initial.valor_mensal)) : sala?.valor_aluguel ? String(Number(sala.valor_aluguel)) : ''
  );
  const [mesInicio, setMesInicio] = useState(() => {
    if (isReajuste && initial) {
      return initial.mes_fim === 12 ? 1 : initial.mes_fim + 1;
    }
    return initial?.mes_inicio ?? getMesAtual();
  });
  const [anoInicio, setAnoInicio] = useState(() => {
    if (isReajuste && initial) {
      return initial.mes_fim === 12 ? initial.ano_fim + 1 : initial.ano_fim;
    }
    return initial?.ano_inicio ?? getAnoAtual();
  });
  const [mesFim, setMesFim] = useState(() => {
    if (isReajuste && initial) {
      const startMes = initial.mes_fim === 12 ? 1 : initial.mes_fim + 1;
      return startMes === 1 ? 12 : startMes - 1;
    }
    return initial?.mes_fim ?? 12;
  });
  const [anoFim, setAnoFim] = useState(() => {
    if (isReajuste && initial) {
      const startAno = initial.mes_fim === 12 ? initial.ano_fim + 1 : initial.ano_fim;
      return startAno + 1;
    }
    return initial?.ano_fim ?? getAnoAtual();
  });
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? '');
  const [indiceReajuste, setIndiceReajuste] = useState<IndiceReajuste>(initial?.indice_reajuste ?? 'fixo');
  const [percentualReajuste, setPercentualReajuste] = useState(
    initial?.percentual_reajuste ? String(initial.percentual_reajuste) : ''
  );
  const [diaVencimento, setDiaVencimento] = useState(initial?.dia_vencimento ?? 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valorNum = Number(valorMensal.replace(',', '.')) || 0;
  const percentualNum = Number(percentualReajuste.replace(',', '.')) || 0;

  const meses = useMemo(
    () => (valorNum > 0 ? gerarMesesContrato(mesInicio, anoInicio, mesFim, anoFim, valorNum) : []),
    [mesInicio, anoInicio, mesFim, anoFim, valorNum]
  );

  const periodoValido = anoInicio < anoFim || (anoInicio === anoFim && mesInicio <= mesFim);

  const selectedInquilino = inquilinos?.find(i => i.id === selectedInquilinoId) ?? null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveSalaId) { setError('Selecione um imóvel'); return; }
    if (!periodoValido) { setError('A data de fim deve ser igual ou posterior ao início.'); return; }
    if (valorNum <= 0) { setError('Informe um valor mensal válido.'); return; }
    if (meses.length === 0) { setError('O período não gerou nenhum mês.'); return; }
    if (salaConflict) { setError('Este imóvel já possui um contrato ativo.'); return; }
    setError('');
    setSaving(true);

    try {
      if (isReajuste && initial) {
        await supabase
          .from('energia_contratos_locacao')
          .update({ ativo: false })
          .eq('id', initial.id);

        const mesAtual = getMesAtual();
        const anoAtual = getAnoAtual();
        const { data: futuros } = await supabase
          .from('energia_alugueis')
          .select('id, mes, ano, pago')
          .eq('sala_id', effectiveSalaId)
          .eq('pago', false);

        const futuroIds = (futuros || [])
          .filter(a => a.ano > anoAtual || (a.ano === anoAtual && a.mes >= mesInicio))
          .map(a => a.id);
        if (futuroIds.length > 0) {
          await supabase.from('energia_alugueis').delete().in('id', futuroIds);
        }
        void mesAtual;

        const { error: insertErr } = await supabase.from('energia_contratos_locacao').insert({
          sala_id: effectiveSalaId,
          inquilino_id: selectedInquilinoId || null,
          valor_mensal: valorNum,
          mes_inicio: mesInicio,
          ano_inicio: anoInicio,
          mes_fim: mesFim,
          ano_fim: anoFim,
          observacoes: observacoes.trim(),
          ativo: true,
          indice_reajuste: indiceReajuste,
          percentual_reajuste: percentualNum,
          dia_vencimento: diaVencimento,
          contrato_origem_id: initial.id,
        });
        if (insertErr) throw insertErr;
      } else {
        await supabase.from('energia_alugueis').delete().eq('sala_id', effectiveSalaId);
        await supabase
          .from('energia_contratos_locacao')
          .update({ ativo: false })
          .eq('sala_id', effectiveSalaId)
          .eq('ativo', true);

        const contractPayload = {
          sala_id: effectiveSalaId,
          inquilino_id: selectedInquilinoId || null,
          valor_mensal: valorNum,
          mes_inicio: mesInicio,
          ano_inicio: anoInicio,
          mes_fim: mesFim,
          ano_fim: anoFim,
          observacoes: observacoes.trim(),
          ativo: true,
          indice_reajuste: indiceReajuste,
          percentual_reajuste: percentualNum,
          dia_vencimento: diaVencimento,
          contrato_origem_id: null as string | null,
        };

        if (isEditing && initial) {
          await supabase.from('energia_contratos_locacao').update(contractPayload).eq('id', initial.id);
        } else {
          await supabase.from('energia_contratos_locacao').insert(contractPayload);
        }
      }

      // Insert monthly aluguel records
      const records = meses.map(m => ({
        sala_id: effectiveSalaId,
        mes: m.mes,
        ano: m.ano,
        valor: m.valor,
        pago: false,
        observacoes: '',
      }));
      await supabase.from('energia_alugueis').upsert(records, { onConflict: 'sala_id,mes,ano' });

      // Sync sala: update valor_aluguel and set ativo=true (occupied)
      await supabase
        .from('energia_salas')
        .update({
          valor_aluguel: valorNum,
          ativo: true,
          ...(selectedInquilino
            ? {
                responsavel: selectedInquilino.nome,
                cpf_cnpj: selectedInquilino.cpf_cnpj,
                email: selectedInquilino.email,
                email_fatura: selectedInquilino.email_fatura,
                telefone: selectedInquilino.telefone,
              }
            : {}),
        })
        .eq('id', effectiveSalaId);

      onSaved();
    } catch {
      setError('Erro ao salvar contrato. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const title = isReajuste
    ? 'Reajuste de Contrato'
    : isEditing
    ? 'Editar Contrato'
    : 'Novo Contrato de Locação';

  const salaLabel = effectiveSala
    ? effectiveSala.nome
    : salas && selectedSalaId
    ? (salas.find(s => s.id === selectedSalaId)?.nome ?? '—')
    : 'Selecione o imóvel';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-xl shadow-modal w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-surface-2 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isReajuste ? 'bg-status-warningLight' : 'bg-surface-1'}`}>
              {isReajuste
                ? <TrendingUp className="w-4 h-4 text-status-warning" />
                : <CalendarRange className="w-4 h-4 text-text-secondary" />
              }
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-text-primary">{title}</h3>
              <p className="font-body text-xs text-text-tertiary">{salaLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4 overflow-y-auto">
          {isReajuste && initial && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-status-warningLight border border-status-warning/30 rounded-lg">
              <TrendingUp className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body text-sm font-semibold text-status-warning">Reajuste anual do contrato</p>
                <p className="font-body text-xs text-status-warning/80 mt-0.5">
                  O contrato atual ({formatMesAno(initial.mes_inicio, initial.ano_inicio)} →{' '}
                  {formatMesAno(initial.mes_fim, initial.ano_fim)}) será encerrado. Os aluguéis futuros
                  não pagos serão substituídos pelo novo valor.
                </p>
              </div>
            </div>
          )}

          {/* Sala dropdown — only when sala not pre-selected */}
          {!sala && salas && (
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                IMÓVEL *
              </label>
              <div className="relative">
                <select
                  value={selectedSalaId}
                  onChange={e => handleSalaSelect(e.target.value)}
                  disabled={isEditing}
                  className={`${inputClass} appearance-none pr-8 ${!selectedSalaId ? 'text-text-disabled' : ''}`}
                >
                  <option value="">Selecione o imóvel...</option>
                  {salas.map(s => {
                    const unidade = unidades?.find(u => u.id === s.unidade_id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nome}{unidade ? ` — ${unidade.nome}` : ''}
                      </option>
                    );
                  })}
                </select>
                <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
              {checkingConflict && (
                <p className="font-body text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Verificando contratos existentes...
                </p>
              )}
              {salaConflict && !checkingConflict && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-status-errorLight border border-status-error/20 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-error flex-shrink-0" />
                  <p className="font-body text-xs text-status-error">
                    Este imóvel já possui um contrato ativo. Encerre o contrato atual antes de criar um novo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Inquilino dropdown */}
          {inquilinos && inquilinos.length > 0 && (
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                INQUILINO
              </label>
              <div className="relative">
                <select
                  value={selectedInquilinoId}
                  onChange={e => setSelectedInquilinoId(e.target.value)}
                  className={`${inputClass} appearance-none pr-8`}
                >
                  <option value="">Sem inquilino vinculado</option>
                  {inquilinos.filter(i => i.ativo).map(i => (
                    <option key={i.id} value={i.id}>{i.nome} — {i.cpf_cnpj}</option>
                  ))}
                </select>
                <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
              {selectedInquilino && (
                <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 bg-surface-1 border border-surface-2 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-mos-50 flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-bold text-[10px] text-mos-700">
                      {selectedInquilino.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-text-primary truncate">
                      {selectedInquilino.nome}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-body text-xs text-text-tertiary">{selectedInquilino.cpf_cnpj}</p>
                      {selectedInquilino.email && (
                        <p className="font-body text-xs text-text-tertiary truncate hidden sm:block">
                          {selectedInquilino.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Valor mensal */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              VALOR MENSAL (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valorMensal}
              onChange={e => setValorMensal(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0,00"
              className={inputClass}
              autoFocus={!!sala}
            />
            {isReajuste && initial && percentualNum > 0 && (
              <p className="font-body text-[10px] text-text-tertiary mt-1">
                Valor anterior: {formatCurrencyBR(Number(initial.valor_mensal))} → Aumento de{' '}
                {percentualNum.toFixed(1)}%:{' '}
                <span className="text-status-success font-semibold">
                  {formatCurrencyBR(Number(initial.valor_mensal) * (1 + percentualNum / 100))}
                </span>
              </p>
            )}
          </div>

          {/* Indice + percentual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                ÍNDICE DE REAJUSTE
              </label>
              <div className="relative">
                <select
                  value={indiceReajuste}
                  onChange={e => setIndiceReajuste(e.target.value as IndiceReajuste)}
                  className={`${inputClass} appearance-none pr-8`}
                >
                  {(Object.entries(INDICE_REAJUSTE_LABEL) as [IndiceReajuste, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                PERCENTUAL (%)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={percentualReajuste}
                onChange={e => setPercentualReajuste(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0,00"
                className={inputClass}
              />
            </div>
          </div>

          {/* Dia de vencimento */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              DIA DE VENCIMENTO
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={28}
                value={diaVencimento}
                onChange={e => setDiaVencimento(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
                className={`${inputClass} w-24`}
              />
              <span className="font-body text-xs text-text-tertiary">de cada mês (máx. 28)</span>
            </div>
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                INÍCIO
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={mesInicio}
                  onChange={e => setMesInicio(Number(e.target.value))}
                  className={inputClass}
                >
                  {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <select
                  value={anoInicio}
                  onChange={e => setAnoInicio(Number(e.target.value))}
                  className={inputClass}
                >
                  {YEAR_RANGE.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                FIM
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={mesFim}
                  onChange={e => setMesFim(Number(e.target.value))}
                  className={inputClass}
                >
                  {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <select
                  value={anoFim}
                  onChange={e => setAnoFim(Number(e.target.value))}
                  className={inputClass}
                >
                  {YEAR_RANGE.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          {periodoValido && valorNum > 0 && meses.length > 0 && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-surface-1 border border-surface-3 rounded-lg">
              <Info className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-body text-sm text-text-primary font-medium">
                  {meses.length} {meses.length === 1 ? 'registro mensal' : 'registros mensais'} de{' '}
                  <span className="text-mos-700 font-semibold">{formatCurrencyBR(valorNum)}</span>
                </p>
                <p className="font-body text-xs text-text-tertiary">
                  {formatMesAno(mesInicio, anoInicio)} até {formatMesAno(mesFim, anoFim)} · Total:{' '}
                  <span className="font-semibold text-text-secondary">{formatCurrencyBR(valorNum * meses.length)}</span>
                </p>
                {isEditing && !isReajuste && (
                  <p className="font-body text-[10px] text-status-warning mt-1">
                    Os registros mensais existentes serão substituídos pelos novos.
                  </p>
                )}
              </div>
            </div>
          )}

          {!periodoValido && anoInicio > 0 && (
            <p className="font-body text-xs text-status-error">
              A data de fim deve ser igual ou posterior ao início.
            </p>
          )}

          {/* Observacoes */}
          <div>
            <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
              OBSERVAÇÕES
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Opcional..."
              className={inputClass}
            />
          </div>

          {error && <p className="font-body text-xs text-status-error">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !periodoValido || valorNum <= 0 || salaConflict || (!sala && !selectedSalaId)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-body font-semibold text-sm transition-colors disabled:opacity-50 ${
                isReajuste
                  ? 'bg-status-warning text-white hover:bg-status-warning/90'
                  : 'btn-primary'
              }`}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
              ) : isReajuste ? (
                <><TrendingUp className="w-3.5 h-3.5" /> Aplicar Reajuste</>
              ) : (
                <><Home className="w-3.5 h-3.5" /> {isEditing ? 'Atualizar' : 'Criar Contrato'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
