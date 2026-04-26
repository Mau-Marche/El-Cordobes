import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Plus, Search, Edit, Trash2, Eye, Car, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const EMPTY = { firstName: '', lastName: '', dni: '', phone: '', phone2: '', email: '', address: '', notes: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clientsApi.list({ search, page, limit: 20 });
      setClients(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => { setPage(1); }, [search]);

  function openCreate() { setForm(EMPTY); setSelected(null); setDialog('create'); }
  function openEdit(c) { setForm({ ...c }); setSelected(c); setDialog('edit'); }
  function closeDialog() { setDialog(null); setSelected(null); }

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleSave() {
    if (!form.firstName || !form.lastName) {
      toast({ title: 'Nombre y apellido son requeridos', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (dialog === 'create') {
        await clientsApi.create(form);
        toast({ title: 'Cliente creado', variant: 'success' });
      } else {
        await clientsApi.update(selected.id, form);
        toast({ title: 'Cliente actualizado', variant: 'success' });
      }
      closeDialog();
      fetchClients();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  async function handleDelete(c) {
    if (!confirm(`¿Eliminar a ${c.firstName} ${c.lastName}?`)) return;
    try {
      await clientsApi.delete(c.id);
      toast({ title: 'Cliente eliminado', variant: 'success' });
      fetchClients();
    } catch {
      toast({ title: 'Error al eliminar', variant: 'error' });
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${total} clientes registrados`}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo cliente</Button>}
      />

      <div className="p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 bg-white"
            placeholder="Buscar por nombre, apellido, DNI, teléfono, email o patente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>{search ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados'}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apellido y nombre</TableHead>
                    <TableHead>DNI/CUIT</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vehículos</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.lastName}, {c.firstName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.dni || '—'}</TableCell>
                      <TableCell>{c.phone || '—'}</TableCell>
                      <TableCell className="text-sm">{c.email || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.vehicles.map(v => (
                            <span key={v.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              <Car className="h-3 w-3" />{v.plate || `${v.brand} ${v.model}`}
                            </span>
                          ))}
                          {c.vehicles.length === 0 && <span className="text-xs text-muted-foreground">Sin vehículos</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/clients/${c.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(c)} className="text-destructive hover:text-destructive">
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
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

      {/* Dialog crear/editar */}
      <Dialog open={!!dialog} onClose={closeDialog}>
        <DialogContent onClose={closeDialog}>
          <DialogHeader>
            <DialogTitle>{dialog === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Nombre *</label>
              <Input name="firstName" value={form.firstName} onChange={handleChange} className="mt-1" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Apellido *</label>
              <Input name="lastName" value={form.lastName} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">DNI / CUIT</label>
              <Input name="dni" value={form.dni} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input name="phone" value={form.phone} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono alternativo</label>
              <Input name="phone2" value={form.phone2} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} className="mt-1" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input name="address" value={form.address} onChange={handleChange} className="mt-1" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea name="notes" value={form.notes} onChange={handleChange} className="mt-1" rows={2} />
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
