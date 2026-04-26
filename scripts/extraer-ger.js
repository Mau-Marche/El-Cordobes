/**
 * Extractor de archivos .ger (Clarion TPS) del SPC-GE
 * Ejecutar con: node extraer-ger.js
 * Requiere Node.js instalado.
 *
 * Genera CSVs en la carpeta "exportados/" listos para importar a El Cordobés.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuración ────────────────────────────────────────────────────────────
const DATOS_PATH = path.resolve(__dirname, '..', '..', 'SPC-GE', 'Datos');
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'exportados');
const ENCODING = 'latin1'; // Windows-1252 / Latin-1

// ─── Schemas conocidos de los archivos ───────────────────────────────────────
// Extraídos del análisis binario de los archivos .ger
const SCHEMAS = {
  'sgc00002.ger': { name: 'Marcas',    prefix: 'MAR', fields: ['CODINT', 'MARCA'] },
  'sgc00003.ger': { name: 'Modelos',   prefix: 'MOD', fields: ['CODINTMARCA', 'CODINTMODEO', 'MODELO'] },
  'sgc00004.ger': { name: 'Operarios', prefix: 'OPE', fields: ['CODIOPE', 'NOMBRE', 'DOMICILIO', 'TELEFONO', 'OBSERVACIONES'] },
  'sgc00020.ger': { name: 'Proveedores', prefix: 'PRO', fields: ['IDPROVEEDOR', 'RAZONSOCIAL', 'DIRECCION1', 'DIRECCION2', 'LOCALIDAD', 'PROVINCIA', 'TELEFONO1', 'TELEFONO2', 'CONTACTO', 'EMAIL', 'RUBRO', 'OBSERVACIONES'] },
  'sgc00007.ger': { name: 'Servicios', prefix: 'SER', fields: ['NUMSERV', 'CODINT', 'CODMARCA', 'CODMODELO', 'CODREPA', 'FECHA', 'KILOMETRAJE', 'PROBLEMA', 'REALIZADO', 'IMPORTE', 'IMPORTEMO', 'IMPORTEREP', 'RESPONSABLE', 'FECHAENTREGA', 'IDTITULAR', 'DOMINIO', 'OBSERVACIONES', 'MANOOBRA', 'DETALLE', 'TIPO'] },
  'sgc00019.ger': { name: 'RepuestosPorServicio', prefix: 'RPS', fields: ['NUMSERV', 'CODINT', 'CODREPA', 'DESCRIPCION', 'PERIODO', 'IMPORTE', 'SUGERIDO', 'APROBADO', 'REALIZADO'] },
  'sgc00011.ger': { name: 'Stock',     prefix: 'REP1', fields: ['CODINTREP', 'DESCRIPCION', 'MARCA', 'PROCEDENCIA', 'IMPORTE', 'CODIGO', 'STOCK', 'LISTA1', 'LISTA2', 'SISTEMA'] },
  'sgc00001.ger': { name: 'Vehiculos', prefix: 'AVI',  fields: ['CODINT', 'IDTITULAR', 'ULTKIM', 'PROXKIM'] },
};

// ─── Parser TPS ──────────────────────────────────────────────────────────────

const TPS_SIGNATURE = Buffer.from([0x74, 0x4F, 0x70, 0x53]); // "tOpS"
const PAGE_SIZE = 0x200; // 512 bytes

/**
 * Lee un archivo TPS y devuelve un array de registros (objetos planos).
 * Implementación basada en el formato Clarion TPS.
 */
function readTPS(filePath, schema) {
  const buf = fs.readFileSync(filePath);
  const records = [];

  // Verificar firma
  const sig = buf.slice(0x0E, 0x12);
  if (!sig.equals(TPS_SIGNATURE)) {
    return { error: 'No es un archivo TPS estándar (posiblemente encriptado)', records: [] };
  }

  // Extraer strings del archivo — enfoque robusto para SPC-GE
  // Los strings en Clarion TPS se almacenan como datos en páginas de datos
  // Usamos extracción de strings con contexto del schema para reconstruir registros
  const strings = extractStringsFromBuffer(buf);
  const fieldNames = schema ? schema.fields : [];

  // Agrupar strings en posibles registros usando patrones del esquema
  const grouped = groupStringsIntoRecords(strings, fieldNames, buf, filePath);
  return { records: grouped, fieldNames };
}

