import { useState, useEffect } from 'react';
import { migrationApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Users, Car } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const CLIENT_FIELDS = [
  { key: 'firstName', label: 'Nombre', required: true },
  { key: 'lastName', label: 'Apellido', required: true },
  { key: 'dni', label: 'DNI / CUIT', required: false },
  { key: 'phone', label: 'Teléfono', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'address', label: 'Dirección', required: false },
  { key: 'notes', label: 'Observaciones', required: false },
];

const VEHICLE_FIELDS = [
  { key: 'brand', label: 'Marca', required: true },
  { key: 'model', label: 'Modelo', required: true },
  { key: 'plate', label: 'Patente', required: false },
  { key: 'year', label: 'Año', required: false },
  { key: 'mileage', label: 'Kilometraje', required: false },
  { key: 'color', label: 'Color', required: false },
  { key: 'chassisNumber', label: 'N° Chasis', required: false },
  { key: 'clientDni', label: 'DNI/CUIT propietario', required: false },
  { key: 'clientFirstName', label: 'Nombre propietario', required: false },
  { key: 'clientLastName', label: 'Apellido propietario', required: false },
];

export default function Migration() {
  const [step, setStep] = useState('select'); // select | preview | mapping | importing | done
  const [type, setType] = useState('clients'); // clients | vehicles
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    migrationApi.logs().then(r => setLogs(r.data)).catch(() => {});
  }, []);

  async function handlePreview() {
    if (!file) { toast({ title: 'Seleccioná un archivo', variant: 'error' }); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await migrationApi.preview(fd);
      setPreview(data);
      setMapping({});
      setStep('mapping');
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al leer el archivo', variant: 'error' });
    } finally { setLoading(false); }
  }

  async function handleImport() {
    setLoading(true);
    setStep('importing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(mapping));
      const { data } = type === 'clients'
        ? await migrationApi.importClients(fd)
        : await migrationApi.importVehicles(fd);
      setResult(data);
      setStep('done');
      migrationApi.logs().then(r => setLogs(r.data)).catch(() => {});
      toast({ title: `Importación completada: ${data.imported} registros`, variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al importar', variant: 'error' });
      setStep('mapping');
    } finally { setLoading(false); }
  }

  function reset() {
    setStep('select');
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
  }

  const fields = type === 'clients' ? CLIENT_FIELDS : VEHICLE_FIELDS;

  return (
    <div>
      <PageHeader
        title="Migración de datos"
        description="Importar clientes y vehículos desde archivos CSV exportados del software anterior"
      />

      <div className="p-6 space-y-6">
        {/* Instrucciones */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Cómo migrar desde SPC-GE</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Abrí el software SPC-GE y exportá los datos como CSV (o usá DBF Viewer para los archivos .ger)</li>
                  <li>Guardá el CSV con codificación <strong>Latin-1 / Windows-1252</strong></li>
                  <li>Elegí el tipo de dato a importar y subí el archivo</li>
                  <li>Mapeá las columnas del CSV con los campos del sistema</li>
                  <li>El sistema detecta duplicados por DNI y patente automáticamente</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {(step === 'select' || step === 'preview') && (
          <Card>
            <CardHeader>
              <CardTitle>Importar datos</CardTitle>
              <CardDescription>Subí un archivo CSV exportado del software anterior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">¿Qué querés importar?</label>
                  <Select value={type} onChange={e => { setType(e.target.value); reset(); }}>
                    <option value="clients">Clientes</option>
                    <option value="vehicles">Vehículos</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Archivo CSV</label>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                    onChange={e => { setFile(e.target.files[0]); setStep('select'); }}
                  />
                </div>
              </div>
              <Button onClick={handlePreview} loading={loading} disabled={!file}>
                <Upload className="h-4 w-4" />
                Vista previa del archivo
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'mapping' && preview && (
          <Card>
            <CardHeader>
              <CardTitle>Mapear columnas</CardTitle>
              <CardDescription>
                Archivo: <strong>{file?.name}</strong> — {preview.totalRows} filas detectadas — Delimitador: <code>{preview.detectedDelimiter === '\t' ? 'TAB' : preview.detectedDelimiter}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vista previa tabla */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="text-xs w-full">
                  <thead className="bg-muted">
                    <tr>
                      {preview.columns.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {preview.columns.map(col => (
                          <td key={col} className="px-3 py-1.5 text-muted-foreground max-w-[150px] truncate">{row[col] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mapeo */}
              <div>
                <p className="text-sm font-medium mb-3">Asignar columnas del CSV a los campos del sistema:</p>
                <div className="grid grid-cols-2 gap-3">
                  {fields.map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-medium text-muted-foreground">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>
                      <Select
                        className="mt-1"
                        value={mapping[f.key] || ''}
                        onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                      >
                        <option value="">— No mapear —</option>
                        {preview.columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>Cancelar</Button>
                <Button onClick={handleImport} loading={loading}>
                  <Upload className="h-4 w-4" />
                  Importar {preview.totalRows} registros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'importing' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
              <p className="font-medium">Importando datos...</p>
              <p className="text-sm text-muted-foreground mt-1">Esto puede tardar unos segundos.</p>
            </CardContent>
          </Card>
        )}

        {step === 'done' && result && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado de la importación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                  <p className="text-sm text-green-600">Importados</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                  <p className="text-sm text-yellow-600">Omitidos (duplicados)</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                  <p className="text-sm text-red-600">Errores</p>
                </div>
              </div>

              {/* Detalle de errores */}
              {result.details.filter(d => d.status !== 'imported').length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  <table className="text-xs w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-left">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.details.filter(d => d.status !== 'imported').map((d, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5">{d.row}</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${d.status === 'skipped' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {d.status === 'skipped' ? 'Omitido' : 'Error'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{d.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button onClick={reset}>Nueva importación</Button>
            </CardContent>
          </Card>
        )}

        {/* Historial de migraciones */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de importaciones</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <div className="text-xs text-right shrink-0">
                      <p><span className="text-green-600 font-medium">{log.imported}</span> importados</p>
                      <p><span className="text-yellow-600">{log.skipped}</span> omitidos · <span className="text-red-600">{log.errors}</span> errores</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
