/**
 * buildPrintHTML — genera el HTML listo para imprimir de un presupuesto/comprobante.
 *
 * @param {object} quote       — datos del presupuesto (incluye client, vehicle, items)
 * @param {object} workshop    — datos del taller (de settingsApi)
 * @param {object} options     — opciones extra:
 *   - docTitle   {string}  título del documento (default: 'Presupuesto')
 *   - mileageIn  {number}  km de entrada del trabajo (reemplaza vehicle.mileage en el print)
 */
export function buildPrintHTML(quote, workshop = {}, options = {}) {
  const workshopName = workshop.workshopName || 'El Cordobés';
  const docTitle     = options.docTitle || 'Presupuesto';
  const fmt    = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const statusLabel = { DRAFT: 'Borrador', SENT: 'Enviado', APPROVED: 'Aprobado', REJECTED: 'Rechazado' };
  const statusColor = { DRAFT: '#6b7280', SENT: '#1e40af', APPROVED: '#065f46', REJECTED: '#991b1b' };
  const statusBg    = { DRAFT: '#f3f4f6', SENT: '#dbeafe', APPROVED: '#d1fae5', REJECTED: '#fee2e2' };

  const itemsTotal = quote.items.reduce((a, i) => a + parseFloat(i.subtotal || 0), 0);
  const laborCost  = parseFloat(quote.laborCost || 0);
  const total      = parseFloat(quote.total ?? (itemsTotal + laborCost));

  // Kilometraje: prioridad mileageIn del trabajo, luego vehicle.mileage
  const mileageValue = options.mileageIn ?? quote.vehicle?.mileage;

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
  <title>${docTitle} ${quote.number}</title>
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
      <h2>${docTitle}</h2>
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
        ${mileageValue ? `Kilometraje: ${Number(mileageValue).toLocaleString('es-AR')} km<br>` : ''}
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

  ${quote.notes ? `<div class="notes"><h3>Descripción del trabajo</h3><p style="white-space:pre-line">${quote.notes}</p></div>` : ''}

  <div class="footer">
    <p>${workshopName} — ${docTitle} N° ${quote.number} — Generado el ${fmtDate(new Date())}</p>
    <p style="margin-top:4px">Este comprobante no constituye un comprobante fiscal.</p>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
}
