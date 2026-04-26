# El Cordobés — Sistema de Gestión para Taller Automotriz

Sistema web de gestión local para el Taller El Cordobés. Permite administrar clientes, vehículos, órdenes de trabajo y presupuestos desde cualquier navegador en la red local, sin depender de internet.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Backend | Node.js + Express 4 |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | JWT (JSON Web Tokens) |

---

## Características

- 👥 **Clientes** — CRUD completo con historial de trabajos y presupuestos
- 🚗 **Vehículos** — Fichas con datos técnicos, autocomplete de marcas/modelos argentinas
- 🔧 **Órdenes de trabajo** — Estados (Pendiente → En proceso → Finalizado → Entregado), adjuntos (fotos/PDFs)
- 📄 **Presupuestos** — Creación con catálogo de ítems de reparación, impresión directa desde el navegador, conversión a trabajo
- 📊 **Dashboard** — Stats en tiempo real, búsqueda global, galería de autos de lujo rotatoria
- ⚙️ **Configuración** — Datos del taller editables desde la UI, gestión de usuarios
- 🖥️ **Servicio Windows** — Scripts para instalar el backend como servicio del sistema (inicio automático)
- 🌐 **DNS local** — Script para acceder por `http://taller.local` en vez de la IP

---

## Estructura del proyecto

```
el-cordobes/
├── client/                  # Frontend React + Vite
│   ├── src/
│   │   ├── components/      # Componentes UI reutilizables y layout
│   │   ├── lib/             # api.js, utils.js, car-brands.js
│   │   ├── pages/           # Dashboard, Clients, Vehicles, Jobs, Quotes, Settings
│   │   └── store/           # Estado global (Zustand)
│   └── vite.config.js       # Proxy /api y /uploads → localhost:3000
│
├── server/                  # Backend Node.js + Express
│   ├── src/
│   │   ├── routes/          # auth, clients, vehicles, jobs, quotes, dashboard, settings, catalog
│   │   ├── middleware/       # JWT auth
│   │   ├── services/        # pdfGenerator (referencia, no usado activamente)
│   │   └── index.js         # Entry point Express
│   ├── prisma/
│   │   ├── schema.prisma    # Modelos de DB
│   │   ├── seed.js          # Crea usuario admin inicial
│   │   └── migrations/      # Historial de migraciones SQL
│   ├── data/
│   │   └── settings.json    # Configuración del taller (nombre, dirección, CUIT…)
│   └── .env.example         # Plantilla de variables de entorno
│
└── scripts/
    ├── iniciar.bat              # Inicia backend + frontend (con chequeo de puertos)
    ├── detener.bat              # Detiene ambos procesos
    ├── instalar-servicio.bat    # Instala backend como servicio Windows (requiere NSSM)
    ├── desinstalar-servicio.bat # Desinstala el servicio
    ├── configurar-dns.bat       # Agrega taller.local al hosts file
    └── backup.bat               # Backup automático de la base de datos
```

---

## Instalación

### Requisitos previos

| Software | Versión mínima | Descarga |
|----------|---------------|---------|
| Node.js | 18 LTS | https://nodejs.org |
| PostgreSQL | 15+ | https://www.postgresql.org/download/windows/ |

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/Mau-Marche/El-Cordobes.git
cd El-Cordobes
```

### Paso 2 — Crear la base de datos PostgreSQL

Abrí **pgAdmin** o la consola `psql` y ejecutá:

```sql
CREATE DATABASE el_cordobes;
```

### Paso 3 — Configurar el backend

```bash
cd server
copy .env.example .env
```

Editá el archivo `.env` con tus datos reales:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/el_cordobes"
JWT_SECRET="inventate-una-clave-secreta-larga-y-segura"
```

### Paso 4 — Instalar dependencias del backend y crear tablas

```bash
cd server
npm install
node_modules\.bin\prisma.cmd migrate deploy
node prisma/seed.js
```

Esto crea todas las tablas y el usuario administrador inicial:
- **Usuario:** `admin`
- **Contraseña:** `admin123` ← ¡Cambiala después del primer login!

