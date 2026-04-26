# Guía de instalación — El Cordobés

## Requisitos previos

### 1. Node.js (v18 o superior)
Descargá e instalá desde: https://nodejs.org (elegí "LTS")
Verificá: `node --version`

### 2. PostgreSQL (v15 o superior)
Descargá desde: https://www.postgresql.org/download/windows/
Durante la instalación:
- Puerto: 5432 (default)
- Usuario: postgres
- Contraseña: anotala, la vas a necesitar

### 3. Git (opcional, para actualizaciones)
Descargá desde: https://git-scm.com

---

## Instalación paso a paso

### Paso 1 — Crear la base de datos

Abrí pgAdmin o psql y ejecutá:
```sql
CREATE DATABASE el_cordobes;
```

### Paso 2 — Configurar variables de entorno del backend

```bash
cd el-cordobes/server
copy .env.example .env
```

Editá el archivo `.env` con tus datos:
```
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/el_cordobes"
JWT_SECRET="inventate-una-clave-secreta-larga-aqui-2024"
WORKSHOP_NAME="El Cordobés"
WORKSHOP_ADDRESS="Tu dirección"
WORKSHOP_PHONE="Tu teléfono"
WORKSHOP_CUIT="20-12345678-9"
```

### Paso 3 — Instalar dependencias del backend

```bash
cd el-cordobes/server
npm install
```

### Paso 4 — Crear tablas y usuario inicial

```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

Esto crea:
- Todas las tablas de la base de datos
- Usuario admin con contraseña "admin123"

⚠️ **Cambiá la contraseña después del primer login.**

### Paso 5 — Instalar dependencias del frontend

```bash
cd el-cordobes/client
npm install
```

---

## Ejecutar el sistema

### Modo desarrollo (recomendado para empezar)

**Terminal 1 — Backend:**
```bash
cd el-cordobes/server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd el-cordobes/client
npm run dev
```

Accedé desde cualquier PC en la red local en:
- `http://IP-DEL-SERVIDOR:5173`
- Usuario: `admin` / Contraseña: `admin123`

---

## Modo producción (para uso diario)

### Compilar el frontend
```bash
cd el-cordobes/client
npm run build
```
Esto genera los archivos estáticos en `server/public/`.

### Configurar Express para servir el frontend
Agregar en `server/src/index.js` (ya está preparado para esto):
```js
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
```

### Ejecutar solo el backend (sirve el frontend también)
```bash
cd el-cordobes/server
npm start
```
Accedé en: `http://IP-DEL-SERVIDOR:3000`

---

## Correr como servicio de Windows (inicio automático)

Instalá PM2:
```bash
npm install -g pm2
npm install -g pm2-windows-startup
```

Configurar:
```bash
cd el-cordobes/server
pm2 start src/index.js --name "el-cordobes"
pm2-startup install
pm2 save
```

El sistema arranca automáticamente cuando enciende la PC.

---

## Backup automático de la base de datos

Crear el archivo `backup.bat` en la carpeta principal:
```batch
@echo off
set FECHA=%date:~6,4%-%date:~3,2%-%date:~0,2%
set ARCHIVO=C:\Users\Mauro\Documents\MEC\el-cordobes\server\backups\backup_%FECHA%.sql
"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U postgres -d el_cordobes -f %ARCHIVO%
echo Backup guardado en %ARCHIVO%
```

Programarlo en el Programador de tareas de Windows para que corra todos los días.

---

## Acceso desde otros equipos de la red

1. Obtener la IP del servidor: `ipconfig` → buscar "IPv4 Address" (ej: 192.168.1.100)
2. Asegurarse de que el firewall de Windows permita el puerto 3000
3. Desde cualquier PC en la red: `http://192.168.1.100:3000`

---

## Solución de problemas

| Problema | Solución |
|---|---|
| "Cannot connect to database" | Verificar que PostgreSQL esté corriendo y las credenciales en .env |
| "Port 3000 in use" | Cambiar PORT en .env o cerrar el proceso que usa el puerto |
| PDF no se genera | Asegurarse de que Puppeteer instaló Chromium (puede tardar en la primera instalación) |
| Login inválido | Correr nuevamente `node prisma/seed.js` |
