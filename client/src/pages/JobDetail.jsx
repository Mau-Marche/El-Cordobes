import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobsApi, settingsApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft, Edit, Upload, Trash2, FileText,
  Car, User, Paperclip, Image, File, Download, Printer, FileCheck
} from 'lucide-react';
import { formatDate, formatCurrency, JOB_STATUS, clientFullName } from '@/lib/utils';
import { buildPrintHTML, loadLogoDataUrl } from '@/lib/printQuote';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [converting, setConverting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await jobsApi.get(id);
      setJob(data);
    } catch {
      toast({ title: 'Trabajo no encontrado', variant: 'error' });
      navigate('/jobs');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function handleStatusChange(newStatus) {
    try {
      await jobsApi.update(job.id, { status: newStatus });
      toast({ title: 'Estado actualizado', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Error al actualizar estado', variant: 'error' });
    }
  }

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      await jobsApi.uploadAttachments(job.id, fd);
      toast({ title: `${files.length} archivo(s) adjuntado(s)`, variant: 'success' });
      load();
    } catch {
      toast({ title: 'Error al subir archivos', variant: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAttachment(attachId) {
    if (!confirm('¿Eliminar este adjunto?')) return;
    try {
      await jobsApi.deleteAttachment(job.id, attachId);
      toast({ title: 'Adjunto eliminado', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Error al eliminar', variant: 'error' });
    }
  }

  async function handleToQuote() {
    setConverting(true);
    try {
      const { data: quote } = await jobsApi.toQuote(job.id);
      toast({ title: 'Presupuesto creado', variant: 'success' });
      navigate('/quotes', { state: { openQuoteId: quote.id } });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al crear presupuesto', variant: 'error' });
    } finally { setConverting(false); }
  }

  async function handlePrintComprobante() {
    setPrinting(true);
    try {
      const [{ data: quote }, { data: workshop }] = await Promise.all([
        jobsApi.toQuote(job.id),
        settingsApi.get(),
      ]);
      const logoDataUrl = await loadLogoDataUrl();
      const html = buildPrintHTML(quote, workshop, {
        docTitle: 'Comprobante',
        mileageIn: quote._jobMileageIn,
        logoDataUrl,
      });
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) {
        toast({ title: 'El navegador bloqueó la ventana. Permitila para imprimir.', variant: 'error' });
        return;
      }
      win.document.write(html);
      win.document.close();
      toast({ title: 'Comprobante generado', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al generar comprobante', variant: 'error' });
    } finally { setPrinting(false); }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const statusColor = JOB_STATUS[job.status]?.color || '';

  return (
    <div>
      <PageHeader
        title={`Trabajo #${job.id}`}
        description={job.description}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/jobs')}><ArrowLeft className="h-4 w-4" />Volver</Button>
            <Button variant="outline" onClick={handleToQuote} loading={converting}>
              <FileCheck className="h-4 w-4" />Pasar a presupuesto
            </Button>
            <Button variant="outline" onClick={handlePrintComprobante} loading={printing}>
              <Printer className="h-4 w-4" />Imprimir comprobante
            </Button>
            <Button onClick={() => navigate('/jobs', { state: { editId: job.id } })}>
              <Edit className="h-4 w-4" />Editar
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info principal */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información del trabajo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <InfoItem label="Fecha" value={formatDate(job.date)} />
                <InfoItem label="Estado">
                  <Select
                    className="h-8 text-xs"
                    value={job.status}
                    onChange={e => handleStatusChange(e.target.value)}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="IN_PROGRESS">En proceso</option>
                    <option value="FINISHED">Finalizado</option>
                    <option value="DELIVERED">Entregado</option>
                  </Select>
                </InfoItem>
                {job.mileageIn && <InfoItem label="Km entrada" value={job.mileageIn.toLocaleString('es-AR')} />}
                {job.mileageOut && <InfoItem label="Km salida" value={job.mileageOut.toLocaleString('es-AR')} />}
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">{job.description}</p>
              </div>

              {job.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Observaciones</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{job.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cliente y vehículo */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to={`/clients/${job.vehicle.client.id}`} className="font-medium text-primary hover:underline text-sm">
                  {clientFullName(job.vehicle.client)}
                </Link>
                {job.vehicle.client.phone && (
                  <p className="text-sm text-muted-foreground mt-1">📞 {job.vehicle.client.phone}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Car className="h-4 w-4" /> Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to={`/vehicles/${job.vehicle.id}`} className="font-medium text-primary hover:underline text-sm">
                  {job.vehicle.brand} {job.vehicle.model} {job.vehicle.year ? `(${job.vehicle.year})` : ''}
                </Link>
                {job.vehicle.plate && (
                  <p className="text-sm mt-1">
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{job.vehicle.plate}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Repuestos/ítems */}
        {job.items && job.items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Repuestos utilizados</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center w-24">Cantidad</TableHead>
                    <TableHead className="text-right w-32">P. Unitario</TableHead>
                    <TableHead className="text-right w-32">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {job.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{parseFloat(item.quantity)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                  {parseFloat(job.laborCost) > 0 && (
                    <TableRow className="bg-orange-50/50">
                      <TableCell className="font-medium">Mano de obra</TableCell>
                      <TableCell className="text-center">1</TableCell>
                      <TableCell className="text-right">{formatCurrency(job.laborCost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(job.laborCost)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-3 pt-3 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total del trabajo</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(job.totalCost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Adjuntos */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Adjuntos ({job.attachments?.length || 0})
            </CardTitle>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleUpload}
              />
              <Button size="sm" variant="outline" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3 w-3" /> Subir archivos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!job.attachments || job.attachments.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Arrastrá archivos o hacé clic para adjuntar</p>
                <p className="text-xs text-muted-foreground mt-1">Imágenes, PDFs, documentos — máx. 20 MB por archivo</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {job.attachments.map(att => (
                  <AttachmentCard key={att.id} att={att} onDelete={() => handleDeleteAttachment(att.id)} />
                ))}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <Upload className="h-5 w-5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Agregar más</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AttachmentCard({ att, onDelete }) {
  const isImage = att.mimetype?.startsWith('image/');
  const isPDF = att.mimetype === 'application/pdf';

  return (
    <div className="relative border rounded-lg overflow-hidden group">
      {isImage ? (
        <a href={att.path} target="_blank" rel="noopener noreferrer">
          <img src={att.path} alt={att.originalName} className="w-full h-24 object-cover" />
        </a>
      ) : (
        <a href={att.path} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-24 bg-gray-50 hover:bg-gray-100 transition-colors">
          {isPDF ? <FileText className="h-8 w-8 text-red-400" /> : <File className="h-8 w-8 text-blue-400" />}
        </a>
      )}
      <div className="p-2">
        <p className="text-xs truncate text-muted-foreground" title={att.originalName}>{att.originalName}</p>
        <p className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</p>
      </div>
      <button
        onClick={onDelete}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function InfoItem({ label, value, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {children || <p className="font-medium">{value}</p>}
    </div>
  );
}
