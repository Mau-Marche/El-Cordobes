import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jobsApi, vehiclesApi, settingsApi } from '@/lib/api';
import { DescriptionSearch } from '@/components/ui/DescriptionSearch';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, StatusSelect } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Plus, Search, Edit, Trash2, Eye, Printer, FileText, X, ChevronLeft, ChevronRight, Car } from 'lucide-react';
import { formatCurrency, formatDate, JOB_STATUS } from '@/lib/utils';
import { buildPrintHTML } from '@/lib/printQuote';

const EMPTY_FORM = { vehicleId: '', date: new Date().toISOString().slice(0, 10), description: '', mileageIn: '', mileageOut: '', laborCost: '0', status: 'PENDING', notes: '', items: [] };
const EMPTY_ITEM = { description: '', quantity: '1', unitPrice: '', subtotal: '0' };

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // Buscador de vehículo en el dialog
  const [vehicleQuery, setVehicleQuery]     = useState('');
  const [vehicleResults, setVehicleResults] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleSelected, setVehicleSelected] = useState(null); // { id, label }
  const [saving, setSaving] = useState(false);
  const [printingId, setPrintingId] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const navigate = useNavigate();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await jobsApi.list({ search, page, limit: 20, status: statusFilter });
      setJobs(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }, [search, page, statusFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Búsqueda debounced de vehículos (solo cuando hay 2+ caracteres)
  useEffect(() => {
    if (!vehicleQuery || vehicleQuery.length < 2) { setVehicleResults([]); return; }
    const t = setTimeout(async () => {
      setVehicleLoading(true);
      try {
        const { data } = await vehiclesApi.list({ search: vehicleQuery, limit: 10 });
        setVehicleResults(data.data || []);
      } finally { setVehicleLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [vehicleQuery]);

  function clearVehicleSearch() { setVehicleQuery(''); setVehicleResults([]); setVehicleSelected(null); }

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelected(null);
    clearVehicleSearch();
    setDialog('create');
  }

  async function openEdit(j) {
    const { data } = await jobsApi.get(j.id);
    setForm({
      vehicleId: String(data.vehicleId),
      date: data.date.slice(0, 10),
      description: data.description,
      mileageIn: data.mileageIn || '',
      mileageOut: data.mileageOut || '',
      laborCost: String(data.laborCost),
      status: data.status,
      notes: data.notes || '',
      items: data.items.map(i => ({
        description: i.description,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPrice),
        subtotal: String(i.subtotal),
      })),
    });
    setSelected(data);
    clearVehicleSearch();
    if (data.vehicle) {
      const v = data.vehicle;
      setVehicleSelected({
        id: v.id,
        label: `${v.client?.lastName ?? ''}, ${v.client?.firstName ?? ''} — ${v.brand} ${v.model}${v.plate ? ` (${v.plate})` : ''}`.trim(),
      });
    }
    setDialog('edit');
  }

  function closeDialog() { setDialog(null); setSelected(null); clearVehicleSearch(); }
  function setField(name, value) { setForm(f => ({ ...f, [name]: value })); }

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] })); }
  function removeItem(idx) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })); }
  function updateItem(idx, field, value) {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = parseFloat(items[idx].quantity) || 0;
        const price = parseFloat(items[idx].unitPrice) || 0;
        items[idx].subtotal = String((qty * price).toFixed(2));
      }
      return { ...f, items };
    });
  }

  const itemsTotal = form.items.reduce((acc, i) => acc + (parseFloat(i.subtotal) || 0), 0);
  const grandTotal = itemsTotal + (parseFloat(form.laborCost) || 0);

  async function handleSave() {
    if (!form.vehicleId || !form.description) {
      toast({ title: 'Vehículo y descripción son requeridos', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (dialog === 'create') {
        await jobsApi.create({ ...form, total: grandTotal });
        toast({ title: 'Trabajo registrado', variant: 'success' });
      } else {
        await jobsApi.update(selected.id, { ...form, total: grandTotal });
        toast({ title: 'Trabajo actualizado', variant: 'success' });
      }
      closeDialog();
      fetchJobs();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  async function handleToQuote(jobId) {
    setConvertingId(jobId);
    try {
      const { data: quote } = await jobsApi.toQuote(jobId);
      toast({ title: 'Presupuesto creado', variant: 'success' });
      navigate('/quotes', { state: { openQuoteId: quote.id } });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al crear presupuesto', variant: 'error' });
    } finally { setConvertingId(null); }
  }

  async function handlePrint(jobId) {
    setPrintingId(jobId);
    try {
      const [{ data: quote }, { data: workshop }] = await Promise.all([
        jobsApi.toQuote(jobId),
        settingsApi.get(),
      ]);
      const html = buildPrintHTML(quote, workshop, { docTitle: 'Comprobante', mileageIn: quote._jobMileageIn });
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { toast({ title: 'El navegador bloqueó la ventana. Permitila para imprimir.', variant: 'error' }); return; }
      win.document.write(html);
      win.document.close();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al generar comprobante', variant: 'error' });
    } finally { setPrintingId(null); }
  }

  async function handleDelete(j) {
    if (!confirm('¿Eliminar este trabajo?')) return;
    try {
      await jobsApi.delete(j.id);
      toast({ title: 'Trabajo eliminado', variant: 'success' });
      fetchJobs();
    } catch {
      toast({ title: 'Error al eliminar', variant: 'error' });
    }
  }

  async function handleStatusChange(j, newStatus) {
    try {
      await jobsApi.update(j.id, { status: newStatus });
      toast({ title: 'Estado actualizado', variant: 'success' });
      fetchJobs();
    } catch {
      toast({ title: 'Error al actualizar estado', variant: 'error' });
    }
  }

  return (
    <div>
      <PageHeader
        title="Trabajos"
        description={`${total} trabajos registrados`}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo trabajo</Button>}
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 bg-white" placeholder="Buscar por descripción, patente o cliente..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select className="w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="IN_PROGRESS">En proceso</option>
            <option value="FINISHED">Finalizado</option>
            <option value="DELIVERED">Entregado</option>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Sin trabajos</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente / Vehículo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-36">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(j => (
                    <TableRow key={j.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{j.vehicle.client.lastName}, {j.vehicle.client.firstName}</p>
                        <p className="text-xs text-muted-foreground">{j.vehicle.plate || `${j.vehicle.brand} ${j.vehicle.model}`}</p>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{j.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(j.date)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(j.totalCost)}</TableCell>
                      <TableCell>
                        <StatusSelect
                          value={j.status}
                          onChange={e => handleStatusChange(j, e.target.value)}
                          options={[
                            { value: 'PENDING',     label: 'Pendiente'  },
                            { value: 'IN_PROGRESS', label: 'En proceso' },
                            { value: 'FINISHED',    label: 'Finalizado' },
                            { value: 'DELIVERED',   label: 'Entregado'  },
                          ]}
                          className="w-36 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/jobs/${j.id}`)} title="Ver ficha">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(j)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleToQuote(j.id)} title="Pasar a presupuesto"
                            disabled={convertingId === j.id} className="text-blue-600 hover:text-blue-700">
                            {convertingId === j.id
                              ? <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              : <FileText className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handlePrint(j.id)} title="Imprimir comprobante directo"
                            disabled={printingId === j.id} className="text-orange-600 hover:text-orange-700">
                            {printingId === j.id
                              ? <div className="h-4 w-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                              : <Printer className="h-4 w-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(j)} className="text-destructive hover:text-destructive" title="Eliminar">
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

      {/* Dialog */}
      <Dialog open={!!dialog} onClose={closeDialog}>
        <DialogContent onClose={closeDialog} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialog === 'create' ? 'Nuevo trabajo' : 'Editar trabajo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium">Vehículo *</label>
                {vehicleSelected ? (
                  /* Vehículo ya seleccionado → mostrar chip con opción de limpiar */
                  <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Car className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-medium text-blue-800 flex-1 truncate">{vehicleSelected.label}</span>
                    <button
                      type="button"
                      onClick={() => { clearVehicleSearch(); setField('vehicleId', ''); }}
                      className="text-blue-400 hover:text-blue-700 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  /* Buscador */
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    {vehicleLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <Input
                      className="pl-9"
                      placeholder="Buscar por patente, nombre o marca..."
                      value={vehicleQuery}
                      onChange={e => setVehicleQuery(e.target.value)}
                      autoFocus
                    />
                    {vehicleResults.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {vehicleResults.map(v => (
                          <button
                            key={v.id}
                            type="button"
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left border-b last:border-0"
                            onClick={() => {
                              const label = `${v.client?.lastName ?? ''}, ${v.client?.firstName ?? ''} — ${v.brand} ${v.model}${v.plate ? ` (${v.plate})` : ''}`.trim();
                              setVehicleSelected({ id: v.id, label });
                              setField('vehicleId', String(v.id));
                              setVehicleQuery('');
                              setVehicleResults([]);
                            }}
                          >
                            <Car className="h-4 w-4 text-slate-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{v.brand} {v.model}{v.plate ? ` — ${v.plate}` : ''}</p>
                              <p className="text-xs text-slate-400">{v.client?.lastName}, {v.client?.firstName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {vehicleQuery.length >= 2 && !vehicleLoading && vehicleResults.length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">Sin resultados para "{vehicleQuery}"</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" className="mt-1" value={form.date} onChange={e => setField('date', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <StatusSelect
                  className="mt-1 w-full"
                  value={form.status}
                  onChange={e => setField('status', e.target.value)}
                  options={[
                    { value: 'PENDING',     label: 'Pendiente'  },
                    { value: 'IN_PROGRESS', label: 'En proceso' },
                    { value: 'FINISHED',    label: 'Finalizado' },
                    { value: 'DELIVERED',   label: 'Entregado'  },
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Km entrada</label>
                <Input type="number" className="mt-1" value={form.mileageIn} onChange={e => setField('mileageIn', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Km salida</label>
                <Input type="number" className="mt-1" value={form.mileageOut} onChange={e => setField('mileageOut', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Descripción del trabajo *</label>
                <DescriptionSearch
                  value={form.description}
                  onChange={v => setField('description', v)}
                />
              </div>
            </div>

            {/* Repuestos/ítems */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Repuestos utilizados</label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3" />Agregar</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input placeholder="Descripción" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Cant." min="0" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Precio" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input readOnly value={formatCurrency(parseFloat(item.subtotal) || 0)} className="bg-gray-50 text-right text-xs" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} className="text-destructive h-8 w-8"><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-sm font-medium">Mano de obra</label>
                <Input type="number" min="0" step="0.01" className="mt-1" value={form.laborCost} onChange={e => setField('laborCost', e.target.value)} />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