/**
 * Extrae todos los strings imprimibles de longitud >= 2 del buffer.
 * Incluye offset para poder reconstruir el orden.
 */
function extractStringsFromBuffer(buf) {
  const results = [];
  let i = 0x400; // saltar el header TPS

  while (i < buf.length - 2) {
    // Clarion guarda strings como: [byte longitud][datos...]
    // pero también pueden ser campos fijos con padding de espacios/nulos
    const len = buf[i];
    if (len >= 2 && len <= 120 && (i + len) < buf.length) {
      const slice = buf.slice(i + 1, i + 1 + len);
      // Verificar que sea texto legible (latin1)
      const printable = [...slice].filter(b => (b >= 0x20 && b <= 0x7E) || b >= 0xC0).length;
      if (printable >= Math.floor(len * 0.7)) {
        const str = slice.toString('latin1').replace(/\x00/g, '').trim();
        if (str.length >= 2) {
          results.push({ offset: i, len, value: str });
          i += len + 1;
          continue;
        }
      }
    }
    i++;
  }
  return results;
}

/**
 * Intenta reconstruir registros a partir de los strings extraídos.
 * Para archivos con muchos datos (SER, RPS), usa ventanas deslizantes.
 */
function groupStringsIntoRecords(strings, fieldNames, buf, filePath) {
  const records = [];
  const fileName = path.basename(filePath);

  // Para el archivo de servicios (SER) — el más importante
  if (fileName === 'sgc00007.ger') {
    return extractServiciosRecords(buf);
  }

  // Para RPS (repuestos por servicio)
  if (fileName === 'sgc00019.ger') {
    return extractRPSRecords(buf);
  }

  // Para archivos pequeños: agrupar strings secuencialmente
  // según la cantidad de campos del schema
  if (fieldNames.length === 0) return strings.map(s => ({ value: s.value }));

  let i = 0;
  while (i < strings.length) {
    const record = {};
    let valid = false;

    for (let f = 0; f < fieldNames.length && i + f < strings.length; f++) {
      const fieldName = fieldNames[f];
      const val = strings[i + f]?.value || '';
      // Filtrar nombres de campos del schema (son parte del header, no datos)
      if (!isSchemaField(val)) {
        record[fieldName] = val;
        valid = true;
      }
    }

    if (valid) records.push(record);
    i += Math.max(1, fieldNames.length);
  }

  return records;
}

/**
 * Extractor especializado para sgc00007.ger (Servicios/Trabajos)
 * Este es el archivo más valioso — contiene todo el historial de servicios.
 */