### Paso 5 — Instalar dependencias del frontend

```bash
cd ../client
npm install
```

### Paso 6 — Iniciar el sistema

Doble clic en `scripts/iniciar.bat`

O manualmente:

```bash
# Terminal 1 — Backend
cd server
node src/index.js

# Terminal 2 — Frontend
cd client
node_modules\.bin\vite.cmd --host
```

Accedé en: **http://localhost:5173**

---

## Uso diario

### Iniciar
```
scripts\iniciar.bat
```
El script verifica si los puertos 3000 y 5173 ya están en uso para evitar duplicados.

### Detener
```
scripts\detener.bat
```

### Acceso desde otras PCs de la red
```
http://192.168.0.X:5173
```
(Reemplazá la IP por la del servidor — obtenerla con `ipconfig`)

---

## Modo producción (un solo proceso)

Compilar el frontend y servirlo desde el backend:

```bash
cd client
npm run build
```

El build queda en `server/public/`. Luego solo necesitás correr el backend:

```bash
cd server
node src/index.js
```

Accedé en: `http://IP-DEL-SERVIDOR:3000`

---

## Servicio Windows (inicio automático)

Para que el backend arranque solo cada vez que prende la PC:

1. Descargá **NSSM** desde https://nssm.cc/download
2. Extraé el archivo `nssm.exe` (carpeta `win64`) en `scripts/`
3. Ejecutá **como Administrador**: `scripts\instalar-servicio.bat`

El servicio queda registrado como **"El Cordobes - Backend"** y se puede administrar desde `services.msc`.

Para desinstalar: `scripts\desinstalar-servicio.bat`

---

## DNS interno (URL amigable)

Para acceder por `http://taller.local` en lugar de la IP:

1. Ejecutá **como Administrador**: `scripts\configurar-dns.bat`

Para que otras PCs en la red usen el mismo nombre, repetir el script en cada una indicando la IP del servidor.

---

## Backup de la base de datos

```
scripts\backup.bat
```

Genera un archivo `.sql` con fecha en `server/backups/`. 
Se puede programar en el **Programador de tareas de Windows** para que corra automáticamente.

---

## Configuración del taller

Los datos que aparecen en los presupuestos impresos (nombre, dirección, teléfono, CUIT) se editan desde la interfaz:

**Configuración → Datos del taller**

Se guardan en `server/data/settings.json`.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://postgres:pass@localhost:5432/el_cordobes` |
| `JWT_SECRET` | Clave secreta para firmar tokens | `una-clave-larga-y-aleatoria` |
| `JWT_EXPIRES_IN` | Duración de la sesión | `8h` |
| `PORT` | Puerto del backend | `3000` |
| `NODE_ENV` | Entorno de ejecución | `production` |

---

## Usuarios del sistema

| Rol | Permisos |
|-----|---------|
| Administrador | Acceso total: clientes, vehículos, trabajos, presupuestos + configuración y gestión de usuarios |
| Operador | Acceso a clientes, vehículos, trabajos y presupuestos. Sin acceso a configuración |

Se gestionan desde **Configuración → Usuarios del sistema** (solo administradores).

---

## Solución de problemas

| Problema | Causa probable | Solución |
|----------|---------------|---------|
| `Cannot connect to database` | PostgreSQL no está corriendo | Iniciar el servicio PostgreSQL desde `services.msc` |
| `Port 3000 already in use` | Instancia anterior no cerrada | Ejecutar `detener.bat` o reiniciar |
| `npm install` falla | Falta algún paquete | Borrar `node_modules/` y `package-lock.json` y repetir |
| Dashboard muestra "no conecta" | Backend no iniciado | Ejecutar `iniciar.bat` o verificar que el servicio esté activo |
| `prisma migrate` falla | DB no existe o credenciales incorrectas | Verificar `.env` y que PostgreSQL esté corriendo |

---

## Licencia

Proyecto privado — Taller El Cordobés, Córdoba, Argentina.
