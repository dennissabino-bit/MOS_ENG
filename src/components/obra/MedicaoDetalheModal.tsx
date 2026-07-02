import { useState, useEffect } from 'react';
import {
  X, CheckCircle2, Clock, XCircle, Minus, Building2, Phone, Mail,
  MapPin, CreditCard, FileText, Tag, Loader2, Images, ChevronLeft,
  ChevronRight, ZoomIn, Calendar, AlertTriangle,
} from 'lucide-react';
import type { Medicao, Fornecedor, MedicaoAnexo, MedicaoStatus } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { formatCurrencyFull } from '../../lib/formatters';

interface MedicaoDetalheModalProps {
  medicao: Medicao;
  onClose: () => void;
  onStatusChanged?: (updated: Medicao) => void;
}

const CAT_LABELS: Record<string, string> = {
  infraestrutura: 'Infraestrutura',
  superestrutura: 'Superestrutura',
  instalacoes: 'Instalações Prediais',
  acabamentos: 'Acabamentos',
  extra: 'Extra',
};

const STATUS_CONFIG: Record<MedicaoStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  aprovada: { label: 'Aprovada', icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: 'bg-status-successLight', text: 'text-status-success', border: 'border-status-success/30' },
  pendente: { label: 'Pendente', icon: <Clock className="w-3.5 h-3.5" />, bg: 'bg-status-warningLight', text: 'text-status-warning', border: 'border-status-warning/30' },
  reprovada: { label: 'Reprovada', icon: <XCircle className="w-3.5 h-3.5" />, bg: 'bg-status-errorLight', text: 'text-status-error', border: 'border-status-error/30' },
  a_medir: { label: 'A Medir', icon: <Minus className="w-3.5 h-3.5" />, bg: 'bg-surface-2', text: 'text-text-disabled', border: 'border-surface-3' },
};

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif']);

function isImageAnexo(a: MedicaoAnexo) {
  return IMAGE_EXTS.has((a.tipo || '').toLowerCase());
}

function computeValorTotal(m: Medicao): number {
  if (m.qtd_medida != null && m.qtd_medida > 0) return m.qtd_medida * (m.valor_unitario || 0);
  if (m.valor_total != null && m.valor_total > 0) return m.valor_total;
  return (m.qtd_orcada || 0) * (m.valor_unitario || 0);
}