function extractServiciosRecords(buf) {
  const records = [];
  const enc = 'latin1';
  let pos = 0x200; // offset de inicio de datos

  // Los registros de SER tienen un patrón identificable:
  // Buscamos bloques que contengan DOMINIO (patente) + PROBLEMA (descripción)
  // Los datos están en páginas de 512 bytes con estructura variable

  // Enfoque: escanear todo el buffer buscando patrones de registro
  // Un registro SER tiene: número de servicio (SHORT), fecha (LONG), dominio (STRING), etc.

  // Escanear por patentes (formato argentino o strings no-schema)
  const rawText = buf.toString(enc, 0x200);

  // Extraer bloques de texto entre marcadores de registro
  // En TPS, cada página de datos empieza con flags + count + freeOffset
  for (let page = 1; page < Math.floor(buf.length / 512); page++) {
    const pageStart = page * 512;
    const pageFlag = buf[pageStart];

    // Páginas de datos tienen flags específicos (0x80, 0xC0, etc.)
    if (pageFlag !== 0x80 && pageFlag !== 0xC0 && pageFlag !== 0x00 && pageFlag !== 0x02) continue;

    const recordCount = buf.readUInt16LE(pageStart + 1);
    if (recordCount === 0 || recordCount > 50) continue;

    // Leer registros dentro de la página
    let offset = pageStart + 6; // saltar header de página (flags+count+freeOffset)
    for (let r = 0; r < recordCount && offset < pageStart + 512 - 4; r++) {
      const recLen = buf.readUInt16LE(offset);
      if (recLen === 0 || recLen > 490) { offset += 2; continue; }

      const recData = buf.slice(offset + 2, offset + 2 + recLen);
      const record = parseServicioRecord(recData);
      if (record && (record.dominio || record.problema || record.importe)) {
        records.push(record);
      }
      offset += 2 + recLen;
    }
  }

  // Si no encontramos registros con el parser de páginas, usar extracción de strings
  if (records.length === 0) {
    return extractByStringPattern(buf, [
      'NUMSERV', 'CODINT', 'CODMARCA', 'CODMODELO', 'FECHA',
      'KILOMETRAJE', 'PROBLEMA', 'REALIZADO', 'IMPORTE',
      'DOMINIO', 'OBSERVACIONES', 'MANOOBRA', 'TIPO'
    ]);
  }

  return records;
}

/**
 * Parsea un registro individual de la tabla SER.
 * En Clarion TPS, los campos tienen tipos fijos definidos en el schema.
 */
function parseServicioRecord(data) {
  if (data.length < 10) return null;
  try {
    const rec = {};
    let pos = 0;

    // NUMSERV: SHORT (2 bytes)
    if (pos + 2 <= data.length) { rec.numserv = data.readInt16LE(pos); pos += 2; }
    // CODINT: SHORT (2 bytes) — ID del vehículo/titular
    if (pos + 2 <= data.length) { rec.codint = data.readInt16LE(pos); pos += 2; }
    // CODMARCA: SHORT (2 bytes)
    if (pos + 2 <= data.length) { rec.codmarca = data.readInt16LE(pos); pos += 2; }
    // CODMODELO: SHORT (2 bytes)
    if (pos + 2 <= data.length) { rec.codmodelo = data.readInt16LE(pos); pos += 2; }
    // CODREPA: SHORT (2 bytes)
    if (pos + 2 <= data.length) { rec.codrepa = data.readInt16LE(pos); pos += 2; }
    // FECHA: LONG (4 bytes) — días desde 28/12/1800 (Clarion date)
    if (pos + 4 <= data.length) { rec.fecha = clarionDateToString(data.readInt32LE(pos)); pos += 4; }
    // HORAING: STRING (4 bytes fijos en Clarion, o variable)
    // KILOMETRAJE: LONG (4 bytes)
    if (pos + 4 <= data.length) { rec.kilometraje = data.readInt32LE(pos); pos += 4; }
    // Strings variables: PROBLEMA, REALIZADO, etc.
    const strings = extractStringsFromRecord(data, pos);
    Object.assign(rec, strings);

    return rec;
  } catch { return null; }
}

/**
 * Extrae strings de un record en formato Clarion (length-prefixed).
 */
function extractStringsFromRecord(data, startPos) {
  const fields = {};
  const fieldNames = ['problema', 'realizado', 'dominio', 'observaciones', 'manoobra', 'detalle', 'tipo'];
  let fieldIdx = 0;
  let pos = startPos;

  while (pos < data.length - 1 && fieldIdx < fieldNames.length) {
    const len = data[pos];
    if (len > 0 && len <= 200 && pos + 1 + len <= data.length) {
      const str = data.slice(pos + 1, pos + 1 + len).toString('latin1').replace(/\x00+$/, '').trim();
      if (str.length > 0) {
        fields[fieldNames[fieldIdx]] = str;
      }
      pos += 1 + len;
    } else {
      pos++;
    }
    fieldIdx++;
  }

  return fields;
}

