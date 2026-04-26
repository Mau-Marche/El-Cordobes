import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jobsApi, vehiclesApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Plus, Search, Edit, Trash2, Eye, Paperclip, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate, JOB_STATUS } from '@/lib/utils';

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
  const [vehicles, setVehicles] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    vehiclesApi.list({ limit: 200, search: vehicleSearch }).then(r => setVehicles(r.data.data));
  }, [vehicleSearch]);

  function openCreate() { setForm(EMPTY_FORM); setSelected(null); setDialog('create'); }

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
    setDialog('edit');
  }

  function closeDialog() { setDialog(null); setSelected(null); }
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
                        <Select
                          className="h-7 text-xs w-36"
                          value={j.status}
                          onChange={e => handleStatusChange(j, e.target.value)}
                        >
                          <option value="PENDING">Pendiente</option>
                          <option value="IN_PROGRESS">En proceso</option>
                          <option value="FINISHED">Finalizado</option>
                          <option value="DELIVERED">Entregado</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/jobs/${j.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(j)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(j)} className="text-destructive hover:text-destructive">
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
                <Select className="mt-1" value={form.vehicleId} onChange={e => setField('vehicleId', e.target.value)}>
                  <option value="">Seleccionar vehículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.client?.lastName}, {v.client?.firstName} — {v.brand} {v.model}{v.plate ? ` (${v.plate})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" className="mt-1" value={form.date} onChange={e => setField('date', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select className="mt-1" value={form.status} onChange={e => setField('status', e.target.value)}>
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En proceso</option>
                  <option value="FINISHED">Finalizado</option>
                  <option value="DELIVERED">Entregado</option>
                </Select>
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
                <Textarea className="mt-1" rows={2} value={form.description} onChange={e => setField('description', e.target.value)} />
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
