import { useState } from 'react';
import { X, Zap, Building2, DoorOpen, CheckCircle2, Clock, ChevronRight, ArrowRight, Loader2 } from 'lucide-react';
import type { EnergiaMedicao, EnergiaSala, EnergiaUnidade, EnergiaMedicaoStatus } from '../types';
import { MEDICAO_STATUS_CONFIG, MESES_ABREV } from '../types';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR, formatKWh } from '../utils/calculos';

interface Props {
  medicao: EnergiaMedicao;
  sala: EnergiaSala | undefined;
  unidade: EnergiaUnidade | undefined;
  onClose: () => void;
  onStatusChanged: (updated: EnergiaMedicao) => void;
}

const STATUS_ORDER: EnergiaMedicaoStatus[] = ['a_medir', 'aprovado', 'boleto_enviado', 'recebido'];

const STEP_ICONS: Record<EnergiaMedicaoStatus, React.ReactNode> = {
  a_medir:        <Clock className="w-3.5 h-3.5" />,
  aprovado:       <CheckCircle2 className="w-3.5 h-3.5" />,
  boleto_enviado: <ArrowRight className="w-3.5 h-3.5" />,
  recebido:       <CheckCircle2 className="w-3.5 h-3.5" />,
};

function StatusPipeline({ current }: { current: EnergiaMedicaoStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(current);
  return (
    <div className="flex items-center">
      {STATUS_ORDER.map((s, i) => {
        const cfg = MEDICAO_STATUS_CONFIG[s];
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                active ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-2 ring-offset-1 ${cfg.border}` :
                done  ? 'bg-status-successLight border-status-success/30 text-status-success' :
                        'bg-surface-1 border-surface-3 text-text-disabled'
              }`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : STEP_ICONS[s]}
              </div>
              <span className={`font-body text-[9px] text-center whitespace-nowrap ${active ? cfg.text + ' font-semibold' : done ? 'text-status-success' : 'text-text-disabled'}`}>
                {cfg.label}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-4 ${done ? 'bg-status-success' : 'bg-surface-3'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EnergiaMedicaoDetalheModal({ medicao, sala, unidade, onClose, onStatusChanged }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const currentIdx = STATUS_ORDER.indexOf(medicao.status);
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;
  const nextCfg = nextStatus ? MEDICAO_STATUS_CONFIG[nextStatus] : null;

  async function handleAdvance() {
    if (!nextStatus) return;
    setSavingStatus(true);
    const { data, error } = await supabase
      .from('energia_medicoes')
      .update({ status: nextStatus })
      .eq('id', medicao.id)
      .select()
      .single();
    setSavingStatus(false);
    if (!error && data) {
      onStatusChanged(data as EnergiaMedicao);
      onClose();
    }
  }

  const competencia = `${MESES_ABREV[medicao.mes - 1]}/${medicao.ano}`;
  const statusCfg = MEDICAO_STATUS_CONFIG[medicao.status];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-surface-2 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-data text-xs font-semibold text-text-tertiary bg-surface-1 border border-surface-2 px-2 py-0.5 rounded">{competencia}</span>
                <span className={`flex items-center gap-1 font-body text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                  {STEP_ICONS[medicao.status]}
                  {statusCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {sala && (
                  <span className="flex items-center gap-1 font-body text-sm font-semibold text-text-primary">
                    <DoorOpen className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                    {sala.nome}
                  </span>
                )}
                {unidade && (
                  <>
                    <span className="text-text-tertiary text-sm">·</span>
                    <span className="flex items-center gap-1 font-body text-sm text-text-tertiary">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      {unidade.nome}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors flex-shrink-0">
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Foto do medidor */}
            {medicao.foto_url && (
              <div>
                <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-2">FOTO DO MEDIDOR</p>
                <button
                  onClick={() => setLightbox(true)}
                  className="block w-full rounded-lg overflow-hidden border border-surface-2 hover:border-mos-700 transition-colors focus:outline-none focus:ring-2 focus:ring-mos-700"
                >
                  <img
                    src={medicao.foto_url}
                    alt="Foto do medidor"
                    className="w-full max-h-56 object-cover"
                  />
                </button>
                <p className="font-body text-[10px] text-text-disabled mt-1.5 text-center">Clique para ampliar</p>
              </div>
            )}

            {/* KPI hero: consumo + valor */}
            <div className="rounded-xl bg-mos-700 px-5 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="font-body text-[10px] text-white/70 uppercase tracking-wider mb-1">Consumo</p>
                <p className="font-data font-bold text-2xl text-white">{formatKWh(Number(medicao.consumo))}</p>
                <p className="font-body text-[10px] text-white/50 mt-0.5">kWh medidos</p>
              </div>
              <div>
                <p className="font-body text-[10px] text-white/70 uppercase tracking-wider mb-1">Valor Total</p>
                <p className="font-data font-bold text-2xl text-white">{formatCurrencyBR(Number(medicao.valor_total))}</p>
                <p className="font-body text-[10px] text-white/50 mt-0.5">R$ {Number(medicao.tarifa).toFixed(4)}/kWh</p>
              </div>
            </div>

            {/* Leituras */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-surface-2 px-3 py-2.5">
                <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Leit. Anterior</p>
                <p className="font-data text-sm font-semibold text-text-primary mt-0.5">{Number(medicao.leitura_anterior).toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-lg border border-surface-2 px-3 py-2.5">
                <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Leit. Atual</p>
                <p className="font-data text-sm font-semibold text-text-primary mt-0.5">{Number(medicao.leitura_atual).toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-lg border border-surface-2 px-3 py-2.5">
                <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Tarifa</p>
                <p className="font-data text-sm font-semibold text-text-primary mt-0.5">R$ {Number(medicao.tarifa).toFixed(4)}</p>
              </div>
            </div>

            {/* Pipeline de status */}
            <div>
              <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-3">CICLO DE COBRANÇA</p>
              <StatusPipeline current={medicao.status} />
            </div>

            {/* Observacoes */}
            {medicao.observacoes && (
              <div>
                <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">OBSERVAÇÕES</p>
                <p className="font-body text-sm text-text-secondary bg-surface-1 rounded-lg px-4 py-3 border border-surface-2 whitespace-pre-wrap">
                  {medicao.observacoes}
                </p>
              </div>
            )}

            {/* Registrada em */}
            <p className="font-body text-[11px] text-text-disabled">
              Registrada em {new Date(medicao.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-surface-2 bg-surface-1 flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors">
              Fechar
            </button>
            {nextStatus && nextCfg && (
              <button
                onClick={handleAdvance}
                disabled={savingStatus}
                className={`flex items-center gap-2 px-5 py-2 rounded-md font-body text-sm font-medium transition-colors disabled:opacity-50 border ${nextCfg.bg} ${nextCfg.text} ${nextCfg.border} hover:brightness-95`}
              >
                {savingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Avançar para {nextCfg.label}
              </button>
            )}
            {!nextStatus && (
              <span className="flex items-center gap-1.5 font-body text-sm text-status-success font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Ciclo concluído
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && medicao.foto_url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={medicao.foto_url}
            alt="Foto do medidor"
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