/**
 * Extrae registros de RPS (repuestos por servicio).
 */
function extractRPSRecords(buf) {
  return extractByStringPattern(buf, [
    'numserv', 'codint', 'codrepa', 'descripcion', 'periodo', 'importe'
  ]);
}

/**
 * Extracción genérica por patrones de strings para archivos grandes.
 */
function extractByStringPattern(buf, fieldNames) {
  const records = [];
  const enc = 'latin1';
  let i = 0x400;
  let current = {};
  let fieldCount = 0;

  while (i < buf.length - 2) {
    const len = buf[i];
    if (len >= 2 && len <= 150 && (i + len + 1) < buf.length) {
      const slice = buf.slice(i + 1, i + 1 + len);
      const printable = [...slice].filter(b => (b >= 0x20 && b <= 0x7E) || b >= 0xC0).length;

      if (printable >= len * 0.65) {
        const str = slice.toString(enc).replace(/\x00/g, '').trim();
        if (str.length >= 1 && !isSchemaField(str)) {
          current[fieldNames[fieldCount % fieldNames.length]] = str;
          fieldCount++;
          if (fieldCount > 0 && fieldCount % fieldNames.length === 0) {
            if (Object.values(current).some(v => v.length > 1)) {
              records.push({ ...current });
            }
            current = {};
          }
          i += len + 1;
          continue;
        }
      }
    }
    i++;
  }
  return records;
}

/** Convierte fecha Clarion (días desde 28/12/1800) a string dd/mm/yyyy */
function clarionDateToString(clarionDate) {
  if (!clarionDate || clarionDate <= 0) return '';
  try {
    // Base: 28/12/1800 = día 1 en Clarion
    const base = new Date(1800, 11, 28); // mes 11 = diciembre (0-indexed)
    const ms = base.getTime() + (clarionDate - 1) * 86400000;
    const d = new Date(ms);
    if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return ''; }
}

/** Verifica si un string es un nombre de campo del schema (no dato real) */
function isSchemaField(str) {
  const schemaWords = ['CODINT', 'CODREPA', 'CLAX', 'CLAP', 'PORIDO', 'PORI', 'CLAPRIN', 'UNNAMED',
    'ABCDEFGH', 'abcdefgh', 'CODMARCA', 'CODMODELO', 'IDTITULAR', 'NUMSERV', 'HORAING',
    'HORAEGR', 'IMPORTE', 'PROBLEMA', 'REALIZADO', 'RESPONSABLE', 'DOMINIO', 'OBSERVACIONES',
    'MANOOBRA', 'DETALLE', 'INTERNO', 'FACTURADO', 'TIPO', 'EXTRA', 'MAR:', 'MOD:', 'SER:',
    'AVI:', 'OPE:', 'REP:', 'RPS:', 'PRO:', 'SOL:', 'CUE:', 'FOR:', 'TAR:', 'REC:'];
  return schemaWords.some(w => str.toUpperCase().startsWith(w));
}

// ─── Generador de CSV ─────────────────────────────────────────────────────────