export function MedicaoDetalheModal({ medicao, onClose, onStatusChanged }: MedicaoDetalheModalProps) {
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [cotacaoTitulo, setCotacaoTitulo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<MedicaoStatus | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const anexos: MedicaoAnexo[] = Array.isArray(medicao.notas_fiscais) ? medicao.notas_fiscais : [];
  const fotos = anexos.filter(isImageAnexo);
  const docs = anexos.filter(a => !isImageAnexo(a));

  useEffect(() => {
    async function load() {
      setLoading(true);
      const promises: Promise<void>[] = [];
      if (medicao.fornecedor_id) {
        promises.push(
          supabase.from('fornecedores').select('*').eq('id', medicao.fornecedor_id).maybeSingle()
            .then(({ data }) => { if (data) setFornecedor(data as Fornecedor); }) as Promise<void>
        );
      }
      if (medicao.cotacao_grupo_id) {
        promises.push(
          supabase.from('cotacao_grupos').select('titulo').eq('id', medicao.cotacao_grupo_id).maybeSingle()
            .then(({ data }) => { if (data) setCotacaoTitulo((data as { titulo: string }).titulo); }) as Promise<void>
        );
      }
      await Promise.all(promises);
      setLoading(false);
    }
    load();
  }, [medicao.fornecedor_id, medicao.cotacao_grupo_id]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setLightboxIndex(null); return; }
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? Math.min(i + 1, fotos.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, fotos.length]);

  async function changeStatus(status: MedicaoStatus) {
    setSavingStatus(status);
    const { data, error } = await (supabase
      .from('medicoes') as ReturnType<typeof supabase.from>)
      .update({ status })
      .eq('id', medicao.id)
      .select()
      .single();
    setSavingStatus(null);
    if (!error && data && onStatusChanged) {
      onStatusChanged(data as Medicao);
      onClose();
    }
  }

  const statusCfg = STATUS_CONFIG[medicao.status];
  const valorTotal = computeValorTotal(medicao);
  const medPercent = medicao.qtd_orcada > 0 && medicao.qtd_medida != null
    ? Math.min((medicao.qtd_medida / medicao.qtd_orcada) * 100, 100)
    : 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-surface-2 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-data text-xs text-text-tertiary bg-surface-1 border border-surface-2 px-2 py-0.5 rounded">{medicao.codigo}</span>
                {medicao.categoria && (
                  <span className="flex items-center gap-1 font-body text-xs text-text-secondary bg-surface-1 border border-surface-2 px-2 py-0.5 rounded">
                    <Tag className="w-3 h-3" />
                    {CAT_LABELS[medicao.categoria] ?? medicao.categoria}
                  </span>
                )}
                <span className={`flex items-center gap-1 font-body text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                  {statusCfg.icon}
                  {statusCfg.label}
                </span>
              </div>
              <h2 className="font-display font-bold text-base text-text-primary leading-snug">{medicao.descricao}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors flex-shrink-0">
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
              </div>
            )}

            {/* Valor total + barra de progresso */}
            <div className="rounded-xl bg-mos-700 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-body text-xs text-white/70 uppercase tracking-wider mb-0.5">Valor Total da Medição</p>
                  <p className="font-data font-bold text-2xl text-white">
                    {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-data font-bold text-2xl text-white">{medPercent.toFixed(0)}%</p>
                  <p className="font-body text-xs text-white/70">avançado</p>
                </div>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    medicao.status === 'aprovada' ? 'bg-status-success' :
                    medicao.status === 'reprovada' ? 'bg-status-error' :
                    'bg-white/60'
                  }`}
                  style={{ width: `${medPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="font-body text-[10px] text-white/50">0%</span>
                <span className="font-body text-[10px] text-white/50">
                  {medicao.qtd_medida != null
                    ? `${medicao.qtd_medida.toLocaleString('pt-BR')} / ${medicao.qtd_orcada.toLocaleString('pt-BR')} ${medicao.unidade}`
                    : `${medicao.qtd_orcada.toLocaleString('pt-BR')} ${medicao.unidade} orçados`}
                </span>
                <span className="font-body text-[10px] text-white/50">100%</span>
              </div>
            </div>

            {/* Linha do tempo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <div className="w-7 h-7 rounded-full bg-surface-1 border border-surface-2 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-text-tertiary" />
                </div>
                <div>
                  <p className="font-body text-[10px] text-text-tertiary">Criada em</p>
                  <p className="font-data text-xs font-semibold text-text-primary">
                    {new Date(medicao.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex-1 h-px bg-surface-2" />
              {medicao.data_medicao ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="w-7 h-7 rounded-full bg-status-successLight border border-status-success/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-status-success" />
                  </div>
                  <div>
                    <p className="font-body text-[10px] text-text-tertiary">Medida em</p>
                    <p className="font-data text-xs font-semibold text-text-primary">
                      {new Date(medicao.data_medicao + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="w-7 h-7 rounded-full bg-surface-1 border border-dashed border-surface-3 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-text-disabled" />
                  </div>
                  <div>
                    <p className="font-body text-[10px] text-text-tertiary">Data medição</p>
                    <p className="font-data text-xs text-text-disabled">Não registrada</p>
                  </div>
                </div>
              )}
              <div className="flex-1 h-px bg-surface-2" />
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${statusCfg.bg} ${statusCfg.border}`}>
                  <span className={statusCfg.text}>{statusCfg.icon}</span>
                </div>
                <div>
                  <p className="font-body text-[10px] text-text-tertiary">Status</p>
                  <p className={`font-data text-xs font-semibold ${statusCfg.text}`}>{statusCfg.label}</p>
                </div>
              </div>
            </div>

            {/* Quantitativos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-surface-2 px-3 py-2.5">
                <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Unidade</p>
                <p className="font-data text-sm font-semibold text-text-primary mt-0.5">{medicao.unidade}</p>
              </div>
              <div className="rounded-lg border border-surface-2 px-3 py-2.5">
                <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Qtd. Orçada</p>
                <p className="font-data text-sm font-semibold text-text-primary mt-0.5">{medicao.qtd_orcada.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-lg border border-surface-2 px-3 py-2.5">
                <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Qtd. Medida</p>
                <p className={`font-data text-sm font-semibold mt-0.5 ${medicao.qtd_medida != null ? 'text-text-primary' : 'text-text-disabled'}`}>
                  {medicao.qtd_medida != null ? medicao.qtd_medida.toLocaleString('pt-BR') : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-surface-2 px-3 py-2.5">
                <p className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">Valor Unit.</p>
                <p className="font-data text-sm font-semibold text-text-primary mt-0.5">{formatCurrencyFull(medicao.valor_unitario)}</p>
              </div>
            </div>

            {/* Descricao do servico */}
            {medicao.descricao_servico && (
              <div>
                <h3 className="font-display font-semibold text-sm text-text-primary mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-text-tertiary" />
                  Descrição do Serviço
                </h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed whitespace-pre-wrap bg-surface-1 rounded-lg px-4 py-3 border border-surface-2">
                  {medicao.descricao_servico}
                </p>
              </div>
            )}

            {/* Galeria de fotos */}
            {fotos.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-sm text-text-primary mb-2 flex items-center gap-1.5">
                  <Images className="w-4 h-4 text-text-tertiary" />
                  Fotos
                  <span className="font-body text-xs text-text-tertiary">({fotos.length})</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((foto, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLightboxIndex(idx)}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-surface-2 hover:border-mos-700 transition-colors focus:outline-none focus:ring-2 focus:ring-mos-700"
                    >
                      <img
                        src={foto.url}
                        alt={foto.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="font-body text-[10px] text-white truncate">{foto.nome}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Documentos */}
            {docs.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-sm text-text-primary mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-text-tertiary" />
                  Documentos / Notas Fiscais
                  <span className="font-body text-xs text-text-tertiary">({docs.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {docs.map((doc, i) => (
                    <a
                      key={i}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-3 rounded-lg border border-surface-2 hover:border-mos-700 hover:bg-surface-1 transition-all group"
                    >
                      <div className="w-9 h-9 rounded bg-status-errorLight flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-status-error" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-text-primary truncate">{doc.nome}</p>
                        <p className="font-data text-[10px] text-text-tertiary uppercase mt-0.5">{doc.tipo || 'arquivo'}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Aviso se nao ha anexos */}
            {anexos.length === 0 && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-dashed border-surface-3 text-text-disabled">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="font-body text-xs">Nenhuma foto ou documento anexado a esta medição.</p>
              </div>
            )}

            {/* Fornecedor */}
            {(fornecedor || medicao.fornecedor_nome) && (
              <div>
                <h3 className="font-display font-semibold text-sm text-text-primary mb-2 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-text-tertiary" />
                  Fornecedor
                </h3>
                <div className="rounded-lg border border-surface-2 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-body font-semibold text-sm text-text-primary">{fornecedor?.nome ?? medicao.fornecedor_nome}</p>
                      {fornecedor?.categoria && (
                        <p className="font-body text-xs text-text-tertiary mt-0.5">{fornecedor.categoria}</p>
                      )}
                    </div>
                    {fornecedor?.cnpj && (
                      <p className="font-data text-xs text-text-tertiary">{fornecedor.cnpj}</p>
                    )}
                  </div>
                  {(fornecedor?.telefone || fornecedor?.email || fornecedor?.cidade) && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-surface-2">
                      {fornecedor.telefone && (
                        <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
                          <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                          {fornecedor.telefone}
                        </span>
                      )}
                      {fornecedor.email && (
                        <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
                          <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                          {fornecedor.email}
                        </span>
                      )}
                      {fornecedor.cidade && (
                        <span className="flex items-center gap-1.5 font-body text-xs text-text-secondary">
                          <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                          {fornecedor.cidade}{fornecedor.estado ? `, ${fornecedor.estado}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                  {fornecedor?.dados_bancarios && (
                    <div className="bg-surface-1 rounded-lg px-3 py-2.5 border border-surface-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-text-tertiary" />
                        <p className="font-body text-xs font-semibold text-text-secondary">Dados Bancários</p>
                      </div>
                      <p className="font-body text-xs text-text-primary whitespace-pre-wrap">{fornecedor.dados_bancarios}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cotacao vinculada */}
            {cotacaoTitulo && (
              <div>
                <h3 className="font-display font-semibold text-sm text-text-primary mb-2">Cotação Vinculada</h3>
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-surface-2 bg-surface-1">
                  <Tag className="w-4 h-4 text-mos-700 flex-shrink-0" />
                  <p className="font-body text-sm text-text-primary flex-1">{cotacaoTitulo}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
            >
              Fechar
            </button>
            {medicao.status === 'pendente' && onStatusChanged && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeStatus('reprovada')}
                  disabled={savingStatus !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-status-error/30 bg-status-errorLight text-status-error font-body text-sm font-medium hover:bg-status-error/20 transition-colors disabled:opacity-50"
                >
                  {savingStatus === 'reprovada'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />
                  }
                  Reprovar
                </button>
                <button
                  onClick={() => changeStatus('aprovada')}
                  disabled={savingStatus !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-status-success text-white font-body text-sm font-medium hover:bg-status-success/90 transition-colors disabled:opacity-50"
                >
                  {savingStatus === 'aprovada'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />
                  }
                  Aprovar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && fotos.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i - 1 : i); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <img
            src={fotos[lightboxIndex].url}
            alt={fotos[lightboxIndex].nome}
            className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />

          {lightboxIndex < fotos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i + 1 : i); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <p className="font-body text-xs text-white/70 truncate max-w-xs text-center">{fotos[lightboxIndex].nome}</p>
            {fotos.length > 1 && (
              <div className="flex items-center gap-1.5">
                {fotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setLightboxIndex(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
