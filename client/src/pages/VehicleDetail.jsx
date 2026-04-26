import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { vehiclesApi, jobsApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft, Edit, Plus, Wrench, FileText,
  Car, User, Hash, Gauge, Palette
} from 'lucide-react';
import { formatDate, formatCurrency, JOB_STATUS, QUOTE_STATUS, clientFullName } from '@/lib/utils';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newJobDialog, setNewJobDialog] = useState(false);
  const [jobForm, setJobForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    mileageIn: '',
    laborCost: '0',
    status: 'PENDING',
    notes: '',
    items: [],
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await vehiclesApi.get(id);
      setVehicle(data);
    } catch {
      toast({ title: 'Vehículo no encontrado', variant: 'error' });
      navigate('/vehicles');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function saveJob() {
    if (!jobForm.description) {
      toast({ title: 'La descripción es requerida', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      await jobsApi.create({ ...jobForm, vehicleId: vehicle.id, total: parseFloat(jobForm.laborCost || 0) });
      toast({ title: 'Trabajo registrado', variant: 'success' });
      setNewJobDialog(false);
      setJobForm({ date: new Date().toISOString().slice(0, 10), description: '', mileageIn: '', laborCost: '0', status: 'PENDING', notes: '', items: [] });
      load();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const totalFacturado = vehicle.jobs.reduce((acc, j) => acc + parseFloat(j.totalCost || 0), 0);

  return (
    <div>
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}`}
        description={vehicle.plate ? `Patente: ${vehicle.plate}` : 'Sin patente registrada'}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/vehicles')}><ArrowLeft className="h-4 w-4" />Volver</Button>
            <Button onClick={() => setNewJobDialog(true)}><Plus className="h-4 w-4" />Nuevo trabajo</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Datos del vehículo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" /> Datos del vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={User} label="Propietario">
                <Link to={`/clients/${vehicle.client.id}`} className="text-primary hover:underline font-medium">
                  {clientFullName(vehicle.client)}
                </Link>
              </InfoRow>
              {vehicle.plate && <InfoRow icon={Hash} label="Patente"><span className="font-mono font-bold">{vehicle.plate}</span></InfoRow>}
              {vehicle.color && <InfoRow icon={Palette} label="Color">{vehicle.color}</InfoRow>}
              {vehicle.mileage && <InfoRow icon={Gauge} label="Kilometraje">{vehicle.mileage.toLocaleString('es-AR')} km</InfoRow>}
              {vehicle.chassisNumber && <InfoRow icon={Hash} label="N° Chasis"><span className="font-mono text-xs">{vehicle.chassisNumber}</span></InfoRow>}
              {vehicle.engineNumber && <InfoRow icon={Hash} label="N° Motor"><span className="font-mono text-xs">{vehicle.engineNumber}</span></InfoRow>}
              {vehicle.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Observaciones</p>
                  <p className="text-sm">{vehicle.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{vehicle.jobs.length}</p>
                  <p className="text-sm text-blue-600">Trabajos realizados</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(totalFacturado)}</p>
                  <p className="text-sm text-green-600">Total facturado</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-700">
                    {vehicle.jobs.filter(j => j.status === 'PENDING' || j.status === 'IN_PROGRESS').length}
                  </p>
                  <p className="text-sm text-orange-600">Trabajos activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial de trabajos */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Historial de trabajos
            </CardTitle>
            <Button size="sm" onClick={() => setNewJobDialog(true)} variant="outline">
              <Plus className="h-3 w-3" /> Nuevo trabajo
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {vehicle.jobs.length === 0 ? (
              <div className="text-center py-10">
                <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Sin trabajos registrados para este vehículo</p>
                <Button className="mt-3" size="sm" onClick={() => setNewJobDialog(true)}>
                  <Plus className="h-4 w-4" /> Registrar primer trabajo
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicle.jobs.map(job => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{job.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>{formatDate(job.date)}</span>
                        {job.mileageIn && <span>Km entrada: {job.mileageIn.toLocaleString('es-AR')}</span>}
                        {job.mileageOut && <span>Km salida: {job.mileageOut.toLocaleString('es-AR')}</span>}
                        {job.items?.length > 0 && <span>{job.items.length} repuesto{job.items.length !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(job.totalCost)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS[job.status]?.color}`}>
                        {JOB_STATUS[job.status]?.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Presupuestos */}
        {vehicle.quotes && vehicle.quotes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Presupuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {vehicle.quotes.map(q => (
                <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{q.number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(q.date)}</p>
                  </div>
                  <p className="font-medium">{formatCurrency(q.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QUOTE_STATUS[q.status]?.color}`}>
                    {QUOTE_STATUS[q.status]?.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog nuevo trabajo rápido */}
      <Dialog open={newJobDialog} onClose={() => setNewJobDialog(false)}>
        <DialogContent onClose={() => setNewJobDialog(false)}>
          <DialogHeader>
            <DialogTitle>Nuevo trabajo — {vehicle.brand} {vehicle.model}{vehicle.plate ? ` (${vehicle.plate})` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" className="mt-1" value={jobForm.date} onChange={e => setJobForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select className="mt-1" value={jobForm.status} onChange={e => setJobForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_PROGRESS">En proceso</option>
                  <option value="FINISHED">Finalizado</option>
                  <option value="DELIVERED">Entregado</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Km entrada</label>
                <Input type="number" className="mt-1" value={jobForm.mileageIn} onChange={e => setJobForm(f => ({ ...f, mileageIn: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Mano de obra</label>
                <Input type="number" min="0" step="0.01" className="mt-1" value={jobForm.laborCost} onChange={e => setJobForm(f => ({ ...f, laborCost: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Descripción del trabajo *</label>
              <Textarea className="mt-1" rows={3} value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="Detallá el trabajo realizado..." />
            </div>
            <div>
              <label className="text-sm font-medium">Observaciones internas</label>
              <Textarea className="mt-1" rows={2} value={jobForm.notes} onChange={e => setJobForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewJobDialog(false)}>Cancelar</Button>
            <Button onClick={saveJob} loading={saving}>Registrar trabajo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-muted-foreground min-w-[80px]">{label}:</span>
      <span>{children}</span>
    </div>
  );
}
