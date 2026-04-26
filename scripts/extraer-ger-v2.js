/**
 * Extractor v2 de archivos .ger (Clarion TPS) del SPC-GE
 * Ejecutar con: node extraer-ger-v2.js
 *
 * Basado en ingeniería inversa del formato binario de SPC-GE:
 * - Bloques de 256 bytes, padding con 0xB0
 * - Strings prefijados: [tipo 0x03][largo][field_id 0x01][field_type 0x03][texto]
 * - Referencias NUMSERV en big-endian 2 bytes
 *
 * Genera CSVs en exportados/ con los datos recuperados.
 */

const fs   = require('fs');
const path = require('path');

const DATOS_PATH = path.resolve(__dirname, '..', '..', 'SPC-GE', 'Datos');
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'exportados');
const BLOCK_SIZE = 256;

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Lee todos los bloques de 256 bytes de un archivo TPS */
function readBlocks(filePath) {
  const buf = fs.readFileSync(filePath);
  const blocks = [];
  for (let i = 0; i + BLOCK_SIZE <= buf.length; i += BLOCK_SIZE) {
    blocks.push(buf.slice(i, i + BLOCK_SIZE));
  }
  return blocks;
}

/** Verifica si un bloque tiene la firma TPS en el header (solo bloque 0) */
function hasTPSSignature(buf) {
  if (buf.length < 0x12) return false;
  return buf[0x0E] === 0x74 && buf[0x0F] === 0x4F &&
         buf[0x10] === 0x70 && buf[0x11] === 0x53;
}

/** Obtiene el freeOffset de un bloque (bytes 4-5, little-endian) */
function getFreeOffset(block) {
  return block[4] + block[5] * 256;
}

/** Extrae strings del tipo Clarion TPS dentro de un bloque.
 *  Patrón encontrado: [0x03][total_len][0x01][0x03][texto]
 *  O directamente: texto legible en campos fijos.
 */
function extractStringsFromBlock(block) {
  const freeOff = Math.min(getFreeOffset(block), BLOCK_SIZE);
  const data    = block.slice(0, freeOff);
  const enc     = 'latin1';
  const found   = [];

  for (let i = 8; i < data.length - 4; i++) {
    // Patrón 1: marcador 0x03 + largo + 0x01 + 0x03 + texto
    if (data[i] === 0x03) {
      const len = data[i + 1];
      if (len >= 4 && len <= 80 && i + 2 + len <= data.length) {
        // Salta field_id (0x01) y field_type (0x03)
        const strStart = i + 4;
        const strLen   = len - 2;
        if (strLen > 0 && strStart + strLen <= data.length) {
          const raw = data.slice(strStart, strStart + strLen).toString(enc);
          const str = raw.replace(/\xB0+$/, '').replace(/\x00+$/, '').trim();
          if (str.length >= 3 && isPrintable(str)) {
            found.push({ value: str, offset: i, type: 'string' });
          }
        }
      }
    }
    // Patrón 2: texto legible de >= 4 chars directamente
    if (isPrintableChar(data[i]) && i + 4 <= data.length) {
      let j = i;
      while (j < data.length && isPrintableChar(data[j])) j++;
      const len = j - i;
      if (len >= 4 && len <= 60) {
        const str = data.slice(i, j).toString(enc).trim();
        if (str.length >= 4 && isPrintable(str)) {
          found.push({ value: str, offset: i, type: 'raw', end: j });
          i = j - 1;
        }
      }
    }
  }
  return found;
}

function isPrintableChar(b) {
  return (b >= 0x20 && b <= 0x7E) || (b >= 0xC0 && b <= 0xFF);
}
function isPrintable(str) {
  const printable = [...str].filter(c => {
    const cc = c.charCodeAt(0);
    return (cc >= 0x20 && cc <= 0x7E) || cc >= 0xC0;
  }).length;
  return printable >= str.length * 0.75;
}

/** Extrae referencias NUMSERV (big-endian 2 bytes) que siguen a un string */
function extractNumservRefs(block, afterOffset) {
  const freeOff = Math.min(getFreeOffset(block), BLOCK_SIZE);
  const refs = [];
  // Buscar pares de bytes big-endian con valor 1-3661 en el resto del bloque
  for (let i = afterOffset; i < freeOff - 1; i++) {
    const val = block[i] * 256 + block[i + 1]; // big-endian
    if (val >= 1 && val <= 3661) {
      // Verificar que el byte siguiente no forme también un NUMSERV
      // (filtrar falsos positivos)
      refs.push(val);
    }
  }
  // Desduplicar y filtrar ruido
  return [...new Set(refs)].filter(v => v >= 1 && v <= 3661);
}

