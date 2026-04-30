import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi, vehiclesApi } from '@/lib/api';
import { BRAND_NAMES, getModels } from '@/lib/car-brands';
import { clientFullName } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import {
  Plus, Search, Edit, Trash2, Eye, Car,
  ChevronLeft, ChevronRight, ChevronDown, User, Phone, Mail, CreditCard,
} from 'lucide-react';

/* ── Formularios vacíos ─────────────────────────────────────────── */
const EMPTY_CLIENT  = { firstName: '', lastName: '', dni: '', phone: '', phone2: '', email: '', address: '', notes: '' };
const EMPTY_VEHICLE = { clientId: '', brand: '', model: '', year: '', plate: '', mileage: '', chassisNumber: '', engineNumber: '', color: '', notes: '' };

/* ── Autocomplete genérico (marcas / modelos) ───────────────────── */
function Autocomplete({ value, onChange, options, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const filtered = query.length > 0
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : options.slice(0, 12);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function select(opt) { setQuery(opt); onChange(opt); setOpen(false); }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <Input value={query} placeholder={placeholder} className="pr-8"
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map((opt, i) => (
            <button key={i} type="button" onMouseDown={e => { e.preventDefault(); select(opt); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 border-b last:border-0">
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Iniciales para el avatar ───────────────────────────────────── */
function Avatar({ firstName, lastName }) {
  const ini = `${(lastName || '')[0] || ''}${(firstName || '')[0] || ''}`.toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
      {ini || <User className="h-4 w-4" />}
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────── */
export default function Clients() {
  const [clients,    setClients]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(false);

  // Dialogs
  const [cDialog,   setCDialog]   = useState(null); // null | 'create' | 'edit'
  const [vDialog,   setVDialog]   = useState(null); // null | 'create' | 'edit'
  const [selClient, setSelClient] = useState(null);
  const [selVehicle,setSelVehicle]= useState(null);
  const [cForm,     setCForm]     = useState(EMPTY_CLIENT);
  const [vForm,     setVForm]     = useState(EMPTY_VEHICLE);
  const [saving,    setSaving]    = useState(false);
  // Modo km: 'set' = ingresar nuevo total | 'add' = sumar al total actual
  const [kmMode,    setKmMode]    = useState('set');
  const [kmInput,   setKmInput]   = useState('');

  const navigate = useNavigate();
  const models = getModels(vForm.brand);

  /* ── Fetch ── */
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clientsApi.list({ search, page, limit: 15 });
      setClients(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { setPage(1); }, [search]);

  /* ── Cliente dialogs ── */
  function openNewClient()  { setCForm(EMPTY_CLIENT); setSelClient(null); setCDialog('create'); }
  function openEditClient(c){ setCForm({ ...c }); setSelClient(c); setCDialog('edit'); }
  function closeCDialog()   { setCDialog(null); setSelClient(null); }

  async function saveClient() {
    if (!cForm.firstName || !cForm.lastName) {
      toast({ title: 'Nombre y apellido son requeridos', variant: 'error' }); return;
    }
    setSaving(true);
    try {
      if (cDialog === 'create') {
        await clientsApi.create(cForm);
        toast({ title: 'Cliente creado', variant: 'success' });
      } else {
        await clientsApi.update(selClient.id, cForm);
        toast({ title: 'Cliente actualizado', variant: 'success' });
      }
      closeCDialog(); fetchClients();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  async function deleteClient(c) {
    if (!confirm(`¿Eliminar a ${c.firstName} ${c.lastName}? Se eliminará también el historial.`)) return;
    try {
      await clientsApi.delete(c.id);
      toast({ title: 'Cliente eliminado', variant: 'success' });
      fetchClients();
    } catch { toast({ title: 'Error al eliminar', variant: 'error' }); }
  }

  /* ── Vehículo dialogs ── */
  function openNewVehicle(clientId = '') {
    setVForm({ ...EMPTY_VEHICLE, clientId: String(clientId) });
    setSelVehicle(null);
    setKmMode('set');
    setKmInput('');
    setVDialog('create');
  }
  function openEditVehicle(v) {
    setVForm({
      ...v,
      clientId:      String(v.clientId),
      year:          v.year          ? String(v.year)          : '',
      mileage:       v.mileage       ? String(v.mileage)       : '',
      chassisNumber: v.chassisNumber || '',
      engineNumber:  v.engineNumber  || '',
      color:         v.color         || '',
      notes:         v.notes         || '',
    });
    setSelVehicle(v);
    setKmMode('set');
    setKmInput('');
    setVDialog('edit');
  }
  function closeVDialog() { setVDialog(null); setSelVehicle(null); setKmMode('set'); setKmInput(''); }
  function setV(name, value) { setVForm(f => ({ ...f, [name]: value })); }

  async function saveVehicle() {
    if (!vForm.clientId || !vForm.brand || !vForm.model) {
      toast({ title: 'Cliente, marca y modelo son requeridos', variant: 'error' }); return;
    }
    // Calcular mileage final según modo
    let finalMileage = vForm.mileage;
    if (kmMode === 'add' && kmInput) {
      const base = parseInt(selVehicle?.mileage || 0);
      const added = parseInt(kmInput || 0);
      finalMileage = String(base + added);
    }
    setSaving(true);
    try {
      const payload = { ...vForm, mileage: finalMileage };
      if (vDialog === 'create') {
        await vehiclesApi.create(payload);
        toast({ title: 'Vehículo creado', variant: 'success' });
      } else {
        await vehiclesApi.update(selVehicle.id, payload);
        toast({ title: 'Vehículo actualizado', variant: 'success' });
      }
      closeVDialog(); fetchClients();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  async function deleteVehicle(v) {
    if (!confirm(`¿Eliminar el vehículo ${v.plate || `${v.brand} ${v.model}`}?`)) return;
    try {
      await vehiclesApi.delete(v.id);
      toast({ title: 'Vehículo eliminado', variant: 'success' });
      fetchClients();
    } catch { toast({ title: 'Error al eliminar', variant: 'error' }); }
  }

  /* ── Render ── */
  return (
    <div>
      <PageHeader
        title="Clientes y Vehículos"
        description={`${total} clientes registrados`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openNewVehicle()}>
              <Car className="h-4 w-4" />Nuevo vehículo
            </Button>
            <Button onClick={openNewClient}>
              <Plus className="h-4 w-4" />Nuevo cliente
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 bg-white h-11"
            placeholder="Buscar por nombre, DNI, teléfono, email o patente..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {search ? `Sin resultados para "${search}"` : 'No hay clientes registrados'}
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map(c => (
              <Card key={c.id} className="border-0 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-150">
                <CardContent className="p-0">

                  {/* ── Fila del cliente ── */}
                  <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                    <Avatar firstName={c.firstName} lastName={c.lastName} />

                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-slate-800 text-base leading-tight hover:text-primary cursor-pointer hover:underline"
                        onClick={() => navigate(`/clients/${c.id}`)}
                      >
                        {clientFullName(c)}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {c.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" />{c.phone}
                            {c.phone2 && ` / ${c.phone2}`}
                          </span>
                        )}
                        {c.dni && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <CreditCard className="h-3 w-3" />{c.dni}
                          </span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />{c.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones del cliente */}
                    <div className="flex gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/clients/${c.id}`)} title="Ver detalle">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEditClient(c)} title="Editar cliente">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteClient(c)}
                        className="text-destructive hover:text-destructive" title="Eliminar cliente">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* ── Vehículos del cliente ── */}
                  {(c.vehicles.length > 0 || true) && (
                    <div className="border-t border-slate-100 mx-4">
                      {c.vehicles.map((v, idx) => (
                        <div key={v.id}
                          className={`flex items-center gap-3 py-2.5 ${idx < c.vehicles.length - 1 ? 'border-b border-slate-100' : ''}`}
                        >
                          {/* Icono auto */}
                          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                            <Car className="h-3.5 w-3.5 text-orange-600" />
                          </div>

                          {/* Info del vehículo — clickeable */}
                          <div
                            className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0 cursor-pointer hover:text-primary group"
                            onClick={() => navigate(`/vehicles/${v.id}`)}
                          >
                            {v.plate && (
                              <span className="font-mono font-bold text-sm text-slate-800 group-hover:text-primary">{v.plate}</span>
                            )}
                            <span className="text-sm text-slate-600 group-hover:text-primary">{v.brand} {v.model}</span>
                            {v.year  && <span className="text-xs text-slate-400">{v.year}</span>}
                            {v.color && <span className="text-xs text-slate-400">· {v.color}</span>}
                            {v.mileage && (
                              <span className="text-xs text-slate-400">
                                · {Number(v.mileage).toLocaleString('es-AR')} km
                              </span>
                            )}
                          </div>

                          {/* Acciones del vehículo */}
                          <div className="flex gap-0.5 shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/vehicles/${v.id}`)} title="Ver vehículo">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEditVehicle(v)} title="Editar vehículo">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteVehicle(v)}
                              className="text-destructive hover:text-destructive" title="Eliminar vehículo">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Botón agregar vehículo */}
                      <div className="py-2">
                        <button onClick={() => openNewVehicle(c.id)}
                          className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors">
                          <Plus className="h-3 w-3" />Agregar vehículo
                        </button>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Página {page} de {totalPages} — {total} clientes</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ════════ Dialog CLIENTE ════════ */}
      <Dialog open={!!cDialog} onClose={closeCDialog}>
        <DialogContent onClose={closeCDialog}>
          <DialogHeader>
            <DialogTitle>{cDialog === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input name="firstName" className="mt-1" value={cForm.firstName}
                onChange={e => setCForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Apellido *</label>
              <Input name="lastName" className="mt-1" value={cForm.lastName}
                onChange={e => setCForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">DNI / CUIT</label>
              <Input name="dni" className="mt-1" value={cForm.dni}
                onChange={e => setCForm(f => ({ ...f, dni: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input name="phone" className="mt-1" value={cForm.phone}
                onChange={e => setCForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono alternativo</label>
              <Input name="phone2" className="mt-1" value={cForm.phone2}
                onChange={e => setCForm(f => ({ ...f, phone2: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" className="mt-1" value={cForm.email}
                onChange={e => setCForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input name="address" className="mt-1" value={cForm.address}
                onChange={e => setCForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea name="notes" className="mt-1" rows={2} value={cForm.notes}
                onChange={e => setCForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCDialog}>Cancelar</Button>
            <Button onClick={saveClient} loading={saving}>Guardar cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ Dialog VEHÍCULO ════════ */}
      <Dialog open={!!vDialog} onClose={closeVDialog}>
        <DialogContent onClose={closeVDialog}>
          <DialogHeader>
            <DialogTitle>{vDialog === 'create' ? 'Nuevo vehículo' : 'Editar vehículo'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">

            {/* Propietario — select simple con los clientes ya cargados */}
            <div className="col-span-2">
              <label className="text-sm font-medium">Propietario *</label>
              <ClientSelect
                value={vForm.clientId}
                onChange={id => setV('clientId', id)}
              />
            </div>

            {/* Marca */}
            <div>
              <label className="text-sm font-medium">Marca *</label>
              <Autocomplete className="mt-1" value={vForm.brand} options={BRAND_NAMES}
                placeholder="Ej: Volkswagen"
                onChange={v => { setV('brand', v); setV('model', ''); }}
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="text-sm font-medium">Modelo *</label>
              {models.length > 0 ? (
                <Autocomplete className="mt-1" value={vForm.model} options={models}
                  placeholder="Ej: Gol" onChange={v => setV('model', v)} />
              ) : (
                <Input className="mt-1" placeholder="Modelo" value={vForm.model}
                  onChange={e => setV('model', e.target.value)} />
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Año</label>
              <Input className="mt-1" type="number" placeholder="2020" min="1950" max="2030"
                value={vForm.year} onChange={e => setV('year', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Patente</label>
              <Input className="mt-1 uppercase" placeholder="ABC123 / AA123BB"
                value={vForm.plate} onChange={e => setV('plate', e.target.value.toUpperCase())} />
            </div>
            {/* ── Kilometraje con modo set/add ── */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Kilometraje</label>
                {vDialog === 'edit' && selVehicle?.mileage && (
                  <div className="flex rounded-lg border overflow-hidden text-xs">
                    <button type="button"
                      onClick={() => { setKmMode('set'); setKmInput(''); }}
                      className={`px-3 py-1 font-medium transition-colors ${kmMode === 'set' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >Nuevo total</button>
                    <button type="button"
                      onClick={() => { setKmMode('add'); setV('mileage', String(selVehicle.mileage)); }}
                      className={`px-3 py-1 font-medium transition-colors ${kmMode === 'add' ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >Agregar recorrido</button>
                  </div>
                )}
              </div>
              {kmMode === 'set' ? (
                <Input className="mt-1" type="number" placeholder="0" min="0"
                  value={vForm.mileage} onChange={e => setV('mileage', e.target.value)} />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-50 border rounded-md px-3 py-2 text-sm">
                    <span className="text-slate-400">Km actuales:</span>
                    <span className="font-semibold text-slate-700">
                      {Number(selVehicle?.mileage || 0).toLocaleString('es-AR')} km
                    </span>
                  </div>
                  <Input type="number" placeholder="Km recorridos a sumar..." min="0"
                    value={kmInput} onChange={e => setKmInput(e.target.value)} />
                  {kmInput && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Nuevo total: {(parseInt(selVehicle?.mileage || 0) + parseInt(kmInput || 0)).toLocaleString('es-AR')} km
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <Input className="mt-1" placeholder="Blanco, Negro..."
                value={vForm.color} onChange={e => setV('color', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">N° de chasis</label>
              <Input className="mt-1" value={vForm.chassisNumber}
                onChange={e => setV('chassisNumber', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">N° de motor</label>
              <Input className="mt-1" value={vForm.engineNumber}
                onChange={e => setV('engineNumber', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea className="mt-1" rows={2} value={vForm.notes}
                onChange={e => setV('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeVDialog}>Cancelar</Button>
            <Button onClick={saveVehicle} loading={saving}>Guardar vehículo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Selector de cliente con búsqueda (usado en el dialog de vehículo) ── */
function ClientSelect({ value, onChange }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [display, setDisplay] = useState('');
  const ref = useRef(null);

  // Si llega un value inicial (al editar), buscar el nombre
  useEffect(() => {
    if (value && !display) {
      clientsApi.get(value)
        .then(r => setDisplay(clientFullName(r.data)))
        .catch(() => {});
    }
    if (!value) { setDisplay(''); }
  }, [value]);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      clientsApi.list({ search: query, limit: 10 })
        .then(r => setResults(r.data.data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Si hay display (cliente elegido), mostrar chip con X
  if (display) {
    return (
      <div className="flex items-center gap-2 mt-1 border rounded-md px-3 py-2 bg-slate-50">
        <User className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="flex-1 text-sm font-medium">{display}</span>
        <button type="button" onClick={() => { setDisplay(''); onChange(''); setQuery(''); }}
          className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mt-1">
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-ring">
        <User className="h-4 w-4 text-slate-400 shrink-0" />
        <input type="text" placeholder="Buscar por nombre, DNI o teléfono..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {loading && <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin shrink-0" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map(c => (
            <button key={c.id} type="button"
              onMouseDown={() => { onChange(String(c.id)); setDisplay(clientFullName(c)); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2.5 hover:bg-orange-50 border-b last:border-0 transition-colors">
              <p className="text-sm font-medium">{clientFullName(c)}</p>
              <p className="text-xs text-muted-foreground">{[c.phone, c.dni && `DNI ${c.dni}`].filter(Boolean).join(' · ')}</p>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border rounded-lg shadow-xl px-4 py-3 text-sm text-muted-foreground">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  );
}
