import { useState, useRef } from 'react';
import { X, Upload, Link, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ThumbnailModalProps {
  obraId: string;
  obraName: string;
  currentUrl?: string;
  onClose: () => void;
  onSaved: (obraId: string, newUrl: string) => void;
}

type Tab = 'url' | 'upload';

export function ThumbnailModal({ obraId, obraName, currentUrl, onClose, onSaved }: ThumbnailModalProps) {
  const [tab, setTab] = useState<Tab>('url');
  const [urlInput, setUrlInput] = useState(currentUrl || '');
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUrlChange(val: string) {
    setUrlInput(val);
    setError(null);
    if (val.trim()) {
      setPreview(val.trim());
    } else {
      setPreview(null);
    }
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Apenas arquivos de imagem são suportados.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5 MB.');
      return;
    }
    setError(null);
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      setUploadPreview(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    let finalUrl: string | null = null;

    if (tab === 'url') {
      finalUrl = urlInput.trim() || null;
      if (!finalUrl) {
        setError('Informe uma URL.');
        setSaving(false);
        return;
      }
    } else {
      if (!uploadFile) {
        setError('Selecione um arquivo.');
        setSaving(false);
        return;
      }

      const ext = uploadFile.name.split('.').pop() ?? 'jpg';
      const path = `${obraId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('obras-thumbnails')
        .upload(path, uploadFile, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        setError(`Erro ao fazer upload: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from('obras-thumbnails')
        .getPublicUrl(path);

      finalUrl = publicData.publicUrl;
    }

    const { error: dbError } = await supabase
      .from('obras')
      .update({ imagem_url: finalUrl })
      .eq('id', obraId);

    if (dbError) {
      console.error('DB update error:', dbError);
      setError(`Erro ao salvar: ${dbError.message}`);
      setSaving(false);
      return;
    }

    onSaved(obraId, finalUrl!);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div>
            <h2 className="font-display font-bold text-base text-text-primary">Alterar Thumbnail</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5 truncate max-w-[280px]">{obraName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        {preview && (
          <div className="relative h-40 bg-surface-3 overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => { setPreview(null); setError('URL de imagem inválida.'); }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-md px-2 py-1">
              <Check className="w-3 h-3 text-green-400" />
              <span className="font-body text-[10px] text-white">Preview</span>
            </div>
          </div>
        )}

        {!preview && (
          <div className="h-28 bg-surface-1 flex items-center justify-center border-b border-surface-2">
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-text-disabled" />
              <span className="font-body text-xs text-text-disabled">Preview da imagem</span>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex gap-1 bg-surface-1 rounded-lg p-1 border border-surface-2">
            <button
              onClick={() => setTab('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-body text-xs font-medium transition-all ${
                tab === 'url' ? 'bg-white shadow-card text-text-primary border border-surface-3' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              URL da Imagem
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-body text-xs font-medium transition-all ${
                tab === 'upload' ? 'bg-white shadow-card text-text-primary border border-surface-3' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
          </div>

          {tab === 'url' && (
            <div>
              <label className="font-body text-xs font-semibold text-text-secondary mb-1.5 block">URL da imagem</label>
              <input
                type="url"
                className="w-full rounded-lg border border-surface-3 px-3 py-2 font-body text-sm text-text-primary focus:outline-none focus:border-mos-700 transition-colors"
                placeholder="https://exemplo.com/imagem.jpg"
                value={urlInput}
                onChange={e => handleUrlChange(e.target.value)}
              />
              <p className="font-body text-[10px] text-text-disabled mt-1">
                Use imagens de fontes públicas como Pexels, Unsplash, etc.
              </p>
            </div>
          )}

          {tab === 'upload' && (
            <div>
              <div
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  dragOver ? 'border-mos-700 bg-mos-50' : 'border-surface-3 hover:border-text-disabled'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileChange(e.dataTransfer.files[0]);
                }}
              >
                <Upload className={`w-8 h-8 ${dragOver ? 'text-mos-700' : 'text-text-disabled'}`} />
                <div className="text-center">
                  <p className="font-body text-sm font-medium text-text-secondary">
                    {uploadFile ? uploadFile.name : 'Arraste ou clique para selecionar'}
                  </p>
                  <p className="font-body text-xs text-text-disabled mt-0.5">PNG, JPG, WEBP até 5 MB</p>
                </div>
                {uploadFile && (
                  <div className="flex items-center gap-1 text-status-success">
                    <Check className="w-3.5 h-3.5" />
                    <span className="font-body text-xs font-medium">Arquivo carregado</span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-status-errorLight px-4 py-2.5">
              <p className="font-body text-sm text-status-error">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-2 bg-surface-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-surface-3 font-body text-sm text-text-secondary hover:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-mos-700 text-white font-body text-sm font-medium hover:bg-mos-800 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando…' : 'Salvar Thumbnail'}
          </button>
        </div>
      </div>
    </div>
  );
}
