import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, Car, Wrench, FileText,
  Settings, LogOut,
} from 'lucide-react';

/* ── Logo SVG del taller (versión compacta) ──────────────────────── */
function TallerLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#f97316" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Llave inglesa */}
      <path
        d="M19 45 L37 27 M37 27 C39 23 44 21 47 23 C45 25 43 25 42 27 C41 29 42 31 44 31 C42 33 39 33 37 31 C35 29 35 26 37 27Z"
        stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <circle cx="21" cy="43" r="3" fill="#fff" />
    </svg>
  );
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/vehicles', icon: Car, label: 'Vehículos' },
  { to: '/jobs', icon: Wrench, label: 'Trabajos' },
  { to: '/quotes', icon: FileText, label: 'Presupuestos' },
];

const adminItems = [
  { to: '/settings', icon: Settings, label: 'Configuración' },
];

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-orange-500 text-white shadow-md shadow-orange-900/40'
            : 'text-slate-400 hover:bg-white/8 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-500 group-hover:text-orange-400')} />
          <span className="flex-1">{label}</span>
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70" />}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <aside
      className="w-64 min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0d1b2e 0%, #0f2035 60%, #0a1628 100%)' }}
    >
      {/* ── Línea de acento superior ── */}
      <div className="h-0.5 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />

      {/* ── Logo / Nombre del taller ── */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <TallerLogo />
          <div>
            <h1 className="font-black text-white text-base leading-tight tracking-tight">El Cordobés</h1>
            <p className="text-orange-400 text-[10px] font-semibold uppercase tracking-widest mt-0.5">
              Taller Automotriz
            </p>
          </div>
        </div>
      </div>

      {/* ── Usuario logueado ── */}
      <div className="px-4 py-3 border-b border-white/8 mx-3 mt-3 rounded-xl bg-white/4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-orange-900/40 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {isAdmin ? 'Administrador' : 'Operador'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Navegación principal ── */}
      <nav className="flex-1 px-3 pt-4 pb-2 space-y-0.5">
        {navItems.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} end={to === '/'} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Administración
              </p>
            </div>
            {adminItems.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon} label={label} />
            ))}
          </>
        )}
      </nav>

      {/* ── Separador decorativo ── */}
      <div className="mx-4 mb-2 h-px bg-white/6" />

      {/* ── Cerrar sesión ── */}
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 group"
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:text-red-400 transition-colors" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