function recordsToCSV(records) {
  if (!records || records.length === 0) return '';
  const headers = [...new Set(records.flatMap(r => Object.keys(r)))];
  const lines = [headers.join(';')];
  for (const rec of records) {
    const row = headers.map(h => {
      const val = String(rec[h] || '').replace(/;/g, ',').replace(/\n/g, ' ').trim();
      return `"${val}"`;
    });
    lines.push(row.join(';'));
  }
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('='.repeat(60));
  console.log('  Extractor de datos SPC-GE → CSV');
  console.log('  Taller El Cordobés');
  console.log('='.repeat(60));

  if (!fs.existsSync(DATOS_PATH)) {
    console.error(`\n❌ No se encontró la carpeta: ${DATOS_PATH}`);
    console.error('   Verificá que la ruta sea correcta.\n');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const summary = [];

  for (const [filename, schema] of Object.entries(SCHEMAS)) {
    const filePath = path.join(DATOS_PATH, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  No encontrado: ${filename}`);
      continue;
    }

    process.stdout.write(`\n📂 Procesando ${filename} (${schema.name})... `);

    try {
      const { records, error } = readTPS(filePath, schema);

      if (error) {
        console.log(`\n   ⚠️  ${error}`);
        if (filename === 'sgc00010.ger') {
          console.log('   ℹ️  El archivo de clientes (TIT) está encriptado.');
          console.log('   ℹ️  Ver sección CLIENTES más abajo para instrucciones.');
        }
        summary.push({ file: filename, table: schema.name, records: 0, status: 'ENCRIPTADO' });
        continue;
      }

      const validRecords = records.filter(r =>
        Object.values(r).some(v => v && String(v).trim().length > 1)
      );

      console.log(`${validRecords.length} registros`);

      if (validRecords.length > 0) {
        const csvPath = path.join(OUTPUT_DIR, `${schema.name}.csv`);
        fs.writeFileSync(csvPath, '﻿' + recordsToCSV(validRecords), 'utf8'); // BOM para Excel
        console.log(`   ✅ Guardado: ${csvPath}`);
        summary.push({ file: filename, table: schema.name, records: validRecords.length, status: 'OK' });
      } else {
        console.log('   ℹ️  Sin datos para exportar');
        summary.push({ file: filename, table: schema.name, records: 0, status: 'VACIO' });
      }
    } catch (err) {
      console.log(`\n   ❌ Error: ${err.message}`);
      summary.push({ file: filename, table: schema.name, records: 0, status: 'ERROR' });
    }
  }

  // Archivo encriptado
  const encPath = path.join(DATOS_PATH, 'sgc00010.ger');
  if (fs.existsSync(encPath)) {
    process.stdout.write('\n📂 Procesando sgc00010.ger (Clientes/Titulares)... ');
    const buf = fs.readFileSync(encPath);
    const sig = buf.slice(0x0E, 0x12);
    if (!sig.equals(TPS_SIGNATURE)) {
      console.log('ENCRIPTADO');
      console.log('   ⚠️  Este archivo requiere desencriptación especial.');
      summary.push({ file: 'sgc00010.ger', table: 'Clientes', records: 0, status: 'ENCRIPTADO' });
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('  RESUMEN DE EXPORTACIÓN');
  console.log('='.repeat(60));
  for (const s of summary) {
    const icon = s.status === 'OK' ? '✅' : s.status === 'ENCRIPTADO' ? '🔒' : s.status === 'VACIO' ? '⬜' : '❌';
    console.log(`  ${icon} ${s.table.padEnd(25)} ${String(s.records).padStart(5)} registros  [${s.status}]`);
  }

  console.log('\n📁 Archivos CSV guardados en:');
  console.log(`   ${OUTPUT_DIR}\n`);

  console.log('─'.repeat(60));
  console.log('🔒 CLIENTES (sgc00010.ger) — Archivo encriptado');
  console.log('─'.repeat(60));
  console.log('   Este archivo tiene encriptación propia de SPC-GE.');
  console.log('   OPCIONES para recuperar los clientes:');
  console.log('');
  console.log('   1. Abrí SPC-GE → Buscar función de "Imprimir listado"');
  console.log('      de clientes → imprimir a PDF → enviarme el PDF.');
  console.log('');
  console.log('   2. Si SPC-GE tiene opción de "Correo/Mail" por cliente,');
  console.log('      revisar el archivo DirMails.tps (ya extraído arriba).');
  console.log('');
  console.log('   3. El historial de servicios (Servicios.csv) tiene el');
  console.log('      campo DOMINIO (patente) e IDTITULAR — con eso podemos');
  console.log('      reconstruir al menos qué autos tiene cada cliente.');
  console.log('─'.repeat(60));
  console.log('\n✅ Listo. Podés importar los CSV desde la sección');
  console.log('   "Migración" de El Cordobés.\n');
}

main();
