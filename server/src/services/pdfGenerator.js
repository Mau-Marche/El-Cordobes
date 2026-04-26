const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildQuoteHTML(quote) {
  const { readSettings } = require('../routes/settings');
  const s = readSettings();
  const workshop = {
    name: s.workshopName || process.env.WORKSHOP_NAME || 'El Cordobés',
    address: s.workshopAddress || process.env.WORKSHOP_ADDRESS || '',
    phone: s.workshopPhone || process.env.WORKSHOP_PHONE || '',
    email: s.workshopEmail || process.env.WORKSHOP_EMAIL || '',
    cuit: s.workshopCuit || process.env.WORKSHOP_CUIT || '',
  };

  const itemsRows = quote.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="center">${parseFloat(item.quantity)}</td>
      <td class="right">${formatCurrency(item.unitPrice)}</td>
      <td class="right">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');

  const laborRow = parseFloat(quote.laborCost) > 0 ? `
    <tr class="labor-row">
      <td><strong>Mano de obra</strong></td>
      <td class="center">1</td>
      <td class="right">${formatCurrency(quote.laborCost)}</td>
      <td class="right">${formatCurrency(quote.laborCost)}</td>
    </tr>
  ` : '';

  const validUntilText = quote.validUntil
    ? `<p><strong>Válido hasta:</strong> ${formatDate(quote.validUntil)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 20px; }
    .workshop-name { font-size: 24px; font-weight: bold; color: #1e3a5f; }
    .workshop-info { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.6; }
    .quote-title { text-align: right; }
    .quote-title h2 { font-size: 18px; color: #1e3a5f; text-transform: uppercase; letter-spacing: 1px; }
    .quote-number { font-size: 22px; font-weight: bold; color: #e65c00; margin-top: 4px; }
    .quote-date { font-size: 11px; color: #666; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .info-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: #f9f9f9; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 0.5px; }
    .info-box p { font-size: 12px; line-height: 1.7; }
    .info-box strong { color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead th { background: #1e3a5f; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th.center { text-align: center; }
    thead th.right { text-align: right; }
    tbody tr { border-bottom: 1px solid #eee; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    tbody td { padding: 8px 10px; vertical-align: top; }
    tbody td.center { text-align: center; }
    tbody td.right { text-align: right; }
    .labor-row td { background: #fff8f0; }
    .totals { display: flex; justify-content: flex-end; margin-top: 8px; }
    .totals-box { border: 2px solid #1e3a5f; border-radius: 6px; padding: 12px 20px; min-width: 200px; }
    .total-row { display: flex; justify-content: space-between; font-size: 11px; color: #555; margin-bottom: 4px; }
    .total-final { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #1e3a5f; border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px; }
    .notes-section { margin-top: 20px; padding: 12px; background: #f9f9f9; border-left: 4px solid #1e3a5f; border-radius: 0 6px 6px 0; }
    .notes-section h3 { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 6px; }
    .footer { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; text-align: center; font-size: 10px; color: #999; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-DRAFT { background: #f3f4f6; color: #6b7280; }
    .status-SENT { background: #dbeafe; color: #1e40af; }
    .status-APPROVED { background: #d1fae5; color: #065f46; }
    .status-REJECTED { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="workshop-name">${workshop.name}</div>
      <div class="workshop-info">
        ${workshop.address ? `<span>📍 ${workshop.address}</span><br>` : ''}
        ${workshop.phone ? `<span>📞 ${workshop.phone}</span><br>` : ''}
        ${workshop.email ? `<span>✉ ${workshop.email}</span><br>` : ''}
        ${workshop.cuit ? `<span>CUIT: ${workshop.cuit}</span>` : ''}
      </div>
    </div>
    <div class="quote-title">
      <h2>Presupuesto</h2>
      <div class="quote-number"># ${quote.number}</div>
      <div class="quote-date">${formatDate(quote.date)}</div>
      <div style="margin-top:6px"><span class="status-badge status-${quote.status}">${{ DRAFT: 'Borrador', SENT: 'Enviado', APPROVED: 'Aprobado', REJECTED: 'Rechazado' }[quote.status]}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Cliente</h3>
      <p>
        <strong>${quote.client.lastName}, ${quote.client.firstName}</strong><br>
        ${quote.client.dni ? `DNI/CUIT: ${quote.client.dni}<br>` : ''}
        ${quote.client.phone ? `Tel: ${quote.client.phone}<br>` : ''}
        ${quote.client.email ? `${quote.client.email}<br>` : ''}
        ${quote.client.address ? `${quote.client.address}` : ''}
      </p>
    </div>
    <div class="info-box">
      <h3>Vehículo</h3>
      <p>
        <strong>${quote.vehicle.brand} ${quote.vehicle.model}</strong>
        ${quote.vehicle.year ? ` (${quote.vehicle.year})` : ''}<br>
        ${quote.vehicle.plate ? `Patente: <strong>${quote.vehicle.plate}</strong><br>` : ''}
        ${quote.vehicle.mileage ? `Km: ${quote.vehicle.mileage.toLocaleString('es-AR')}<br>` : ''}
        ${quote.vehicle.chassisNumber ? `Chasis: ${quote.vehicle.chassisNumber}` : ''}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="center" style="width:80px">Cant.</th>
        <th class="right" style="width:120px">P. Unitario</th>
        <th class="right" style="width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      ${laborRow}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal repuestos:</span>
        <span>${formatCurrency(quote.items.reduce((a, i) => a + parseFloat(i.subtotal), 0))}</span>
      </div>
      ${parseFloat(quote.laborCost) > 0 ? `
      <div class="total-row">
        <span>Mano de obra:</span>
        <span>${formatCurrency(quote.laborCost)}</span>
      </div>` : ''}
      <div class="total-final">
        <span>TOTAL:</span>
        <span>${formatCurrency(quote.total)}</span>
      </div>
    </div>
  </div>

  ${validUntilText ? `<div style="margin-top:12px; text-align:right; font-size:11px; color:#666">${validUntilText}</div>` : ''}

  ${quote.notes ? `
  <div class="notes-section">
    <h3>Observaciones</h3>
    <p>${quote.notes}</p>
  </div>` : ''}

  <div class="footer">
    <p>${workshop.name} — Presupuesto N° ${quote.number} — Generado el ${formatDate(new Date())}</p>
    <p style="margin-top:4px">Los precios incluyen IVA. Este presupuesto no constituye un comprobante fiscal.</p>
  </div>
</body>
</html>`;
}

async function generateQuotePDF(quote) {
  const html = buildQuoteHTML(quote);
  const pdfDir = path.resolve(process.env.PDFS_PATH || './uploads/pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const filename = `presupuesto-${quote.number}-${Date.now()}.pdf`;
  const filepath = path.join(pdfDir, filename);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filepath,
      format: 'A4',
      margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }

  return { filename, path: `/uploads/pdfs/${filename}` };
}

module.exports = { generateQuotePDF };
