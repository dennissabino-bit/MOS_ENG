import { useState, useMemo } from 'react';
import { X, Home, Loader2, CalendarRange, Info, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MESES_LABEL, INDICE_REAJUSTE_LABEL } from '../types';
import type { IndiceReajuste } from '../types';
import { gerarMesesContrato, formatCurrencyBR, formatMesAno, getMesAtual, getAnoAtual } from '../utils/calculos';
import type { EnergiaSala, EnergiaContratoLocacao } from '../types';

interface Props {
  sala: EnergiaSala;
  initial?: EnergiaContratoLocacao | null;
  /** When true, shows "reajuste" mode (renew from existing contract) */
  isReajuste?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const YEAR_RANGE = Array.from({ length: 8 }, (_, i) => getAnoAtual() - 1 + i);

export function NovoContratoLocacaoModal({ sala, initial, isReajuste = false, onClose, onSaved }: Props) {
  const isEditing = !!initial && !isReajuste;

  const [valorMensal, setValorMensal] = useState(
    initial ? String(Number(initial.valor_mensal)) : sala.valor_aluguel ? String(Number(sala.valor_aluguel)) : ''
  );
  const [mesInicio, setMesInicio] = useState(() => {
    if (isReajuste && initial) {
      // Start new contract the month after the current one ends
      const nextMes = initial.mes_fim === 12 ? 1 : initial.mes_fim + 1;
      return nextMes;
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
      const startAno = initial.mes_fim === 12 ? initial.ano_fim + 1 : initial.ano_fim;
      // Default 12 months from start
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valorNum = Number(valorMensal.replace(',', '.')) || 0;
  const percentualNum = Number(percentualReajuste.replace(',', '.')) || 0;

  const meses = useMemo(
    () => (valorNum > 0 ? gerarMesesContrato(mesInicio, anoInicio, mesFim, anoFim, valorNum) : []),
    [mesInicio, anoInicio, mesFim, anoFim, valorNum]
  );

  const periodoValido =
    anoInicio < anoFim || (anoInicio === anoFim && mesInicio <= mesFim);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!periodoValido) { setError('A data de fim deve ser igual ou posterior ao início.'); return; }
    if (valorNum <= 0) { setError('Informe um valor mensal válido.'); return; }
    if (meses.length === 0) { setError('O período não gerou nenhum mês.'); return; }
    setError('');
    setSaving(true);

    try {
      if (isReajuste && initial) {
        // 1. Encerrar contrato atual (apenas marcar ativo=false, nao deletar registros pagos)
        await supabase
          .from('energia_contratos_locacao')
          .update({ ativo: false })
          .eq('id', initial.id);

        // 2. Remover alugueis futuros nao pagos do contrato anterior
        const mesAtual = getMesAtual();
        const anoAtual = getAnoAtual();
        const { data: futuros } = await supabase
          .from('energia_alugueis')
          .select('id, mes, ano, pago')
          .eq('sala_id', sala.id)
          .eq('pago', false);

        const futuroIds = (futuros || [])
          .filter(a => a.ano > anoAtual || (a.ano === anoAtual && a.mes >= mesInicio))
          .map(a => a.id);
        if (futuroIds.length > 0) {
          await supabase.from('energia_alugueis').delete().in('id', futuroIds);
        }

        // 3. Criar novo contrato vinculado ao anterior
        const { error: insertErr } = await supabase.from('energia_contratos_locacao').insert({
          sala_id: sala.id,
          valor_mensal: valorNum,
          mes_inicio: mesInicio,
          ano_inicio: anoInicio,
          mes_fim: mesFim,
          ano_fim: anoFim,
          observacoes: observacoes.trim(),
          ativo: true,
          indice_reajuste: indiceReajuste,
          percentual_reajuste: percentualNum,
          contrato_origem_id: initial.id,
        });
        if (insertErr) throw insertErr;
      } else {
        // Create or edit flow
        // 1. Delete all existing aluguel records for this sala
        await supabase.from('energia_alugueis').delete().eq('sala_id', sala.id);

        // 2. Deactivate previous active contracts
        await supabase
          .from('energia_contratos_locacao')
          .update({ ativo: false })
          .eq('sala_id', sala.id)
          .eq('ativo', true);

        // 3. Upsert contract
        const contractPayload = {
          sala_id: sala.id,
          valor_mensal: valorNum,
          mes_inicio: mesInicio,
          ano_inicio: anoInicio,
          mes_fim: mesFim,
          ano_fim: anoFim,
          observacoes: observacoes.trim(),
          ativo: true,
          indice_reajuste: indiceReajuste,
          percentual_reajuste: percentualNum,
          contrato_origem_id: null as string | null,
        };

        if (isEditing && initial) {
          await supabase.from('energia_contratos_locacao').update(contractPayload).eq('id', initial.id);
        } else {
          await supabase.from('energia_contratos_locacao').insert(contractPayload);
        }
      }

      // 4. Insert monthly aluguel records
      const records = meses.map(m => ({
        sala_id: sala.id,
        mes: m.mes,
        ano: m.ano,
        valor: m.valor,
        pago: false,
        observacoes: '',
      }));
      await supabase.from('energia_alugueis').upsert(records, { onConflict: 'sala_id,mes,ano' });

      // 5. Update sala.valor_aluguel to reflect current contract value
      await supabase.from('energia_salas').update({ valor_aluguel: valorNum }).eq('id', sala.id);

      onSaved();
    } catch {
      setError('Erro ao salvar contrato. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors';

  const title = isReajuste
    ? 'Reajuste de Contrato'
    : isEditing ? 'Editar Contrato' : 'Novo Contrato de Locação';

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
              <p className="font-body text-xs text-text-tertiary">{sala.nome}</p>
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
                  O contrato atual ({formatMesAno(initial.mes_inicio, initial.ano_inicio)} → {formatMesAno(initial.mes_fim, initial.ano_fim)})
                  será encerrado. Os aluguéis futuros não pagos serão substituídos pelo novo valor.
                </p>
              </div>
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
              autoFocus
            />
            {isReajuste && initial && percentualNum > 0 && (
              <p className="font-body text-[10px] text-text-tertiary mt-1">
                Valor anterior: {formatCurrencyBR(Number(initial.valor_mensal))}
                {' '}→ Aumento de {percentualNum.toFixed(1)}%: <span className="text-status-success font-semibold">{formatCurrencyBR(Number(initial.valor_mensal) * (1 + percentualNum / 100))}</span>
              </p>
            )}
          </div>

          {/* Indice + percentual de reajuste */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                ÍNDICE DE REAJUSTE
              </label>
              <select
                value={indiceReajuste}
                onChange={e => setIndiceReajuste(e.target.value as IndiceReajuste)}
                className={inputClass}
              >
                {(Object.entries(INDICE_REAJUSTE_LABEL) as [IndiceReajuste, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
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

          {/* Periodo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                INÍCIO
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select value={mesInicio} onChange={e => setMesInicio(Number(e.target.value))} className={inputClass}>
                  {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <select value={anoInicio} onChange={e => setAnoInicio(Number(e.target.value))} className={inputClass}>
                  {YEAR_RANGE.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">
                FIM
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} className={inputClass}>
                  {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <select value={anoFim} onChange={e => setAnoFim(Number(e.target.value))} className={inputClass}>
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
                  {formatMesAno(mesInicio, anoInicio)} até {formatMesAno(mesFim, anoFim)}
                  {' '}· Total: <span className="font-semibold text-text-secondary">{formatCurrencyBR(valorNum * meses.length)}</span>
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
              disabled={saving || !periodoValido || valorNum <= 0}
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
