import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WorkshopLogo } from '@/components/ui/WorkshopLogo';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDate, JOB_STATUS, QUOTE_STATUS, clientFullName, vehicleLabel } from '@/lib/utils';
import { Users, Wrench, FileText, TrendingUp, Search, Car, Calendar } from 'lucide-react';

/* ── Imágenes de autos de lujo — Unsplash ───────────────────────── */
const CAR_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=90&fit=crop&crop=bottom',
    pos: 'center 65%',
    label: 'Porsche 911',
  },
  {
    url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1400&q=90&fit=crop&crop=center',
    pos: 'center 60%',
    label: 'Ferrari',
  },
  {
    url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1400&q=90&fit=crop&crop=bottom',
    pos: 'center 70%',
    label: 'BMW M3',
  },
  {
    url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1400&q=90&fit=crop&crop=bottom',
    pos: 'center 75%',
    label: 'Luxury',
  },
  {
    url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1400&q=90&fit=crop&crop=bottom',
    pos: 'center 60%',
    label: 'Supercar',
  },
];

/* ── Stat card ─────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, colorBg, colorIcon, colorAccent }) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className={`h-1 ${colorAccent}`} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-4xl font-black text-slate-900 mt-1.5 tabular-nums">{value ?? '—'}</p>
          </div>
          <div className={`rounded-2xl p-3.5 ${colorBg} shrink-0 group-hover:scale-110 transition-transform duration-200`}>
            <Icon className={`h-5 w-5 ${colorIcon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Hero banner con imagen de auto rotante ────────────────────── */
function HeroBanner({ workshopName = 'El Cordobés' }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [fade, setFade]     = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setImgIdx(i => (i + 1) % CAR_IMAGES.length);
        setFade(true);
      }, 450);
    }, 7000);
    return () => clearInterval(t);
  }, []);

  const current = CAR_IMAGES[imgIdx];
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="relative h-72 rounded-2xl overflow-hidden shadow-lg mb-6">

      {/* ── Imagen de fondo ── */}
      <div
        className="absolute inset-0 bg-cover transition-opacity duration-500"
        style={{
          backgroundImage: `url(${current.url})`,
          backgroundPosition: current.pos,
          opacity: fade ? 1 : 0,
        }}
      />

      {/* ── Overlay: más oscuro a la izquierda, transparente a la derecha ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/95 via-[#0a1628]/55 to-[#0a1628]/10" />
      {/* Overlay inferior para texto legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/60 via-transparent to-transparent" />

      {/* ── Contenido ── */}
      <div className="relative h-full flex flex-col justify-between px-8 py-6">
        {/* Cabecera: logo + nombre */}
        <div className="flex items-center gap-4">
          <WorkshopLogo size={52} uid="banner" />
          <div>
            <h2 className="text-white font-black text-2xl leading-tight tracking-tight">
              {workshopName}
            </h2>
            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mt-0.5">
              Taller Automotriz
            </p>
          </div>
        </div>

        {/* Pie: fecha + nombre del auto */}
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span className="capitalize">{today}</span>
          </div>
          <span className="text-white/30 text-xs font-medium tracking-widest uppercase">
            {current.label}
          </span>
        </div>
      </div>

      {/* ── Indicadores (dots) ── */}
      <div className="absolute bottom-4 right-5 flex gap-1.5">
        {CAR_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setFade(false); setTimeout(() => { setImgIdx(i); setFade(true); }, 300); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === imgIdx ? 'bg-orange-400 w-5' : 'bg-white/35 w-1.5 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────────── */
export default function Dashboard() {
  const [data,          setData]          = useState(null);
  const [loadError,     setLoadError]     = useState(false);
  const [search,        setSearch]        = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching,     setSearching]     = useState(false);
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

  /* ── Loading / Error ── */
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  const { stats, recentJobs, recentQuotes } = data;

  /* Filtrar histórico SPC-GE */
  const filteredJobs = recentJobs.filter(j => !j.description?.includes('SPC-GE'));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Resumen del taller — ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      <div className="p-6 space-y-6">

        {/* ── Banner ── */}
        <HeroBanner />

        {/* ── Búsqueda global ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          )}
          <Input
            className="pl-10 bg-white shadow-sm h-11"
            placeholder="Buscar cliente, patente, teléfono o DNI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Resultados */}
          {searchResults && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-10 mt-1.5 max-h-80 overflow-y-auto">
              {searchResults.clients.length === 0 && searchResults.vehicles.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Sin resultados para "{search}"</p>
              ) : (
                <>
                  {searchResults.clients.map(c => (
                    <button key={c.id}
                      onClick={() => { navigate(`/clients/${c.id}`); setSearch(''); setSearchResults(null); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b last:border-0 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{clientFullName(c)}</p>
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b last:border-0 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Car className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{vehicleLabel(v)}</p>
                        <p className="text-xs text-muted-foreground">{clientFullName(v.client)}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Clientes activos"
            value={stats.totalClients}
            colorBg="bg-blue-100"
            colorIcon="text-blue-600"
            colorAccent="bg-blue-500"
          />
          <StatCard
            icon={Wrench}
            label="Pendientes"
            value={stats.pendingJobs}
            colorBg="bg-amber-100"
            colorIcon="text-amber-600"
            colorAccent="bg-amber-500"
          />
          <StatCard
            icon={Wrench}
            label="En proceso"
            value={stats.inProgressJobs}
            colorBg="bg-orange-100"
            colorIcon="text-orange-600"
            colorAccent="bg-orange-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Trabajos este mes"
            value={stats.monthlyJobs}
            colorBg="bg-emerald-100"
            colorIcon="text-emerald-600"
            colorAccent="bg-emerald-500"
          />
        </div>

        {/* ── Listas ── */}
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
            <CardContent className="pt-1 pb-1">
              <div className="divide-y">
                {filteredJobs.slice(0, 6).map(job => (
                  <button key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                    className="w-full flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                      <Wrench className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {job.vehicle?.client?.lastName}, {job.vehicle?.client?.firstName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {job.vehicle?.plate || `${job.vehicle?.brand} ${job.vehicle?.model}`}
                        {job.description ? ` · ${job.description}` : ''}
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
                {filteredJobs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin trabajos recientes</p>
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
            <CardContent className="pt-1 pb-1">
              <div className="divide-y">
                {recentQuotes.map(q => (
                  <button key={q.id} onClick={() => navigate(`/quotes/${q.id}`)}
                    className="w-full flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {q.client?.lastName}, {q.client?.firstName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {q.number} · {q.vehicle?.plate || 'Sin patente'} · {formatCurrency(q.total)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${QUOTE_STATUS[q.status]?.color}`}>
                      {QUOTE_STATUS[q.status]?.label}
                    </span>
                  </button>
                ))}
                {recentQuotes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin presupuestos activos</p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
