import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Paperclip, FileText, Image, Trash2 } from 'lucide-react';
import type { Medicao, EapCategoria, MedicaoStatus, Fornecedor, CotacaoGrupo, MedicaoAnexo } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DatePickerInput } from '../ui/DatePickerInput';
import { NumberInput } from '../ui/NumberInput';

interface NovaMedicaoModalProps {
  obraId: string;
  onClose: () => void;
  onSaved: (item: Medicao) => void;
}

const CATEGORIAS: { value: EapCategoria; label: string }[] = [
  { value: 'infraestrutura', label: '1.0 Infraestrutura' },
  { value: 'superestrutura', label: '2.0 Superestrutura' },
  { value: 'instalacoes', label: '3.0 Instalações Prediais' },
  { value: 'acabamentos', label: '4.0 Acabamentos' },
];

const STATUS_OPTIONS: { value: MedicaoStatus; label: string }[] = [
  { value: 'a_medir', label: 'A Medir' },
  { value: 'pendente', label: 'Pendente (Aguardando Aprovação)' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'reprovada', label: 'Reprovada' },
];

const UNIDADES = ['m²', 'm', 'un', 'kg', 't', 'vb', 'cj', 'L', 'cx', 'hr'];

interface LocalFile {
  file: File;
  previewUrl: string | null;
}

interface FormState {
  codigo: string;
  descricao: string;
  descricao_servico: string;
  categoria: EapCategoria;
  unidade: string;
  qtd_orcada: string;
  qtd_medida: string;
  valor_unitario: number | null;
  status: MedicaoStatus;
  data_medicao: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  cotacao_grupo_id: string;
}

const INITIAL: FormState = {
  codigo: '',
  descricao: '',
  descricao_servico: '',
  categoria: 'infraestrutura',
  unidade: 'm²',
  qtd_orcada: '',
  qtd_medida: '',
  valor_unitario: null,
  status: 'a_medir',
  data_medicao: '',
  fornecedor_id: '',
  fornecedor_nome: '',
  cotacao_grupo_id: '',
};

const inputClass = 'w-full rounded-md border border-surface-3 px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors bg-white';
const labelClass = 'font-body text-xs font-semibold text-text-secondary mb-1 block';

