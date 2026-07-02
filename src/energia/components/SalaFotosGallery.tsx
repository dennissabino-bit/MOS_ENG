import { useState, useEffect, useRef } from 'react';
import { ImagePlus, X, Loader2, Trash2, ZoomIn, Images } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EnergiaSalaFoto {
  id: string;
  sala_id: string;
  nome: string;
  url: string;
  tamanho_bytes: number | null;
  mime_type: string;
  created_at: string;
}

interface Props {
  salaId: string;
  isAdmin: boolean;
}

export function SalaFotosGallery({ salaId, isAdmin }: Props) {
  const [fotos, setFotos] = useState<EnergiaSalaFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [salaId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('energia_sala_fotos')
      .select('*')
      .eq('sala_id', salaId)
      .order('created_at', { ascending: false });
    setFotos((data as EnergiaSalaFoto[]) || []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);

    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${salaId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('sala-fotos')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadErr) continue;

      const { data: urlData } = supabase.storage
        .from('sala-fotos')
        .getPublicUrl(path);

      await supabase.from('energia_sala_fotos').insert({
        sala_id: salaId,
        nome: file.name,
        url: urlData.publicUrl,
        tamanho_bytes: file.size,
        mime_type: file.type,
      });
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    load();
  }

  async function handleDelete(foto: EnergiaSalaFoto) {
    setDeletingId(foto.id);
    // Extract path from URL
    const parts = foto.url.split('/sala-fotos/');
    if (parts.length === 2) {
      await supabase.storage.from('sala-fotos').remove([parts[1]]);
    }
    await supabase.from('energia_sala_fotos').delete().eq('id', foto.id);
    setDeletingId(null);
    setFotos(prev => prev.filter(f => f.id !== foto.id));
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-surface-2 bg-surface-1 flex items-center justify-between">
        <p className="font-body text-xs font-semibold text-text-tertiary tracking-widest">
          FOTOS DA SALA ({fotos.length})
        </p>
        {isAdmin && (
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mos-700 text-white font-body text-xs font-semibold cursor-pointer hover:bg-mos-700/90 transition-colors">
            {uploading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ImagePlus className="w-3.5 h-3.5" />
            }
            {uploading ? 'Enviando…' : 'Adicionar Fotos'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-lg" />
          ))}
        </div>
      ) : fotos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Images className="w-10 h-10 text-text-disabled" />
          <p className="font-body text-sm text-text-tertiary">Nenhuma foto cadastrada</p>
          {isAdmin && (
            <label className="font-body text-sm text-mos-700 font-semibold cursor-pointer hover:underline">
              Adicionar primeira foto
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-4">
          {fotos.map(foto => (
            <div
              key={foto.id}
              className="relative group aspect-square rounded-xl overflow-hidden border border-surface-2 bg-surface-1"
            >
              <img
                src={foto.url}
                alt={foto.nome}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-2">
                <button
                  onClick={() => setLightbox(foto.url)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white/90 hover:bg-white"
                  title="Ampliar"
                >
                  <ZoomIn className="w-4 h-4 text-gray-800" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(foto)}
                    disabled={deletingId === foto.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white/90 hover:bg-red-50"
                    title="Excluir"
                  >
                    {deletingId === foto.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-status-error" />
                      : <Trash2 className="w-4 h-4 text-status-error" />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Foto ampliada"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
