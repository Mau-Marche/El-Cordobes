import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehiclesApi, clientsApi } from '@/lib/api';
import { BRAND_NAMES, getModels } from '@/lib/car-brands';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const EMPTY = {
  clientId: '', brand: '', model: '', year: '', plate: '',
  mileage: '', chassisNumber: '', engineNumber: '', color: '', notes: '',
};

/* ── Autocomplete de texto con lista de sugerencias ────────────── */
function Autocomplete({ value, onChange, options, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef(null);

  // Sincronizar cuando cambia el valor externo
  useEffect(() => { setQuery(value || ''); }, [value]);

  const filtered = query.length > 0
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : options.slice(0, 12);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(opt) {
    setQuery(opt);
    onChange(opt);
    setOpen(false);
  }

  function handleInput(e) {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pr-8"
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map((opt, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(opt); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 border-b last:border-0 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Buscador de cliente con autocomplete ───────────────────────── */
function ClientSearch({ clients, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedClient = clients.find(c => String(c.id) === String(value));
  const displayName = selectedClient ? `${selectedClient.lastName}, ${selectedClient.firstName}` : '';

  useEffect(() => { setQuery(displayName); }, [displayName]);

  const filtered = query.length > 0
    ? clients.filter(c =>
        `${c.lastName} ${c.firstName}`.toLowerCase().includes(query.toLowerCase()) ||
        (c.phone || '').includes(query) ||
        (c.dni || '').includes(query)
      ).slice(0, 10)
    : clients.slice(0, 10);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(c) {
    onChange(String(c.id));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(''); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente por nombre, DNI o teléfono..."
          className="pr-8"
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.length > 0 ? filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(c); }}
              className="w-full text-left px-3 py-2.5 hover:bg-orange-50 border-b last:border-0 transition-colors"
            >
              <p className="text-sm font-medium">{c.lastName}, {c.firstName}</p>
              <p className="text-xs text-muted-foreground">{c.phone && `Tel: ${c.phone}`}{c.dni && ` · DNI: ${c.dni}`}</p>
            </button>
          )) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const models = getModels(form.brand);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await vehiclesApi.list({ search, page, limit: 20 });
      setVehicles(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    clientsApi.list({ limit: 500 }).then(r => setClients(r.data.data)).catch(() => {});
  }, []);

  function openCreate() { setForm(EMPTY); setSelected(null); setDialog('create'); }
  function openEdit(v) {
    setForm({
      ...v,
      clientId: String(v.clientId),
      year: v.year ? String(v.year) : '',
      mileage: v.mileage ? String(v.mileage) : '',
      chassisNumber: v.chassisNumber || '',
      engineNumber: v.engineNumber || '',
      color: v.color || '',
      notes: v.notes || '',
    });
    setSelected(v);
    setDialog('edit');
  }
  function closeDialog() { setDialog(null); setSelected(null); }
  function set(name, value) { setForm(f => ({ ...f, [name]: value })); }

  async function handleSave() {
    if (!form.clientId || !form.brand || !form.model) {
      toast({ title: 'Cliente, marca y modelo son requeridos', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (dialog === 'create') {
        await vehiclesApi.create(form);
        toast({ title: 'Vehículo creado', variant: 'success' });
      } else {
        await vehiclesApi.update(selected.id, form);
        toast({ title: 'Vehículo actualizado', variant: 'success' });
      }
      closeDialog();
      fetchVehicles();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  async function handleDelete(v) {
    if (!confirm(`¿Eliminar el vehículo ${v.plate || `${v.brand} ${v.model}`}?`)) return;
    try {
      await vehiclesApi.delete(v.id);
      toast({ title: 'Vehículo eliminado', variant: 'success' });
      fetchVehicles();
    } catch {
      toast({ title: 'Error al eliminar', variant: 'error' });
    }
  }

  return (
    <div>
      <PageHeader
        title="Vehículos"
        description={`${total} vehículos registrados`}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo vehículo</Button>}
      />
      <div className="p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 bg-white" placeholder="Buscar por patente, marca, modelo o propietario..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Sin vehículos</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patente</TableHead>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Km</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead className="w-28">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-semibold">{v.plate || '—'}</TableCell>
                      <TableCell>{v.brand} {v.model}</TableCell>
                      <TableCell>{v.year || '—'}</TableCell>
                      <TableCell>{v.color || '—'}</TableCell>
                      <TableCell>{v.mileage ? v.mileage.toLocaleString('es-AR') : '—'}</TableCell>
                      <TableCell className="text-sm">{v.client?.lastName}, {v.client?.firstName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/vehicles/${v.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(v)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog crear/editar ── */}
      <Dialog open={!!dialog} onClose={closeDialog}>
        <DialogContent onClose={closeDialog}>
          <DialogHeader>
            <DialogTitle>{dialog === 'create' ? 'Nuevo vehículo' : 'Editar vehículo'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">

            {/* Propietario con búsqueda */}
            <div className="col-span-2">
              <label className="text-sm font-medium">Propietario *</label>
              <div className="mt-1">
                <ClientSearch clients={clients} value={form.clientId} onChange={v => set('clientId', v)} />
              </div>
            </div>

            {/* Marca con autocomplete */}
            <div>
              <label className="text-sm font-medium">Marca *</label>
              <Autocomplete
                className="mt-1"
                value={form.brand}
                options={BRAND_NAMES}
                placeholder="Ej: Volkswagen"
                onChange={v => { set('brand', v); set('model', ''); }}
              />
            </div>

            {/* Modelo: si la marca tiene modelos conocidos → autocomplete; si no → texto libre */}
            <div>
              <label className="text-sm font-medium">Modelo *</label>
              {models.length > 0 ? (
                <Autocomplete
                  className="mt-1"
                  value={form.model}
                  options={models}
                  placeholder="Ej: Gol"
                  onChange={v => set('model', v)}
                />
              ) : (
                <Input className="mt-1" placeholder="Modelo del vehículo"
                  value={form.model} onChange={e => set('model', e.target.value)} />
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Año</label>
              <Input className="mt-1" type="number" placeholder="2020" min="1950" max="2030"
                value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Patente</label>
              <Input className="mt-1 uppercase" placeholder="ABC123 / AA123BB"
                value={form.plate} onChange={e => set('plate', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="text-sm font-medium">Kilometraje</label>
              <Input className="mt-1" type="number" placeholder="0"
                value={form.mileage} onChange={e => set('mileage', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <Input className="mt-1" placeholder="Blanco, Negro..."
                value={form.color} onChange={e => set('color', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">N° de chasis</label>
              <Input className="mt-1" value={form.chassisNumber}
                onChange={e => set('chassisNumber', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">N° de motor</label>
              <Input className="mt-1" value={form.engineNumber}
                onChange={e => set('engineNumber', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea className="mt-1" rows={2} value={form.notes}
                onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Guardar vehículo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