export function NovaMedicaoModal({ obraId, onClose, onSaved }: NovaMedicaoModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<Pick<Fornecedor, 'id' | 'nome'>[]>([]);
  const [cotacoes, setCotacoes] = useState<Pick<CotacaoGrupo, 'id' | 'titulo'>[]>([]);
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('fornecedores').select('id, nome').eq('status', 'ativo').order('nome')
      .then(({ data }) => setFornecedores(data ?? []));
    supabase.from('cotacao_grupos').select('id, titulo').order('titulo')
      .then(({ data }) => setCotacoes(data ?? []));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleFornecedorChange(id: string) {
    const forn = fornecedores.find(f => f.id === id);
    setForm(prev => ({ ...prev, fornecedor_id: id, fornecedor_nome: forn?.nome ?? '' }));
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newEntries: LocalFile[] = files.map(file => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setLocalFiles(prev => [...prev, ...newEntries]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setLocalFiles(prev => {
      const next = [...prev];
      if (next[index].previewUrl) URL.revokeObjectURL(next[index].previewUrl!);
      next.splice(index, 1);
      return next;
    });
  }

  const qtdOrc = parseFloat(form.qtd_orcada.replace(',', '.')) || 0;
  const qtdMed = form.qtd_medida ? (parseFloat(form.qtd_medida.replace(',', '.')) || 0) : null;
  const vUnit = form.valor_unitario ?? 0;
  const valorTotal = qtdMed != null && qtdMed > 0 ? qtdMed * vUnit : qtdOrc * vUnit;

  async function uploadFiles(medicaoId: string): Promise<MedicaoAnexo[]> {
    const results: MedicaoAnexo[] = [];
    for (const lf of localFiles) {
      const ext = lf.file.name.split('.').pop() ?? '';
      const path = `${obraId}/${medicaoId}/${Date.now()}-${lf.file.name}`;
      const { error: upErr } = await supabase.storage
        .from('medicoes-anexos')
        .upload(path, lf.file, { contentType: lf.file.type });
      if (upErr) continue;
      const { data: urlData } = supabase.storage.from('medicoes-anexos').getPublicUrl(path);
      results.push({ nome: lf.file.name, url: urlData.publicUrl, tipo: ext.toLowerCase() });
    }
    return results;
  }

  async function handleSave() {
    if (!form.codigo.trim() || !form.descricao.trim()) {
      setError('Código e descrição são obrigatórios.');
      return;
    }
    if (qtdOrc <= 0) {
      setError('Quantidade orçada deve ser maior que zero.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      obra_id: obraId,
      codigo: form.codigo.trim(),
      descricao: form.descricao.trim(),
      descricao_servico: form.descricao_servico.trim() || null,
      categoria: form.categoria,
      unidade: form.unidade,
      qtd_orcada: qtdOrc,
      qtd_medida: qtdMed,
      valor_unitario: vUnit,
      valor_total: valorTotal || null,
      status: form.status,
      data_medicao: form.data_medicao || null,
      fornecedor_id: form.fornecedor_id || null,
      fornecedor_nome: form.fornecedor_nome.trim() || null,
      cotacao_grupo_id: form.cotacao_grupo_id || null,
      notas_fiscais: [] as MedicaoAnexo[],
    };

    const { data, error: err } = await supabase
      .from('medicoes')
      .insert(payload)
      .select()
      .single();

    if (err || !data) {
      setError(err?.message || 'Erro ao salvar medição.');
      setSaving(false);
      return;
    }

    let finalData = data as Medicao;

    if (localFiles.length > 0) {
      const anexos = await uploadFiles(data.id);
      if (anexos.length > 0) {
        const { data: updated } = await supabase
          .from('medicoes')
          .update({ notas_fiscais: anexos })
          .eq('id', data.id)
          .select()
          .single();
        if (updated) finalData = updated as Medicao;
      }
    }

    onSaved(finalData);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Nova Medição</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Preencha os dados da medição e clique em Salvar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Identificação */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Código *</label>
              <input className={inputClass} placeholder="Ex: M-1.2" value={form.codigo} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Categoria</label>
              <select className={inputClass} value={form.categoria} onChange={e => set('categoria', e.target.value as EapCategoria)}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Descrição *</label>
            <input className={inputClass} placeholder="Ex: Escavação de fundações" value={form.descricao} onChange={e => set('descricao', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Descrição do Serviço</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Descreva o serviço realizado, escopo, observações técnicas..."
              value={form.descricao_servico}
              onChange={e => set('descricao_servico', e.target.value)}
            />
          </div>

          {/* Fornecedor */}
          <div>
            <label className={labelClass}>Fornecedor</label>
            <select
              className={inputClass}
              value={form.fornecedor_id}
              onChange={e => handleFornecedorChange(e.target.value)}
            >
              <option value="">— Sem fornecedor —</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          {/* Quantidades e valores */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Unidade</label>
              <select className={inputClass} value={form.unidade} onChange={e => set('unidade', e.target.value)}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Qtd. Orçada *</label>
              <NumberInput value={form.qtd_orcada} onChange={v => set('qtd_orcada', v)} placeholder="0" className={inputClass} allowDecimal />
            </div>
            <div>
              <label className={labelClass}>Qtd. Medida</label>
              <NumberInput value={form.qtd_medida} onChange={v => set('qtd_medida', v)} placeholder="—" className={inputClass} allowDecimal />
            </div>
          </div>

          <div>
            <label className={labelClass}>Valor Unitário (R$)</label>
            <CurrencyInput value={form.valor_unitario} onChange={v => set('valor_unitario', v)} className={inputClass} />
          </div>

          {valorTotal > 0 && (
            <div className="bg-surface-1 rounded-lg px-4 py-3">
              <p className="font-body text-xs text-text-tertiary">Valor Total Calculado</p>
              <p className="font-data font-bold text-lg text-mos-700 mt-0.5">
                {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value as MedicaoStatus)}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Data da Medição</label>
              <DatePickerInput value={form.data_medicao} onChange={v => set('data_medicao', v)} className={inputClass} />
            </div>
          </div>

          {/* Cotação vinculada */}
          <div>
            <label className={labelClass}>Cotação Vinculada</label>
            <select className={inputClass} value={form.cotacao_grupo_id} onChange={e => set('cotacao_grupo_id', e.target.value)}>
              <option value="">— Sem cotação —</option>
              {cotacoes.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
            </select>
          </div>

          {/* Anexos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>Notas Fiscais / Anexos</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-surface-3 font-body text-xs text-text-secondary hover:bg-surface-1 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Adicionar arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFilePick}
              />
            </div>
            {localFiles.length > 0 ? (
              <div className="space-y-2">
                {localFiles.map((lf, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-surface-2 bg-surface-1">
                    {lf.previewUrl ? (
                      <img src={lf.previewUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-status-errorLight flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-status-error" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs text-text-primary truncate">{lf.file.name}</p>
                      <p className="font-data text-[10px] text-text-tertiary">
                        {lf.previewUrl ? 'Imagem' : 'PDF'} · {(lf.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="p-1 rounded hover:bg-status-errorLight transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-status-error" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-surface-3 text-text-disabled">
                <Image className="w-4 h-4" />
                <p className="font-body text-xs">Nenhum arquivo anexado. Aceita PDF e imagens.</p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-status-errorLight px-4 py-3">
              <p className="font-body text-sm text-status-error">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar Medição'}
          </button>
        </div>
      </div>
    </div>
  );
}
