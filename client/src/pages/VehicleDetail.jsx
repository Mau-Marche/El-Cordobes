import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { vehiclesApi, jobsApi, settingsApi } from '@/lib/api';
import { DescriptionSearch } from '@/components/ui/DescriptionSearch';
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
  Car, User, Hash, Gauge, Palette, Printer, TrendingUp
} from 'lucide-react';
import { formatDate, formatCurrency, JOB_STATUS, QUOTE_STATUS, clientFullName } from '@/lib/utils';
import { buildPrintHTML, loadLogoDataUrl } from '@/lib/printQuote';

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
  const [printingId, setPrintingId] = useState(null);

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

  function openJobDialog() {
    setJobForm(f => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
      description: '',
      mileageIn: vehicle?.mileage ? String(vehicle.mileage) : '',
      laborCost: '0',
      status: 'PENDING',
      notes: '',
      items: [],
    }));
    setNewJobDialog(true);
  }

  async function handlePrint(jobId) {
    setPrintingId(jobId);
    try {
      const [{ data: quote }, { data: workshop }] = await Promise.all([
        jobsApi.toQuote(jobId),
        settingsApi.get(),
      ]);
      const logoDataUrl = await loadLogoDataUrl();
      const html = buildPrintHTML(quote, workshop, { docTitle: 'Comprobante', mileageIn: quote._jobMileageIn, logoDataUrl });
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { toast({ title: 'El navegador bloqueó la ventana. Permitila para imprimir.', variant: 'error' }); return; }
      win.document.write(html);
      win.document.close();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al generar comprobante', variant: 'error' });
    } finally { setPrintingId(null); }
  }

  async function saveJob() {
    if (!jobForm.description) {
      toast({ title: 'La descripción es requerida', variant: 'error' });
      return;
    }
    const kmIn  = jobForm.mileageIn  ? parseInt(jobForm.mileageIn)  : null;
    const kmOut = jobForm.mileageOut ? parseInt(jobForm.mileageOut) : null;
    if (kmIn != null && kmOut != null && kmOut < kmIn) {
      toast({ title: `Km salida (${kmOut.toLocaleString('es-AR')}) no puede ser menor al de entrada (${kmIn.toLocaleString('es-AR')})`, variant: 'error' });
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
            <Button onClick={() => openJobDialog()}><Plus className="h-4 w-4" />Nuevo trabajo</Button>
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

        {/* Historial de kilometraje */}
        <KmHistory jobs={vehicle.jobs} vehicleInitialKm={vehicle.mileage} onRefresh={load} />

        {/* Historial de trabajos */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Historial de trabajos
            </CardTitle>
            <Button size="sm" onClick={() => openJobDialog()} variant="outline">
              <Plus className="h-3 w-3" /> Nuevo trabajo
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {vehicle.jobs.length === 0 ? (
              <div className="text-center py-10">
                <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Sin trabajos registrados para este vehículo</p>
                <Button className="mt-3" size="sm" onClick={() => openJobDialog()}>
                  <Plus className="h-4 w-4" /> Registrar primer trabajo
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicle.jobs.map(job => (
                  <div key={job.id} className="flex items-start gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors group">
                    <Link to={`/jobs/${job.id}`} className="flex flex-1 items-start gap-4 min-w-0">
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
                    <button
                      onClick={() => handlePrint(job.id)}
                      disabled={printingId === job.id}
                      title="Imprimir comprobante"
                      className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-orange-600 hover:bg-orange-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {printingId === job.id
                        ? <div className="h-4 w-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                        : <Printer className="h-4 w-4" />}
                    </button>
                  </div>
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
              <DescriptionSearch
                value={jobForm.description}
                onChange={v => setJobForm(f => ({ ...f, description: v }))}
                rows={3}
              />
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

function KmHistory({ jobs, vehicleInitialKm, onRefresh }) {
  const [savingId, setSavingId] = useState(null);
  const [kmOutInputs, setKmOutInputs] = useState({}); // jobId → valor string

  const entries = [...jobs]
    .filter(j => j.mileageIn || j.mileageOut)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (entries.length === 0 && !vehicleInitialKm) return null;

  const firstKm  = vehicleInitialKm || (entries[0]?.mileageIn ?? entries[0]?.mileageOut);
  const lastEntry = entries[entries.length - 1];
  const lastKm   = lastEntry ? (lastEntry.mileageOut ?? lastEntry.mileageIn) : firstKm;
  const totalKm  = lastKm - firstKm;

  async function saveKmOut(job) {
    const val = parseInt(kmOutInputs[job.id]);
    if (!val || val <= 0) return;
    if (job.mileageIn != null && val < job.mileageIn) {
      toast({ title: `El km de salida (${val.toLocaleString('es-AR')}) no puede ser menor al de entrada (${job.mileageIn.toLocaleString('es-AR')})`, variant: 'error' });
      return;
    }
    setSavingId(job.id);
    try {
      await jobsApi.update(job.id, {
        description: job.description,
        mileageIn: job.mileageIn,
        mileageOut: val,
        laborCost: job.laborCost,
        status: job.status,
        notes: job.notes,
        items: job.items || [],
      });
      toast({ title: `Km salida registrado: ${val.toLocaleString('es-AR')} km`, variant: 'success' });
      setKmOutInputs(prev => { const n = { ...prev }; delete n[job.id]; return n; });
      onRefresh();
    } catch {
      toast({ title: 'Error al guardar km salida', variant: 'error' });
    } finally { setSavingId(null); }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Historial de kilometraje
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Primer registro</p>
            <p className="text-lg font-bold text-slate-800">{firstKm?.toLocaleString('es-AR') ?? '—'}</p>
            <p className="text-xs text-slate-400">km</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Km actual</p>
            <p className="text-lg font-bold text-blue-700">{lastKm?.toLocaleString('es-AR') ?? '—'}</p>
            <p className="text-xs text-blue-400">km</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Total recorrido</p>
            <p className="text-lg font-bold text-green-700">{totalKm > 0 ? `+${totalKm.toLocaleString('es-AR')}` : '—'}</p>
            <p className="text-xs text-green-400">km</p>
          </div>
        </div>

        {/* Timeline por visita */}
        {entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((job, idx) => {
              const prev       = idx > 0 ? entries[idx - 1] : null;
              const prevExitKm = prev ? (prev.mileageOut ?? prev.mileageIn) : vehicleInitialKm;
              const kmBetween  = prevExitKm != null && job.mileageIn != null ? job.mileageIn - prevExitKm : null;
              const kmInTaller = job.mileageIn != null && job.mileageOut != null ? job.mileageOut - job.mileageIn : null;
              const isLast     = idx === entries.length - 1;
              const pendingOut = job.mileageOut == null;
              const inputVal   = kmOutInputs[job.id] ?? '';

              return (
                <div key={job.id} className={`rounded-lg border p-3 ${isLast ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 bg-white'}`}>
                  {/* Encabezado */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Link to={`/jobs/${job.id}`} className="text-sm font-semibold hover:text-primary hover:underline">
                        {job.description?.split('\n')[0] || 'Sin descripción'}
                      </Link>
                      <p className="text-xs text-slate-400">{formatDate(job.date)}</p>
                    </div>
                    {isLast && <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">Última visita</span>}
                  </div>

                  {/* Km entrada → salida */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-md px-2 py-1">
                      <span className="text-xs text-slate-500">Entrada</span>
                      <span className="text-sm font-bold text-slate-800">
                        {job.mileageIn != null ? `${job.mileageIn.toLocaleString('es-AR')} km` : '—'}
                      </span>
                    </div>

                    <span className="text-slate-300 text-lg">→</span>

                    {pendingOut ? (
                      <div className="flex items-center gap-1.5 bg-yellow-50 border border-dashed border-yellow-300 rounded-md px-2 py-1">
                        <span className="text-xs text-yellow-500">Salida</span>
                        <span className="text-sm font-medium text-yellow-400">Pendiente</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-green-100 rounded-md px-2 py-1">
                        <span className="text-xs text-green-600">Salida</span>
                        <span className="text-sm font-bold text-green-800">{job.mileageOut.toLocaleString('es-AR')} km</span>
                      </div>
                    )}

                    {kmInTaller != null && (
                      <span className="text-xs text-green-600 font-medium">(+{kmInTaller.toLocaleString('es-AR')} km en taller)</span>
                    )}
                  </div>

                  {/* Input rápido km salida */}
                  {pendingOut && (() => {
                    const numVal = parseInt(inputVal);
                    const isInvalid = inputVal !== '' && (!numVal || (job.mileageIn != null && numVal < job.mileageIn));
                    return (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={job.mileageIn ?? 0}
                            placeholder={`Km salida${job.mileageIn ? ` (mín. ${job.mileageIn.toLocaleString('es-AR')})` : ''}`}
                            value={inputVal}
                            onChange={e => setKmOutInputs(prev => ({ ...prev, [job.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && !isInvalid && saveKmOut(job)}
                            className={`flex-1 h-8 rounded-md border bg-white px-2 text-sm focus:outline-none focus:ring-2 ${
                              isInvalid
                                ? 'border-red-400 focus:ring-red-400 text-red-600'
                                : 'border-slate-200 focus:ring-green-400'
                            }`}
                          />
                          <button
                            onClick={() => saveKmOut(job)}
                            disabled={!inputVal || isInvalid || savingId === job.id}
                            className="h-8 px-3 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors"
                          >
                            {savingId === job.id ? '...' : 'Guardar'}
                          </button>
                        </div>
                        {isInvalid && (
                          <p className="text-xs text-red-500">
                            El km de salida debe ser mayor al de entrada ({job.mileageIn?.toLocaleString('es-AR')} km)
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Km entre visitas */}
                  {kmBetween != null && kmBetween > 0 && (
                    <p className="text-xs text-slate-400 mt-1.5">
                      ↑ recorrió <strong className="text-slate-600">{kmBetween.toLocaleString('es-AR')} km</strong> desde la visita anterior
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
