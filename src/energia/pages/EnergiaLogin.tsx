import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useEnergiaAuth } from '../contexts/EnergiaAuthContext';

export default function EnergiaLogin() {
  const { login, error } = useEnergiaAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) return;
    setLoading(true);
    const success = await login(email, senha);
    setLoading(false);
    if (success) navigate('/imoveis/dashboard');
  }

  return (
    <div className="min-h-screen bg-surface-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-mos-700 rounded-md flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="font-display font-bold text-lg text-text-primary leading-tight">MOS</p>
              <p className="font-body text-[10px] text-text-tertiary tracking-widest leading-tight">GESTOR DE OBRAS</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-mos-50 rounded-lg border border-mos-100">
            <Zap className="w-3.5 h-3.5 text-mos-700" />
            <span className="font-body text-xs font-semibold text-mos-700 tracking-wide">CONTROLE DE ENERGIA</span>
          </div>
        </div>

        {/* Form card */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">Entrar</h2>
            <p className="font-body text-xs text-text-tertiary mt-0.5">Acesse com suas credenciais</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-status-errorLight border border-status-error/20">
              <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0" />
              <p className="font-body text-xs text-status-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-text-tertiary tracking-widest mb-1.5">SENHA</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg font-body text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-mos-700/20 focus:border-mos-700 transition-colors shadow-card"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
