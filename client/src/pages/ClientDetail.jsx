import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clientsApi, vehiclesApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft, Edit, Plus, Car, Wrench, FileText,
  Phone, Mail, MapPin, CreditCard, User
} from 'lucide-react';
import { formatDate, formatCurrency, JOB_STATUS, QUOTE_STATUS, clientFullName } from '@/lib/utils';

const EMPTY_VEHICLE = { brand: '', model: '', year: '', plate: '', mileage: '', chassisNumber: '', engineNumber: '', color: '', notes: '' };

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [form, setForm] = useState({});
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await clientsApi.get(id);
      setClient(data);
    } catch {
      toast({ title: 'Cliente no encontrado', variant: 'error' });
      navigate('/clients');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  function openEdit() { setForm({ ...client }); setEditDialog(true); }

  async function saveClient() {
    setSaving(true);
    try {
      await clientsApi.update(client.id, form);
      toast({ title: 'Cliente actualizado', variant: 'success' });
      setEditDialog(false);
      load();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  async function saveVehicle() {
    if (!vehicleForm.brand || !vehicleForm.model) {
      toast({ title: 'Marca y modelo son requeridos', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      await vehiclesApi.create({ ...vehicleForm, clientId: client.id });
      toast({ title: 'Vehículo agregado', variant: 'success' });
      setVehicleDialog(false);
      setVehicleForm(EMPTY_VEHICLE);
      load();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div>
      <PageHeader
        title={clientFullName(client)}
        description="Ficha completa del cliente"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/clients')}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <Button onClick={openEdit}><Edit className="h-4 w-4" /> Editar</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Datos del cliente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Datos personales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.dni && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">DNI/CUIT:</span>
                  <span className="font-medium">{client.dni}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${client.phone}`} className="text-primary hover:underline">{client.phone}</a>
                </div>
              )}
              {client.phone2 && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${client.phone2}`} className="text-primary hover:underline">{client.phone2}</a>
                  <span className="text-xs text-muted-foreground">(alt.)</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-primary hover:underline truncate">{client.email}</a>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{client.address}</span>
                </div>
              )}
              {client.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Observaciones</p>
                  <p className="text-sm">{client.notes}</p>
                </div>
              )}
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Cliente desde {formatDate(client.createdAt)}
              </div>
            </CardContent>
          </Card>

          {/* Vehículos */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" /> Vehículos ({client.vehicles.length})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setVehicleDialog(true)}>
                <Plus className="h-3 w-3" /> Agregar
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {client.vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin vehículos registrados</p>
              ) : (
                <div className="grid gap-3">
                  {client.vehicles.map(v => (
                    <Link
                      key={v.id}
                      to={`/vehicles/${v.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="bg-primary/10 rounded-lg p-2">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{v.brand} {v.model} {v.year ? `(${v.year})` : ''}</p>
                        <p className="text-sm text-muted-foreground">
                          {v.plate && <span className="font-mono bg-gray-100 px-1.5 rounded mr-2">{v.plate}</span>}
                          {v.color && <span>{v.color}</span>}
                          {v.mileage && <span> · {v.mileage.toLocaleString('es-AR')} km</span>}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {v.jobs?.length || 0} trabajo{v.jobs?.length !== 1 ? 's' : ''}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Últimos trabajos */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Historial de trabajos
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate('/jobs')}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {client.vehicles.flatMap(v => v.jobs || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin trabajos registrados</p>
            ) : (
              <div className="space-y-2">
                {client.vehicles
                  .flatMap(v => (v.jobs || []).map(j => ({ ...j, vehicle: v })))
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 10)
                  .map(job => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{job.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.vehicle.brand} {job.vehicle.model}
                          {job.vehicle.plate && ` — ${job.vehicle.plate}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{formatCurrency(job.totalCost)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(job.date)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${JOB_STATUS[job.status]?.color}`}>
                        {JOB_STATUS[job.status]?.label}
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Presupuestos */}
        {client.quotes && client.quotes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Presupuestos recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {client.quotes.map(q => (
                  <Link
                    key={q.id}
                    to={`/quotes`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-mono font-medium">{q.number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(q.date)}</p>
                    </div>
                    <p className="font-medium text-sm">{formatCurrency(q.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QUOTE_STATUS[q.status]?.color}`}>
                      {QUOTE_STATUS[q.status]?.label}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog editar cliente */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)}>
        <DialogContent onClose={() => setEditDialog(false)}>
          <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'firstName', label: 'Nombre *' },
              { name: 'lastName', label: 'Apellido *' },
              { name: 'dni', label: 'DNI / CUIT' },
              { name: 'phone', label: 'Teléfono' },
              { name: 'phone2', label: 'Tel. alternativo' },
              { name: 'email', label: 'Email', type: 'email', col: 2 },
              { name: 'address', label: 'Dirección', col: 2 },
            ].map(f => (
              <div key={f.name} className={f.col === 2 ? 'col-span-2' : ''}>
                <label className="text-sm font-medium">{f.label}</label>
                <Input
                  type={f.type || 'text'}
                  name={f.name}
                  value={form[f.name] || ''}
                  onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea
                name="notes"
                value={form.notes || ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={saveClient} loading={saving}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nuevo vehículo */}
      <Dialog open={vehicleDialog} onClose={() => setVehicleDialog(false)}>
        <DialogContent onClose={() => setVehicleDialog(false)}>
          <DialogHeader><DialogTitle>Agregar vehículo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'brand', label: 'Marca *' },
              { name: 'model', label: 'Modelo *' },
              { name: 'year', label: 'Año', type: 'number' },
              { name: 'plate', label: 'Patente' },
              { name: 'mileage', label: 'Kilometraje', type: 'number' },
              { name: 'color', label: 'Color' },
              { name: 'chassisNumber', label: 'N° Chasis' },
              { name: 'engineNumber', label: 'N° Motor' },
            ].map(f => (
              <div key={f.name}>
                <label className="text-sm font-medium">{f.label}</label>
                <Input
                  type={f.type || 'text'}
                  value={vehicleForm[f.name]}
                  onChange={e => setVehicleForm(p => ({ ...p, [f.name]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea
                value={vehicleForm.notes}
                onChange={e => setVehicleForm(p => ({ ...p, notes: e.target.value }))}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialog(false)}>Cancelar</Button>
            <Button onClick={saveVehicle} loading={saving}>Agregar vehículo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
