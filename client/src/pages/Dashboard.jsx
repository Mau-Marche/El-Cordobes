import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDate, JOB_STATUS, QUOTE_STATUS, clientFullName, vehicleLabel } from '@/lib/utils';
import { Users, Wrench, FileText, TrendingUp, Search, Car } from 'lucide-react';

/* ── Imágenes de autos de lujo via Unsplash (libres de uso) ────── */
const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80', // Porsche
  'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80', // Ferrari
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80', // BMW M3
  'https://images.unsplash.com/photo-1546614042-7df3c24c9e5d?w=800&q=80', // Lamborghini
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80', // McLaren
];

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, accent }) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className={`h-1 ${accent || color}`} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{value ?? '—'}</p>
          </div>
          <div className={`rounded-2xl p-3 ${color} opacity-90 shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Hero banner con imagen de auto rotante ────────────────────── */
function HeroBanner({ workshopName = 'El Cordobés' }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setImgIdx(i => (i + 1) % CAR_IMAGES.length);
        setFade(true);
      }, 400);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative h-44 rounded-2xl overflow-hidden shadow-md mb-6">
      {/* Imagen de fondo */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
        style={{ backgroundImage: `url(${CAR_IMAGES[imgIdx]})`, opacity: fade ? 1 : 0 }}
      />
      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/90 via-[#0a1628]/60 to-transparent" />

      {/* Contenido */}
      <div className="relative h-full flex flex-col justify-center px-8 gap-2">
        <div className="flex items-center gap-3">
          {/* Mini logo */}
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="#f97316"/>
            <path d="M19 45 L37 27 M37 27 C39 23 44 21 47 23 C45 25 43 25 42 27 C41 29 42 31 44 31 C42 33 39 33 37 31 C35 29 35 26 37 27Z"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="21" cy="43" r="3" fill="white"/>
          </svg>
          <div>
            <h2 className="text-white font-black text-xl leading-tight">{workshopName}</h2>
            <p className="text-orange-300 text-xs font-semibold uppercase tracking-widest">Taller Automotriz</p>
          </div>
        </div>
        <p className="text-white/50 text-xs max-w-xs">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Indicadores de imagen */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {CAR_IMAGES.map((_, i) => (
          <button key={i} onClick={() => setImgIdx(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-orange-400 w-4' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  function loadDashboard() {
    setLoadError(false);
    setData(null);
    dashboardApi.get()
      .then(r => setData(r.data))
      .catch(() => setLoadError(true));
  }

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (!search || search.length < 2) { setSearchResults(null); return; }
    const t = setTimeout(() => {
      setSearching(true);
      dashboardApi.search(search)
        .then(r => setSearchResults(r.data))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p className="text-sm">No se pudo conectar con el servidor. ¿Está el backend corriendo?</p>
        <button onClick={loadDashboard} className="text-sm underline hover:text-foreground transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const { stats, recentJobs, recentQuotes } = data;

  return (
    <div>
      <PageHeader title="Dashboard"
        description={`Resumen del taller — ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      <div className="p-6 space-y-6">

        {/* Banner con imagen de auto */}
        <HeroBanner />

        {/* Búsqueda rápida */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          <Input className="pl-10 bg-white shadow-sm" placeholder="Buscar cliente, patente, teléfono o DNI..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {searchResults && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-10 mt-1 max-h-80 overflow-y-auto">
              {searchResults.clients.length === 0 && searchResults.vehicles.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Sin resultados para "{search}"</p>
              ) : (
                <>
                  {searchResults.clients.map(c => (
                    <button key={c.id}
                      onClick={() => { navigate(`/clients/${c.id}`); setSearch(''); setSearchResults(null); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{clientFullName(c)}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.phone && `Tel: ${c.phone}`}
                          {c.vehicles?.map(v => ` · ${v.plate || v.brand}`).join('')}
                        </p>
                      </div>
                    </button>
                  ))}
                  {searchResults.vehicles.map(v => (
                    <button key={v.id}
                      onClick={() => { navigate(`/vehicles/${v.id}`); setSearch(''); setSearchResults(null); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Car className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{vehicleLabel(v)}</p>
                        <p className="text-xs text-muted-foreground">{clientFullName(v.client)}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}      label="Clientes activos"    value={stats.totalClients}   color="bg-blue-500"    accent="bg-blue-500" />
          <StatCard icon={Wrench}     label="Pendientes"          value={stats.pendingJobs}    color="bg-amber-500"   accent="bg-amber-500" />
          <StatCard icon={Wrench}     label="En proceso"          value={stats.inProgressJobs} color="bg-orange-500"  accent="bg-orange-500" />
          <StatCard icon={TrendingUp} label="Trabajos este mes"   value={stats.monthlyJobs}    color="bg-emerald-500" accent="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimos trabajos */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-wider">
                <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
                  <Wrench className="h-3.5 w-3.5 text-orange-600" />
                </div>
                Últimos trabajos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              <div className="divide-y">
                {recentJobs.filter(j => !j.description?.includes('SPC-GE')).slice(0, 6).map(job => (
                  <button key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                    className="w-full flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <Wrench className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {job.vehicle.client.lastName}, {job.vehicle.client.firstName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {job.vehicle.plate || `${job.vehicle.brand} ${job.vehicle.model}`} · {job.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${JOB_STATUS[job.status]?.color}`}>
                        {JOB_STATUS[job.status]?.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(job.date)}</span>
                    </div>
                  </button>
                ))}
                {recentJobs.filter(j => !j.description?.includes('SPC-GE')).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin trabajos recientes</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Presupuestos activos */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-wider">
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </div>
                Presupuestos activos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              <div className="divide-y">
                {recentQuotes.map(q => (
                  <button key={q.id} onClick={() => navigate(`/quotes/${q.id}`)}
                    className="w-full flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {q.client.lastName}, {q.client.firstName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {q.number} · {q.vehicle.plate || 'Sin patente'} · {formatCurrency(q.total)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${QUOTE_STATUS[q.status]?.color}`}>
                      {QUOTE_STATUS[q.status]?.label}
                    </span>
                  </button>
                ))}
                {recentQuotes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin presupuestos activos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
