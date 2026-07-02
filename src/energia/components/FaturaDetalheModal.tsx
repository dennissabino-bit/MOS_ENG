import { useState, useEffect, useRef } from 'react';
import {
  X, Printer, Copy, Check, CheckCircle2, Clock, Zap, Home,
  Building2, Calendar, ChevronRight, Loader2, AlertTriangle,
} from 'lucide-react';
import type { EnergiaFatura, EnergiaFaturaItem, EnergiaFaturaStatus, EnergiaUnidade } from '../types';
import { FATURA_STATUS_CONFIG, MESES_ABREV } from '../types';
import { supabase } from '../../lib/supabase';
import { formatCurrencyBR } from '../utils/calculos';

interface Props {
  fatura: EnergiaFatura;
  unidade: EnergiaUnidade | undefined;
  onClose: () => void;
  onStatusChanged: (updated: EnergiaFatura) => void;
}

const STATUS_ORDER: EnergiaFaturaStatus[] = ['rascunho', 'enviada', 'visualizada', 'paga'];

function StatusPipeline({ current }: { current: EnergiaFaturaStatus }) {
  const visibleOrder = STATUS_ORDER;
  const currentIdx = visibleOrder.indexOf(current === 'vencida' ? 'enviada' : current);

  return (
    <div className="flex items-center">
      {visibleOrder.map((s, i) => {
        const cfg = FATURA_STATUS_CONFIG[s];
        const done = i < currentIdx || (current === 'paga' && s !== 'paga');
        const active = s === current || (current === 'vencida' && s === 'enviada');
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                active ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-2 ring-offset-2 ${cfg.border}` :
                done   ? 'bg-status-successLight border-status-success/40 text-status-success' :
                         'bg-surface-2 border-surface-3 text-text-secondary'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`font-body text-[11px] font-semibold text-center whitespace-nowrap ${active ? cfg.text : done ? 'text-status-success' : 'text-text-secondary'}`}>
                {cfg.label}
              </span>
            </div>
            {i < visibleOrder.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1.5 mb-6 rounded-full ${done ? 'bg-status-success' : 'bg-surface-3'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FaturaDetalheModal({ fatura, unidade, onClose, onStatusChanged }: Props) {
  const [itens, setItens] = useState<EnergiaFaturaItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(true);
  const [savingStatus, setSavingStatus] = useState<EnergiaFaturaStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('energia_fatura_itens').select('*').eq('fatura_id', fatura.id).order('tipo')
      .then(({ data }) => {
        setItens((data as EnergiaFaturaItem[]) || []);
        setLoadingItens(false);
      });
  }, [fatura.id]);

  async function changeStatus(status: EnergiaFaturaStatus) {
    setSavingStatus(status);
    const extra: Record<string, string | null> = {};
    if (status === 'enviada') extra.data_envio = new Date().toISOString();
    if (status === 'paga') extra.data_pagamento = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('energia_faturas')
      .update({ status, ...extra })
      .eq('id', fatura.id)
      .select()
      .single();
    setSavingStatus(null);
    if (!error && data) onStatusChanged(data as EnergiaFatura);
  }

  function handlePrint() {
    window.print();
  }

  function copyBarcode() {
    if (!fatura.codigo_barras) return;
    navigator.clipboard.writeText(fatura.codigo_barras).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const statusCfg = FATURA_STATUS_CONFIG[fatura.status];
  const competencia = `${MESES_ABREV[fatura.mes - 1]}/${fatura.ano}`;
  const currentIdx = STATUS_ORDER.indexOf(fatura.status === 'vencida' ? 'enviada' : fatura.status);
  const nextStatus = fatura.status !== 'vencida' && currentIdx < STATUS_ORDER.length - 1
    ? STATUS_ORDER[currentIdx + 1]
    : null;
  const nextCfg = nextStatus ? FATURA_STATUS_CONFIG[nextStatus] : null;

  const itensEnergia = itens.filter(i => i.tipo === 'energia');
  const itensAluguel = itens.filter(i => i.tipo === 'aluguel');

  // QR Code URL using public API — no package needed
  const qrUrl = fatura.pix_chave
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(fatura.pix_chave)}&color=610000&bgcolor=ffffff`
    : null;

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto print:hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col">

          {/* Modal header — not printed */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2 flex-shrink-0 print:hidden">
            <div>
              <h2 className="font-display font-bold text-base text-text-primary">Fatura {competencia}</h2>
              <span className={`inline-flex items-center gap-1 font-body text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-surface-3 font-body text-xs text-text-secondary hover:bg-surface-1 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          </div>

          {/* Pipeline — not printed */}
          <div className="px-6 py-4 border-b border-surface-2 print:hidden">
            <p className="font-body text-xs font-bold text-text-secondary tracking-widest mb-4">CICLO DA FATURA</p>
            <StatusPipeline current={fatura.status} />
          </div>

          {/* Printable content */}
          <div ref={printRef} className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-260px)] print:max-h-none print:overflow-visible">

            {/* Fatura header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-mos-700">
              <div>
                <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest">FATURA DE COBRANÇA</p>
                <h1 className="font-display font-extrabold text-2xl text-mos-700 mt-0.5">
                  Competência {competencia}
                </h1>
                {unidade && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="font-body text-sm text-text-secondary">{unidade.nome}</span>
                    {(unidade.cidade || unidade.estado) && (
                      <span className="font-body text-sm text-text-tertiary">— {[unidade.cidade, unidade.estado].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-body text-xs font-bold text-text-secondary">Emitida em</p>
                <p className="font-data text-xs font-semibold text-text-primary">
                  {new Date(fatura.created_at).toLocaleDateString('pt-BR')}
                </p>
                {fatura.data_vencimento && (
                  <>
                    <p className="font-body text-xs font-bold text-text-secondary mt-1.5">Vencimento</p>
                    <p className={`font-data text-xs font-semibold ${fatura.status === 'vencida' ? 'text-status-error' : 'text-text-primary'}`}>
                      {new Date(fatura.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Destinatário */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Destinatário</p>
                <p className="font-body text-sm font-semibold text-text-primary">{fatura.destinatario_nome}</p>
                {fatura.destinatario_cpf_cnpj && <p className="font-data text-xs text-text-secondary">{fatura.destinatario_cpf_cnpj}</p>}
                {fatura.destinatario_email && <p className="font-body text-xs text-text-tertiary">{fatura.destinatario_email}</p>}
              </div>
              <div className="text-right">
                <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total a Pagar</p>
                <p className="font-data font-extrabold text-2xl text-mos-700">{formatCurrencyBR(Number(fatura.valor_total))}</p>
              </div>
            </div>

            {/* Itens de energia */}
            {loadingItens ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-text-tertiary" /></div>
            ) : (
              <div className="space-y-4">
                {itensEnergia.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-mos-700" />
                      <p className="font-body text-xs font-bold text-text-primary uppercase tracking-wider">Energia Elétrica</p>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-surface-2">
                          <th className="text-left py-1.5 font-body text-xs font-bold text-text-secondary uppercase">Descrição</th>
                          <th className="text-right py-1.5 font-body text-xs font-bold text-text-secondary uppercase">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-1">
                        {itensEnergia.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 font-body text-sm text-text-primary">{item.descricao}</td>
                            <td className="py-2 text-right font-data text-sm font-semibold text-text-primary">{formatCurrencyBR(Number(item.valor))}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-surface-2">
                          <td className="py-2 font-body text-sm font-bold text-text-primary">Subtotal Energia</td>
                          <td className="py-2 text-right font-data text-sm font-bold text-text-primary">{formatCurrencyBR(Number(fatura.valor_energia))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {itensAluguel.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="w-3.5 h-3.5 text-text-secondary" />
                      <p className="font-body text-xs font-bold text-text-primary uppercase tracking-wider">Aluguel</p>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-surface-2">
                          <th className="text-left py-1.5 font-body text-xs font-bold text-text-secondary uppercase">Descrição</th>
                          <th className="text-right py-1.5 font-body text-xs font-bold text-text-secondary uppercase">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-1">
                        {itensAluguel.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 font-body text-sm text-text-primary">{item.descricao}</td>
                            <td className="py-2 text-right font-data text-sm font-semibold text-text-primary">{formatCurrencyBR(Number(item.valor))}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-surface-2">
                          <td className="py-2 font-body text-sm font-bold text-text-primary">Subtotal Aluguel</td>
                          <td className="py-2 text-right font-data text-sm font-bold text-text-primary">{formatCurrencyBR(Number(fatura.valor_aluguel))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Total geral */}
                <div className="rounded-xl bg-mos-700 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-body text-xs text-white/80 uppercase tracking-wider font-semibold">Total Geral</p>
                    {Number(fatura.valor_energia) > 0 && Number(fatura.valor_aluguel) > 0 && (
                      <p className="font-body text-xs text-white/70 mt-0.5">
                        Energia {formatCurrencyBR(Number(fatura.valor_energia))} + Aluguel {formatCurrencyBR(Number(fatura.valor_aluguel))}
                      </p>
                    )}
                  </div>
                  <p className="font-data font-extrabold text-3xl text-white">{formatCurrencyBR(Number(fatura.valor_total))}</p>
                </div>
              </div>
            )}

            {/* Pagamento: QR Code PIX + Código de barras */}
            {(fatura.pix_chave || fatura.codigo_barras) && (
              <div className="border-t border-surface-2 pt-4">
                <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Como Pagar</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fatura.pix_chave && qrUrl && (
                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-surface-2 bg-surface-1">
                      <p className="font-body text-xs font-semibold text-text-primary">Pague via PIX</p>
                      <img
                        src={qrUrl}
                        alt="QR Code PIX"
                        className="w-40 h-40 rounded-lg border border-surface-3"
                        loading="lazy"
                      />
                      <div className="w-full">
                        <p className="font-body text-xs font-bold text-text-secondary mb-1">Chave PIX</p>
                        <div className="flex items-center gap-2 bg-white border border-surface-3 rounded-md px-3 py-1.5">
                          <span className="font-data text-xs text-text-primary flex-1 truncate">{fatura.pix_chave}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(fatura.pix_chave!)}
                            className="flex-shrink-0 p-0.5 rounded hover:bg-surface-2 transition-colors"
                          >
                            <Copy className="w-3 h-3 text-text-tertiary" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {fatura.codigo_barras && (
                    <div className="flex flex-col gap-3 p-4 rounded-xl border border-surface-2 bg-surface-1 justify-center">
                      <p className="font-body text-xs font-semibold text-text-primary">Boleto Bancário</p>
                      {/* Simulated barcode stripes */}
                      <div className="h-16 bg-white border border-surface-3 rounded-lg flex items-center justify-center overflow-hidden">
                        <div className="flex items-end gap-px h-12 px-2">
                          {Array.from({ length: 80 }, (_, i) => (
                            <div
                              key={i}
                              className="bg-text-primary rounded-sm"
                              style={{
                                width: `${[1,2,1,3,2,1,2,1,3,2][i % 10]}px`,
                                height: `${60 + (i % 3) * 10}%`,
                                opacity: 0.85,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-body text-xs font-bold text-text-secondary mb-1">Linha digitável</p>
                        <div className="flex items-center gap-2 bg-white border border-surface-3 rounded-md px-3 py-1.5">
                          <span className="font-data text-[10px] text-text-primary flex-1 break-all leading-relaxed">{fatura.codigo_barras}</span>
                          <button
                            onClick={copyBarcode}
                            className="flex-shrink-0 p-0.5 rounded hover:bg-surface-2 transition-colors"
                          >
                            {copied ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3 text-text-tertiary" />}
                          </button>
                        </div>
                        {copied && <p className="font-body text-xs text-status-success mt-1">Copiado!</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alertas / status vencida */}
            {fatura.status === 'vencida' && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-status-errorLight border border-status-error/30">
                <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0" />
                <p className="font-body text-sm text-status-error font-medium">Esta fatura está vencida. Regularize o pagamento.</p>
              </div>
            )}

            {/* Observacoes */}
            {fatura.observacoes && (
              <div className="bg-surface-1 rounded-lg px-4 py-3 border border-surface-2">
                <p className="font-body text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Observações</p>
                <p className="font-body text-sm text-text-primary whitespace-pre-wrap">{fatura.observacoes}</p>
              </div>
            )}
          </div>

          {/* Footer — not printed */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1 flex-shrink-0 print:hidden">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
            >
              Fechar
            </button>
            <div className="flex items-center gap-2">
              {fatura.status === 'vencida' && (
                <button
                  onClick={() => changeStatus('paga')}
                  disabled={savingStatus !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-status-success text-white font-body text-sm font-medium hover:bg-status-success/90 transition-colors disabled:opacity-50"
                >
                  {savingStatus === 'paga' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Marcar como Paga
                </button>
              )}
              {nextStatus && nextCfg && fatura.status !== 'vencida' && (
                <button
                  onClick={() => changeStatus(nextStatus)}
                  disabled={savingStatus !== null}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-body text-sm font-medium transition-colors disabled:opacity-50 border ${nextCfg.bg} ${nextCfg.text} ${nextCfg.border} hover:brightness-95`}
                >
                  {savingStatus === nextStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Avançar para {nextCfg.label}
                </button>
              )}
              {fatura.status === 'paga' && (
                <span className="flex items-center gap-1.5 font-body text-sm text-status-success font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Paga
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print-only full page layout */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[999]">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Print header */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-mos-700">
            <div>
              <p className="font-body text-[10px] text-gray-500 uppercase tracking-widest">FATURA DE COBRANÇA</p>
              <h1 className="font-display font-extrabold text-2xl" style={{ color: '#610000' }}>Competência {competencia}</h1>
              {unidade && <p className="font-body text-sm text-gray-500 mt-1">{unidade.nome}</p>}
            </div>
            <div className="text-right">
              {fatura.data_vencimento && (
                <>
                  <p className="font-body text-[10px] text-gray-500">Vencimento</p>
                  <p className="font-data text-sm font-semibold text-gray-900">
                    {new Date(fatura.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Print destinatario + total */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-[10px] text-gray-500 uppercase">Destinatário</p>
              <p className="font-body text-sm font-semibold text-gray-900">{fatura.destinatario_nome}</p>
              {fatura.destinatario_cpf_cnpj && <p className="font-data text-xs text-gray-600">{fatura.destinatario_cpf_cnpj}</p>}
            </div>
            <div className="text-right">
              <p className="font-body text-[10px] text-gray-500 uppercase">Total</p>
              <p className="font-data font-extrabold text-2xl" style={{ color: '#610000' }}>{formatCurrencyBR(Number(fatura.valor_total))}</p>
            </div>
          </div>

          {/* Print items */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th className="text-left py-2 text-gray-500 font-normal text-xs uppercase">Descrição</th>
                <th className="text-right py-2 text-gray-500 font-normal text-xs uppercase">Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="py-2 text-gray-700">{item.descricao}</td>
                  <td className="py-2 text-right font-semibold text-gray-900">{formatCurrencyBR(Number(item.valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Print pagamento */}
          {(fatura.pix_chave || fatura.codigo_barras) && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
              <p className="font-body text-xs text-gray-500 uppercase tracking-widest mb-3">Dados de Pagamento</p>
              <div className="flex gap-6">
                {fatura.pix_chave && qrUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-semibold text-gray-700">PIX</p>
                    <img src={qrUrl} alt="QR Code PIX" style={{ width: 120, height: 120 }} />
                    <p className="font-data text-[10px] text-gray-600">{fatura.pix_chave}</p>
                  </div>
                )}
                {fatura.codigo_barras && (
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Linha Digitável</p>
                    <p className="font-data text-xs text-gray-800 break-all">{fatura.codigo_barras}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {fatura.observacoes && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Observações</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{fatura.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