// ─── Extractor sgc00006.ger (Catálogo de reparaciones) ───────────────────────

/**
 * Patrón descubierto por ingeniería inversa en sgc00006.ger:
 *   [0x08] [CODREPA_lo 1-250] [0x00] [byte_precio_1] [DESCRIPCION_texto] [byte_precio_2...] [0x08] ...
 *
 * - 0x08 es el separador de registro (byte fijo de control)
 * - CODREPA está en little-endian 16-bit (hi-byte casi siempre 0x00)
 * - El byte siguiente es el primer byte del campo precio (a veces printable ASCII)
 * - La DESCRIPCION termina con un espacio antes del campo precio
 *
 * Estrategia de limpieza: cortar en el ÚLTIMO espacio del texto leído
 * (el primer byte del precio puede ser ASCII, así que se lee como parte del texto
 *  pero siempre queda pegado al último espacio de la descripción real)
 */
function extractRepairCatalog(filePath) {
  const buf  = fs.readFileSync(filePath);
  const enc  = 'latin1';
  const recs = [];
  const seen = new Set();

  for (let i = 0; i < buf.length - 20; i++) {
    // Buscar el marcador 0x08 seguido de [CODREPA 1-250] [0x00] [any_byte]
    if (buf[i] !== 0x08) continue;
    const codLo = buf[i + 1];
    const codHi = buf[i + 2];
    if (codLo < 1 || codLo > 250 || codHi !== 0x00) continue;

    // El texto comienza en i+4 (saltamos el byte de precio_1)
    const textStart = i + 4;
    if (textStart >= buf.length) continue;
    if (!isPrintableChar(buf[textStart])) continue; // primer char debe ser printable

    // Leer hasta char no-printable o 0xB0 o máx 80 chars
    let j = textStart;
    while (j < buf.length && isPrintableChar(buf[j]) && j - textStart < 80) j++;
    if (j - textStart < 4) continue;

    // Texto leído: puede incluir 1 byte de precio al final (printable)
    // La descripción real siempre termina con un espacio antes del precio
    const rawText = buf.slice(textStart, j).toString(enc);
    const lastSp  = rawText.lastIndexOf(' ');
    const desc    = (lastSp >= 3 ? rawText.slice(0, lastSp) : rawText).trim();

    if (desc.length < 3) continue;
    if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(desc)) continue;
    if (!isPrintable(desc)) continue;

    const codrepa = codLo; // hi-byte es siempre 0 para códigos razonables
    const key     = desc.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      recs.push({ codrepa, descripcion: desc });
    }
  }

  // Ordenar: primero por codrepa, luego alfabético
  recs.sort((a, b) => a.codrepa - b.codrepa || a.descripcion.localeCompare(b.descripcion));
  return recs;
}

// ─── Extractor sgc00019.ger (Repuestos por servicio) ─────────────────────────

/**
 * sgc00019.ger es un índice B-tree de DESCRIPCION → lista de NUMSERV.
 * Estructura por bloque (hoja del B-tree):
 *   header 16 bytes + sub-header 10 bytes +
 *   [03][totalLen][01][03][DESCRIPCION] +
 *   lista de NUMSERV: separadores con patrón ... 00 00 [BE16] ...
 *
 * Cada hoja tiene exactamente UN descriptor de texto y su lista de NUMSERV.
 * Solo se extrae NUMSERV de bloques que tengan un descriptor válido.
 */
