import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesApi, clientsApi, vehiclesApi, catalogApi, settingsApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Plus, Search, Edit, Trash2, Printer, ArrowRight, ChevronLeft, ChevronRight, X, Loader2, BookOpen, User, Car } from 'lucide-react';
import { formatCurrency, formatDate, QUOTE_STATUS } from '@/lib/utils';

const EMPTY_FORM = { clientId: '', vehicleId: '', validUntil: '', notes: '', laborCost: '0', status: 'DRAFT', items: [] };
const EMPTY_ITEM = { description: '', quantity: '1', unitPrice: '0', subtotal: '0' };

/* ── Autocomplete genérico ──────────────────────────────────────── */
function SearchDropdown({ icon: Icon, placeholder, value, onSearch, onSelect, onClear, disabled = false, results, loading }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Sincronizar query con búsqueda
  useEffect(() => {
    if (!query || query.length < 1) { onSearch(''); return; }
    const t = setTimeout(() => onSearch(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  // Si hay value elegido, no mostramos el input de búsqueda
  if (value) {
    return (
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-slate-50">
        {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">{value}</span>
        {!disabled && (
          <button type="button" onClick={() => { onClear(); setQuery(''); }} className="text-slate-400 hover:text-red-500 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
        {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
        <input
          type="text"
          disabled={disabled}
          placeholder={disabled ? 'Primero elegí un cliente' : placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 1 && setOpen(true)}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => { onSelect(item); setQuery(''); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors border-b last:border-0"
            >
              {item.label}
              {item.sub && <span className="block text-xs text-slate-400">{item.sub}</span>}
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

/* ── Buscador de catálogo de ítems ─────────────────────────────── */
function CatalogSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      catalogApi.search(query)
        .then(r => { setResults(r.data); setOpen(true); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(desc) {
    onSelect(desc);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
        <Input
          placeholder="Buscar en catálogo (ej: aceite, frenos, alineación...)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 shadow-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {results.map((desc, i) => (
            <button key={i} type="button" onClick={() => select(desc)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors border-b last:border-0">
              {desc}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length > 1 && !loading && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border rounded-lg shadow-xl px-4 py-3 text-sm text-muted-foreground">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  );
}

/* ── Genera el HTML del presupuesto para imprimir ───────────────── */
function buildPrintHTML(quote, workshop = {}) {
  const workshopName = workshop.workshopName || 'El Cordobés';
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const statusLabel = { DRAFT: 'Borrador', SENT: 'Enviado', APPROVED: 'Aprobado', REJECTED: 'Rechazado' };
  const statusColor = { DRAFT: '#6b7280', SENT: '#1e40af', APPROVED: '#065f46', REJECTED: '#991b1b' };
  const statusBg    = { DRAFT: '#f3f4f6', SENT: '#dbeafe', APPROVED: '#d1fae5', REJECTED: '#fee2e2' };

  const itemsTotal = quote.items.reduce((a, i) => a + parseFloat(i.subtotal || 0), 0);
  const laborCost  = parseFloat(quote.laborCost || 0);
  const total      = parseFloat(quote.total ?? (itemsTotal + laborCost));

  const rows = quote.items.map(i => `
    <tr>
      <td>${i.description}</td>
      <td style="text-align:center">${parseFloat(i.quantity)}</td>
      <td style="text-align:right">${fmt(i.unitPrice)}</td>
      <td style="text-align:right">${fmt(i.subtotal)}</td>
    </tr>
  `).join('');

  const laborRow = laborCost > 0 ? `
    <tr style="background:#fff8f0">
      <td><strong>Mano de obra</strong></td>
      <td style="text-align:center">1</td>
      <td style="text-align:right">${fmt(laborCost)}</td>
      <td style="text-align:right">${fmt(laborCost)}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto ${quote.number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 28px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1e3a5f; padding-bottom:16px; margin-bottom:20px; }
    .workshop-name { font-size:26px; font-weight:bold; color:#1e3a5f; }
    .workshop-sub  { font-size:11px; color:#555; margin-top:4px; line-height:1.7; }
    .quote-meta { text-align:right; }
    .quote-meta h2 { font-size:14px; color:#1e3a5f; text-transform:uppercase; letter-spacing:1px; }
    .quote-number { font-size:24px; font-weight:bold; color:#e65c00; margin-top:2px; }
    .quote-date   { font-size:11px; color:#666; margin-top:4px; }
    .status-badge { display:inline-block; padding:3px 12px; border-radius:12px; font-size:10px; font-weight:bold;
                    text-transform:uppercase; letter-spacing:0.5px;
                    color:${statusColor[quote.status]}; background:${statusBg[quote.status]}; margin-top:6px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
    .info-box { border:1px solid #ddd; border-radius:6px; padding:12px; background:#f9f9f9; }
    .info-box h3 { font-size:10px; text-transform:uppercase; color:#888; letter-spacing:0.5px; margin-bottom:8px; }
    .info-box p  { font-size:12px; line-height:1.8; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    thead th { background:#1e3a5f; color:#fff; padding:8px 10px; text-align:left; font-size:11px; text-transform:uppercase; }
    tbody tr { border-bottom:1px solid #eee; }
    tbody tr:nth-child(even) { background:#f9f9f9; }
    tbody td { padding:8px 10px; vertical-align:top; }
    .totals { display:flex; justify-content:flex-end; margin-top:8px; }
    .totals-box { border:2px solid #1e3a5f; border-radius:6px; padding:14px 20px; min-width:220px; }
    .t-row  { display:flex; justify-content:space-between; font-size:11px; color:#555; margin-bottom:4px; }
    .t-total{ display:flex; justify-content:space-between; font-size:17px; font-weight:bold; color:#1e3a5f;
               border-top:1px solid #ddd; margin-top:8px; padding-top:8px; }
    .notes { margin-top:20px; padding:12px; background:#f9f9f9; border-left:4px solid #1e3a5f; border-radius:0 6px 6px 0; }
    .notes h3 { font-size:10px; text-transform:uppercase; color:#888; margin-bottom:6px; }
    .footer { margin-top:36px; border-top:1px solid #ddd; padding-top:12px; text-align:center; font-size:10px; color:#999; }
    @media print {
      body { padding: 8px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:14px">
      <svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
        <defs>
          <radialGradient id="pg" cx="38%" cy="30%" r="68%">
            <stop offset="0%" stop-color="#fb923c"/>
            <stop offset="60%" stop-color="#ea580c"/>
            <stop offset="100%" stop-color="#9a3412"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="31" fill="url(#pg)"/>
        <circle cx="32" cy="32" r="29.5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <g transform="rotate(-45, 32, 32)">
          <path d="M 12 20 Q 10 20 10 22 L 10 26 L 27 26 L 27 38 L 10 38 L 10 42 Q 10 44 12 44 L 30 44 L 30 37 L 52 37 Q 57 37 57 32 Q 57 27 52 27 L 30 27 L 30 20 L 12 20 Z"
            fill="white"/>
        </g>
      </svg>
      <div>
        <div class="workshop-name">${workshopName}</div>
        <div class="workshop-sub">Taller Automotriz</div>
        <div class="workshop-sub" style="margin-top:2px">
          ${workshop.workshopAddress ? `📍 ${workshop.workshopAddress}` : ''}
          ${workshop.workshopPhone ? ` &nbsp;·&nbsp; 📞 ${workshop.workshopPhone}` : ''}
          ${workshop.workshopCuit ? ` &nbsp;·&nbsp; CUIT: ${workshop.workshopCuit}` : ''}
        </div>
      </div>
    </div>
    <div class="quote-meta">
      <h2>Presupuesto</h2>
      <div class="quote-number">#&nbsp;${quote.number}</div>
      <div class="quote-date">Fecha: ${fmtDate(quote.date || new Date())}</div>
      ${quote.validUntil ? `<div class="quote-date">Válido hasta: ${fmtDate(quote.validUntil)}</div>` : ''}
      <div><span class="status-badge">${statusLabel[quote.status] || quote.status}</span></div>
    </div>
  </div>

  <div class="grid2">
    <div class="info-box">
      <h3>Cliente</h3>
      <p>
        <strong>${quote.client.lastName}, ${quote.client.firstName}</strong><br>
        ${quote.client.dni ? `DNI/CUIT: ${quote.client.dni}<br>` : ''}
        ${quote.client.phone ? `Tel: ${quote.client.phone}<br>` : ''}
        ${quote.client.email ? `${quote.client.email}<br>` : ''}
        ${quote.client.address ? quote.client.address : ''}
      </p>
    </div>
    <div class="info-box">
      <h3>Vehículo</h3>
      <p>
        <strong>${quote.vehicle.brand} ${quote.vehicle.model}${quote.vehicle.year ? ` (${quote.vehicle.year})` : ''}</strong><br>
        ${quote.vehicle.plate ? `Patente: <strong>${quote.vehicle.plate}</strong><br>` : ''}
        ${quote.vehicle.color ? `Color: ${quote.vehicle.color}<br>` : ''}
        ${quote.vehicle.mileage ? `Kilometraje: ${Number(quote.vehicle.mileage).toLocaleString('es-AR')} km<br>` : ''}
        ${quote.vehicle.chassisNumber ? `Chasis: ${quote.vehicle.chassisNumber}` : ''}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align:center;width:80px">Cant.</th>
        <th style="text-align:right;width:130px">P. Unitario</th>
        <th style="text-align:right;width:130px">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4" style="text-align:center;color:#999;padding:16px">Sin ítems</td></tr>'}
      ${laborRow}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      ${quote.items.length > 0 ? `<div class="t-row"><span>Subtotal repuestos:</span><span>${fmt(itemsTotal)}</span></div>` : ''}
      ${laborCost > 0 ? `<div class="t-row"><span>Mano de obra:</span><span>${fmt(laborCost)}</span></div>` : ''}
      <div class="t-total"><span>TOTAL:</span><span>${fmt(total)}</span></div>
    </div>
  </div>

  ${quote.notes ? `<div class="notes"><h3>Observaciones</h3><p>${quote.notes}</p></div>` : ''}

  <div class="footer">
    <p>${workshopName} — Presupuesto N° ${quote.number} — Generado el ${fmtDate(new Date())}</p>
    <p style="margin-top:4px">Este presupuesto no constituye un comprobante fiscal.</p>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [workshopData, setWorkshopData] = useState({});
  const navigate = useNavigate();

  // ── Estado para búsqueda de cliente / vehículo en el formulario ──
  const [selectedClient, setSelectedClient] = useState(null);     // { id, label }
  const [selectedVehicle, setSelectedVehicle] = useState(null);   // { id, label }
  const [selectedVehicleRaw, setSelectedVehicleRaw] = useState(null); // datos completos del vehículo
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [vehicleResults, setVehicleResults] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);

  useEffect(() => {
    settingsApi.get().then(r => setWorkshopData(r.data)).catch(() => {});
  }, []);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await quotesApi.list({ search, page, limit: 20, status: statusFilter });
      setQuotes(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast({ title: 'Error al cargar presupuestos', variant: 'error' });
    } finally { setLoading(false); }
  }, [search, page, statusFilter]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Buscar clientes al tipear
  async function searchClients(q) {
    if (!q || q.length < 2) { setClientSearchResults([]); return; }
    setClientSearchLoading(true);
    try {
      const { data } = await clientsApi.list({ search: q, limit: 10 });
      setClientSearchResults((data.data || []).map(c => ({
        id: c.id,
        label: `${c.lastName}, ${c.firstName}`,
        sub: [c.phone, c.dni].filter(Boolean).join(' · '),
        raw: c,
      })));
    } catch { setClientSearchResults([]); }
    finally { setClientSearchLoading(false); }
  }

  // Cargar vehículos del cliente seleccionado
  async function loadVehicles(clientId) {
    if (!clientId) { setVehicleResults([]); return; }
    setVehicleLoading(true);
    try {
      const { data } = await vehiclesApi.list({ clientId, limit: 50 });
      setVehicleResults((data.data || []).map(v => ({
        id: v.id,
        label: `${v.brand} ${v.model}${v.plate ? ` — ${v.plate}` : ''}`,
        sub: v.year ? `Año ${v.year}` : '',
        raw: v,
      })));
    } catch { setVehicleResults([]); }
    finally { setVehicleLoading(false); }
  }

  // Buscar vehículos por patente/marca cuando no hay cliente aún
  async function searchVehicles(q) {
    if (selectedClient) return; // Si ya hay cliente, usamos vehicleResults
    if (!q || q.length < 2) { setVehicleResults([]); return; }
    setVehicleLoading(true);
    try {
      const { data } = await vehiclesApi.list({ search: q, limit: 10 });
      setVehicleResults((data.data || []).map(v => ({
        id: v.id,
        label: `${v.brand} ${v.model}${v.plate ? ` — ${v.plate}` : ''}`,
        sub: v.client ? `${v.client.lastName}, ${v.client.firstName}` : '',
        raw: v,
      })));
    } catch { setVehicleResults([]); }
    finally { setVehicleLoading(false); }
  }

  function selectClient(item) {
    setSelectedClient(item);
    setSelectedVehicle(null);
    setForm(f => ({ ...f, clientId: String(item.id), vehicleId: '' }));
    loadVehicles(item.id);
  }

  function clearClient() {
    setSelectedClient(null);
    setSelectedVehicle(null);
    setSelectedVehicleRaw(null);
    setVehicleResults([]);
    setForm(f => ({ ...f, clientId: '', vehicleId: '' }));
  }

  function selectVehicle(item) {
    setSelectedVehicle(item);
    setSelectedVehicleRaw(item.raw || null);
    setForm(f => ({ ...f, vehicleId: String(item.id) }));
    // Si el vehículo trae cliente y aún no hay cliente seleccionado, auto-seleccionarlo
    if (!selectedClient && item.raw?.client) {
      const c = item.raw.client;
      const clientItem = { id: item.raw.clientId, label: `${c.lastName}, ${c.firstName}` };
      setSelectedClient(clientItem);
      setForm(f => ({ ...f, clientId: String(item.raw.clientId), vehicleId: String(item.id) }));
      loadVehicles(item.raw.clientId);
    }
  }

  function clearVehicle() {
    setSelectedVehicle(null);
    setSelectedVehicleRaw(null);
    setForm(f => ({ ...f, vehicleId: '' }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setSelectedClient(null);
    setSelectedVehicle(null);
    setClientSearchResults([]);
    setVehicleResults([]);
    setDialog('create');
  }

  async function openEdit(q) {
    try {
      const { data } = await quotesApi.get(q.id);
      setForm({
        clientId:   String(data.clientId),
        vehicleId:  String(data.vehicleId),
        validUntil: data.validUntil ? data.validUntil.slice(0, 10) : '',
        notes:      data.notes || '',
        laborCost:  String(data.laborCost),
        status:     data.status,
        items: data.items.map(i => ({
          description: i.description,
          quantity:    String(i.quantity),
          unitPrice:   String(i.unitPrice),
          subtotal:    String(i.subtotal),
        })),
      });
      setSelected(data);
      // Precargar cliente y vehículo para mostrarlo en los campos
      setSelectedClient({ id: data.clientId, label: `${data.client.lastName}, ${data.client.firstName}` });
      setSelectedVehicle({ id: data.vehicleId, label: `${data.vehicle.brand} ${data.vehicle.model}${data.vehicle.plate ? ` — ${data.vehicle.plate}` : ''}` });
      setSelectedVehicleRaw(data.vehicle);
      loadVehicles(data.clientId);
      setDialog('edit');
    } catch {
      toast({ title: 'Error al cargar el presupuesto', variant: 'error' });
    }
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setSelectedClient(null);
    setSelectedVehicle(null);
    setClientSearchResults([]);
    setVehicleResults([]);
  }

  function setField(name, value) { setForm(f => ({ ...f, [name]: value })); }
  function addItem() { setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] })); }

  function updateItem(idx, field, value) {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty   = parseFloat(items[idx].quantity)  || 0;
        const price = parseFloat(items[idx].unitPrice)  || 0;
        items[idx].subtotal = String((qty * price).toFixed(2));
      }
      return { ...f, items };
    });
  }

  function removeItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  const itemsTotal = form.items.reduce((acc, i) => acc + (parseFloat(i.subtotal) || 0), 0);
  const grandTotal = itemsTotal + (parseFloat(form.laborCost) || 0);

  async function handleSave() {
    if (!form.clientId || !form.vehicleId) {
      toast({ title: 'Cliente y vehículo son requeridos', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (dialog === 'create') {
        await quotesApi.create({ ...form, total: grandTotal });
        toast({ title: 'Presupuesto creado', variant: 'success' });
      } else {
        await quotesApi.update(selected.id, { ...form, total: grandTotal });
        toast({ title: 'Presupuesto actualizado', variant: 'success' });
      }
      closeDialog();
      fetchQuotes();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setSaving(false); }
  }

  async function handlePrint(q) {
    setPrinting(q.id);
    try {
      const { data } = await quotesApi.get(q.id);
      const html = buildPrintHTML(data, workshopData);
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) {
        toast({ title: 'El navegador bloqueó la ventana emergente. Permitila para imprimir.', variant: 'error' });
        return;
      }
      win.document.write(html);
      win.document.close();
    } catch {
      toast({ title: 'Error al generar la impresión', variant: 'error' });
    } finally { setPrinting(null); }
  }

  async function handleConvert(q) {
    if (!confirm(`¿Convertir el presupuesto ${q.number} en un trabajo?`)) return;
    try {
      await quotesApi.convertToJob(q.id);
      toast({ title: 'Trabajo creado desde el presupuesto', variant: 'success' });
      navigate('/jobs');
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al convertir', variant: 'error' });
    }
  }

  async function handleDelete(q) {
    if (!confirm(`¿Eliminar el presupuesto ${q.number}?`)) return;
    try {
      await quotesApi.delete(q.id);
      toast({ title: 'Presupuesto eliminado', variant: 'success' });
      fetchQuotes();
    } catch {
      toast({ title: 'Error al eliminar', variant: 'error' });
    }
  }

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description={`${total} presupuestos`}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo presupuesto</Button>}
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 bg-white"
              placeholder="Buscar por número, cliente o patente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select className="w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="SENT">Enviado</option>
            <option value="APPROVED">Aprobado</option>
            <option value="REJECTED">Rechazado</option>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Sin presupuestos</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-44">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map(q => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-sm font-medium">{q.number}</TableCell>
                      <TableCell>{q.client.lastName}, {q.client.firstName}</TableCell>
                      <TableCell className="text-sm">{q.vehicle.plate || `${q.vehicle.brand} ${q.vehicle.model}`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(q.date)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(q.total)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QUOTE_STATUS[q.status]?.color}`}>
                          {QUOTE_STATUS[q.status]?.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(q)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handlePrint(q)}
                            disabled={printing === q.id} title="Imprimir / Guardar PDF">
                            {printing === q.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Printer className="h-4 w-4" />
                            }
                          </Button>
                          {q.status === 'APPROVED' && (
                            <Button size="icon" variant="ghost" onClick={() => handleConvert(q)} title="Convertir a trabajo" className="text-green-600">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(q)} className="text-destructive hover:text-destructive" title="Eliminar">
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

      {/* ── Dialog crear / editar ── */}
      <Dialog open={!!dialog} onClose={closeDialog}>
        <DialogContent onClose={closeDialog} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialog === 'create' ? 'Nuevo presupuesto' : `Editar ${selected?.number}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

            {/* ── Cliente y Vehículo con búsqueda ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Cliente *
                </label>
                <SearchDropdown
                  icon={User}
                  placeholder="Buscar por nombre, DNI o teléfono..."
                  value={selectedClient?.label}
                  onSearch={searchClients}
                  onSelect={selectClient}
                  onClear={clearClient}
                  results={clientSearchResults}
                  loading={clientSearchLoading}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Vehículo *
                  {!selectedClient && <span className="text-xs text-slate-400 font-normal ml-1">(o buscá por patente)</span>}
                </label>
                <SearchDropdown
                  icon={Car}
                  placeholder={selectedClient ? 'Seleccionar vehículo...' : 'Buscar por patente o marca...'}
                  value={selectedVehicle?.label}
                  onSearch={selectedClient ? () => {} : searchVehicles}
                  onSelect={selectVehicle}
                  onClear={clearVehicle}
                  results={selectedClient ? vehicleResults : vehicleResults}
                  loading={vehicleLoading}
                  disabled={false}
                />
                {/* Km del vehículo seleccionado */}
                {selectedVehicleRaw?.mileage ? (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Kilometraje registrado: <strong>{selectedVehicleRaw.mileage.toLocaleString('es-AR')} km</strong>
                  </p>
                ) : null}
                {/* Si hay cliente pero sin vehículos */}
                {selectedClient && vehicleResults.length === 0 && !vehicleLoading && !selectedVehicle && (
                  <p className="text-xs text-amber-600 mt-1">
                    Este cliente no tiene vehículos registrados.
                  </p>
                )}
              </div>
            </div>

            {/* ── Estado y fecha ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select className="mt-1" value={form.status} onChange={e => setField('status', e.target.value)}>
                  <option value="DRAFT">Borrador</option>
                  <option value="SENT">Enviado</option>
                  <option value="APPROVED">Aprobado</option>
                  <option value="REJECTED">Rechazado</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Válido hasta</label>
                <Input type="date" className="mt-1" value={form.validUntil} onChange={e => setField('validUntil', e.target.value)} />
              </div>
            </div>

            {/* ── Ítems / Repuestos ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Ítems / Repuestos</label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3 w-3" />Ítem en blanco
                </Button>
              </div>
              {/* Buscador de catálogo */}
              <div className="mb-3">
                <CatalogSearch onSelect={desc => setForm(f => ({
                  ...f,
                  items: [...f.items, { description: desc, quantity: '1', unitPrice: '0', subtotal: '0' }]
                }))} />
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        placeholder="Descripción"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Cant." min="0" step="0.01"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="P.Unit." min="0" step="0.01"
                        value={item.unitPrice}
                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input readOnly value={formatCurrency(parseFloat(item.subtotal) || 0)}
                        className="bg-slate-50 text-right text-sm" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} className="text-destructive h-8 w-8">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {form.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                    Sin ítems. Buscá en el catálogo o hacé clic en "Ítem en blanco".
                  </p>
                )}
              </div>
            </div>

            {/* ── Mano de obra y total ── */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-sm font-medium">Mano de obra ($)</label>
                <Input type="number" min="0" step="0.01" className="mt-1"
                  value={form.laborCost}
                  onChange={e => setField('laborCost', e.target.value)}
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-2xl font-black text-primary">{formatCurrency(grandTotal)}</p>
              </div>
            </div>

            {/* ── Observaciones ── */}
            <div>
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea className="mt-1" rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Guardar presupuesto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
