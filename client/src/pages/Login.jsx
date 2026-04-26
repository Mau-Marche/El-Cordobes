import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkshopLogo } from '@/components/ui/WorkshopLogo';

/* ── Auto SVG de perfil ─────────────────────────────────────────── */
function CarSilhouette() {
  return (
    <svg viewBox="0 0 520 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-lg opacity-80">
      {/* Sombra suelo */}
      <ellipse cx="260" cy="185" rx="220" ry="10" fill="#000" opacity="0.25" />
      {/* Carrocería */}
      <path
        d="M40 130 L60 100 L105 65 C120 52 145 45 175 43 L290 42 C320 42 345 50 365 65 L420 100 L455 115 L460 130 Z"
        fill="#1e3a5f"
        stroke="#3b82f6"
        strokeWidth="1.5"
      />
      {/* Cabina / vidrios */}
      <path
        d="M118 97 L148 62 C158 52 172 47 196 46 L290 46 C316 46 332 52 342 62 L372 97 Z"
        fill="#0f2035"
        stroke="#3b82f6"
        strokeWidth="1"
      />
      <path
        d="M130 94 L156 65 C164 56 176 50 198 49 L288 49 C312 49 326 55 335 65 L362 94 Z"
        fill="rgba(56,189,248,0.12)"
        stroke="rgba(56,189,248,0.4)"
        strokeWidth="1"
      />
      {/* Divisor ventanas */}
      <line x1="248" y1="48" x2="248" y2="94" stroke="#3b82f6" strokeWidth="1.5" />
      {/* Ruedas - aro exterior */}
      <circle cx="115" cy="143" r="37" fill="#0a1a2e" stroke="#3b82f6" strokeWidth="2" />
      <circle cx="380" cy="143" r="37" fill="#0a1a2e" stroke="#3b82f6" strokeWidth="2" />
      {/* Ruedas - goma */}
      <circle cx="115" cy="143" r="30" fill="#0d1b2a" />
      <circle cx="380" cy="143" r="30" fill="#0d1b2a" />
      {/* Llantas */}
      <circle cx="115" cy="143" r="16" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5" />
      <circle cx="380" cy="143" r="16" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5" />
      {/* Rayos rueda delantera */}
      {[0,60,120,180,240,300].map(a => (
        <line key={a}
          x1={115 + 5 * Math.cos(a * Math.PI/180)}
          y1={143 + 5 * Math.sin(a * Math.PI/180)}
          x2={115 + 14 * Math.cos(a * Math.PI/180)}
          y2={143 + 14 * Math.sin(a * Math.PI/180)}
          stroke="#60a5fa" strokeWidth="1.5"
        />
      ))}
      {/* Rayos rueda trasera */}
      {[0,60,120,180,240,300].map(a => (
        <line key={a}
          x1={380 + 5 * Math.cos(a * Math.PI/180)}
          y1={143 + 5 * Math.sin(a * Math.PI/180)}
          x2={380 + 14 * Math.cos(a * Math.PI/180)}
          y2={143 + 14 * Math.sin(a * Math.PI/180)}
          stroke="#60a5fa" strokeWidth="1.5"
        />
      ))}
      {/* Faro delantero */}
      <ellipse cx="453" cy="116" rx="9" ry="6" fill="#fef08a" opacity="0.9" />
      <ellipse cx="453" cy="116" rx="6" ry="4" fill="#fef9c3" />
      {/* Luz trasera */}
      <rect x="38" y="104" width="10" height="18" rx="2" fill="#ef4444" opacity="0.8" />
      {/* Espejo */}
      <path d="M372 82 L382 78 L385 84 L375 88 Z" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
      {/* Parrilla delantera */}
      <path d="M443 118 L458 122 L457 128 L441 126 Z" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
    </svg>
  );
}

/* ── Componente principal ───────────────────────────────────────── */
export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo: branding ── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2035 40%, #1a3050 100%)' }}
      >
        {/* Patrón de fondo: grilla diagonal sutil */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Línea de acento naranja izquierda */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500/0 via-orange-500 to-orange-500/0" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col items-center gap-8 px-12 text-center">
          {/* Logo */}
          <WorkshopLogo size={96} uid="login-lg" />

          {/* Nombre */}
          <div>
            <h1 className="text-5xl font-black text-white tracking-tight">
              El Cordobés
            </h1>
            <p className="text-blue-300 mt-2 text-lg font-medium tracking-widest uppercase">
              Taller Automotriz
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-orange-500/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <div className="h-px w-16 bg-orange-500/60" />
            </div>
          </div>

          {/* Auto SVG */}
          <div className="w-full max-w-md mt-4">
            <CarSilhouette />
          </div>

          {/* Tagline */}
          <p className="text-white/40 text-sm max-w-xs leading-relaxed">
            Sistema de gestión interno — Órdenes de trabajo, clientes y presupuestos en un solo lugar.
          </p>
        </div>

        {/* Versión */}
        <p className="absolute bottom-6 text-white/20 text-xs">v1.0 · Sistema local</p>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex flex-col items-center justify-center bg-[#f1f5f9] p-8">

        {/* Logo mobile */}
        <div className="lg:hidden flex flex-col items-center mb-8 gap-3">
          <WorkshopLogo size={72} uid="login-sm" />
          <h1 className="text-3xl font-black text-[#0f2035]">El Cordobés</h1>
          <p className="text-sm text-slate-500 uppercase tracking-widest">Taller Automotriz</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
          {/* Encabezado */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">Ingresá tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Usuario
              </label>
              <Input
                autoFocus
                autoComplete="username"
                placeholder="Nombre de usuario"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md shadow-orange-200 transition-all"
              loading={loading}
            >
              Ingresar al sistema
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-400 text-center">
          Taller El Cordobés — Sistema de gestión local
        </p>
      </div>
    </div>
  );
}