function extractRepuestosPorServicio(filePath) {
  const buf    = fs.readFileSync(filePath);
  const enc    = 'latin1';
  const result = [];
  const seen   = new Set();

  for (let blockStart = BLOCK_SIZE; blockStart + BLOCK_SIZE <= buf.length; blockStart += BLOCK_SIZE) {
    const block   = buf.slice(blockStart, blockStart + BLOCK_SIZE);
    const freeOff = Math.min(getFreeOffset(block), BLOCK_SIZE);
    if (freeOff < 20) continue;

    // Buscar el marcador 0x03 del descriptor de string
    // Patrón: [0x03][totalLen 5-80][0x01=field_id][field_type][texto que empieza con letra]
    // Buscamos desde offset 12 (después del header) hasta máx offset 50
    let strFound = false;
    for (let i = 12; i < Math.min(50, freeOff - 6); i++) {
      if (block[i] !== 0x03) continue;
      const totalLen = block[i + 1];
      if (totalLen < 5 || totalLen > 80) continue;
      if (block[i + 2] !== 0x01) continue;
      // field_type en i+3 (0x03 u otro tipo según versión)

      const strLen = totalLen - 2;
      const strEnd = i + 4 + strLen;
      if (strEnd > freeOff) continue;

      // El texto debe empezar con una letra (filtro fuerte anti-falsos positivos)
      const firstByte = block[i + 4];
      const isLetter = (firstByte >= 0x41 && firstByte <= 0x5A) ||   // A-Z
                       (firstByte >= 0x61 && firstByte <= 0x7A) ||   // a-z
                       (firstByte >= 0xC0 && firstByte <= 0xFF);     // Latin ext.
      if (!isLetter) continue;

      const rawStr = block.slice(i + 4, strEnd).toString(enc);
      const desc   = rawStr.replace(/[\xB0\x00\s]+$/, '').trim();
      if (desc.length < 3 || !isPrintable(desc)) continue;

      // Extraer NUMSERV desde strEnd hasta freeOff
      const numservs = extractNumservRefsFromBuffer(block, strEnd, freeOff);

      const key = desc.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ descripcion: desc, numservs });
      } else {
        // Agregar NUMSERV a la entrada existente (sin duplicar)
        const existing = result.find(r => r.descripcion.toLowerCase() === key);
        if (existing) {
          const combined = new Set([...existing.numservs, ...numservs]);
          existing.numservs = [...combined].sort((a, b) => a - b);
        }
      }
      strFound = true;
      break; // un descriptor por bloque
    }
  }

  return result;
}

/**
 * Extrae NUMSERV (BE16, precedidos por 00 00) y los agrega al Set.
 * Patrón: ... [xx] [xx] 00 00 [hi] [lo] ...
 * donde [hi][lo] big-endian y el valor está en rango 1-3661.
 */
function extractNumservRefsIntoSet(block, start, end, targetSet) {
  for (let i = start + 2; i < end - 1; i++) {
    if (block[i - 1] === 0x00 && block[i - 2] === 0x00) {
      const be16 = block[i] * 256 + block[i + 1];
      if (be16 >= 1 && be16 <= 3661) {
        targetSet.add(be16);
      }
    }
  }
}

// Mantener compatibilidad con llamadas existentes
function extractNumservRefsFromBuffer(block, start, end) {
  const s = new Set();
  extractNumservRefsIntoSet(block, start, end, s);
  return [...s].sort((a, b) => a - b);
}

// ─── Generador CSV ────────────────────────────────────────────────────────────

function toCSV(records, fields) {
  if (!records.length) return '';
  const header = fields.join(';');
  const rows   = records.map(r =>
    fields.map(f => `"${String(r[f] ?? '').replace(/"/g, "'")}"` ).join(';')
  );
  return '﻿' + [header, ...rows].join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('='.repeat(62));
  console.log('  Extractor v2 de datos SPC-GE → CSV');
  console.log('  Taller El Cordobés');
  console.log('='.repeat(62));

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── 1. Catálogo de reparaciones (sgc00006.ger) ──────────────────────────
  const repCatFile = path.join(DATOS_PATH, 'sgc00006.ger');
  if (fs.existsSync(repCatFile)) {
    process.stdout.write('\n📂 Extrayendo catálogo de reparaciones (sgc00006.ger)... ');
    try {
      const catalog = extractRepairCatalog(repCatFile);
      if (catalog.length > 0) {
        const csvPath = path.join(OUTPUT_DIR, 'CatalogoReparaciones.csv');
        fs.writeFileSync(csvPath, toCSV(catalog, ['codrepa', 'descripcion']), 'utf8');
        console.log(`${catalog.length} tipos`);
        console.log(`   ✅ ${csvPath}`);
        // Mostrar muestra
        console.log('   Muestra:');
        catalog.slice(0, 8).forEach(r =>
          console.log(`     CODREPA ${r.codrepa}: ${r.descripcion}`)
        );
      } else {
        console.log('0 registros');
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }

  // ── 2. Repuestos por servicio (sgc00019.ger) ────────────────────────────
  const rpsFile = path.join(DATOS_PATH, 'sgc00019.ger');
  if (fs.existsSync(rpsFile)) {
    process.stdout.write('\n📂 Extrayendo repuestos por servicio (sgc00019.ger)... ');
    try {
      const rps = extractRepuestosPorServicio(rpsFile);

      // Aplanar en filas: una fila por (descripcion, numserv)
      const rows = [];
      for (const entry of rps) {
        if (entry.numservs.length > 0) {
          for (const ns of entry.numservs) {
            rows.push({ numserv: ns, descripcion: entry.descripcion });
          }
        } else {
          rows.push({ numserv: '', descripcion: entry.descripcion });
        }
      }
      rows.sort((a, b) => (a.numserv || 0) - (b.numserv || 0));

      const totalDesc = rps.length;
      const totalRows = rows.filter(r => r.numserv).length;

      if (rows.length > 0) {
        const csvPath = path.join(OUTPUT_DIR, 'RepuestosPorServicio_v2.csv');
        fs.writeFileSync(csvPath, toCSV(rows, ['numserv', 'descripcion']), 'utf8');
        console.log(`${totalDesc} descripciones → ${totalRows} links con NUMSERV`);
        console.log(`   ✅ ${csvPath}`);
        // Muestra
        console.log('   Muestra (primeros 10 registros por NUMSERV):');
        rows.filter(r => r.numserv).slice(0, 10).forEach(r =>
          console.log(`     NUMSERV ${r.numserv}: ${r.descripcion}`)
        );
      } else {
        console.log('0 registros');
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }

  // ── 3. Escaneo general de todos los .ger accesibles ──────────────────────
  console.log('\n📂 Escaneo general de strings en archivos pequeños...');
  const smallFiles = [
    { file: 'sgc00002.ger', name: 'Marcas' },
    { file: 'sgc00003.ger', name: 'Modelos' },
    { file: 'sgc00004.ger', name: 'Operarios' },
    { file: 'sgc00020.ger', name: 'Proveedores' },
    { file: 'sgc00001.ger', name: 'Vehiculos' },
  ];
  for (const { file, name } of smallFiles) {
    const fp = path.join(DATOS_PATH, file);
    if (!fs.existsSync(fp)) continue;
    const buf = fs.readFileSync(fp);
    const enc = 'latin1';
    const text = buf.toString(enc, 0x200); // saltar header
    const matches = [...text.matchAll(/[A-Za-zÁÉÍÓÚáéíóúñÑüÜ .,\-\/()0-9]{3,}/g)]
      .map(m => m[0].trim())
      .filter(s => s.length >= 3 && isPrintable(s) && !['tOpS'].includes(s));
    const unique = [...new Set(matches)].filter(s => s.length >= 3);
    if (unique.length > 0) {
      console.log(`   ${name} (${file}): ${unique.length} strings`);
      unique.slice(0, 6).forEach(s => console.log(`     "${s}"`));
    }
  }

  // ── Resumen y próximos pasos ──────────────────────────────────────────────
  console.log('\n' + '='.repeat(62));
  console.log('  SITUACIÓN ACTUAL DE LA EXTRACCIÓN');
  console.log('='.repeat(62));
  console.log(`
✅ RepuestosPorServicio_v2.csv  — Descripción de trabajos por N° de servicio
✅ CatalogoReparaciones.csv     — Catálogo de tipos de reparación
⚠️  sgc00007.ger (Servicios)    — Solo contiene índice B-tree (TIPO field)
                                   Las fechas/importes están en formato binario no decodificado
🔒 sgc00010.ger (Clientes)      — Encriptado, no accesible

PRÓXIMO PASO RECOMENDADO:
  1. Abrí SPC-GE → Listado de Servicios → Imprimir/Exportar
     Si el software tiene alguna opción de "Imprimir listado" o
     "Exportar", esa es la forma más fácil de obtener fechas y montos.

  2. Si necesitás los datos completos de servicios sin usar SPC-GE,
     el archivo sgc00007.ger necesita más análisis del formato binario.
     Podés compartirme el archivo y lo analizo más en detalle.

  3. Los CSVs generados (RepuestosPorServicio_v2.csv) ya te dan
     QUÉ trabajos se hicieron en cada servicio. Las fechas y montos
     los podés completar manualmente para los servicios más importantes.
`);
}

main();
