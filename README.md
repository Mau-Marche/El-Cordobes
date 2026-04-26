# El Cordobés — Sistema de Gestión para Taller Automotriz

Sistema web local para gestión de clientes, vehículos, trabajos y presupuestos del taller automotriz **El Cordobés**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Web server | nginx (proxy reverso + archivos estáticos)
| Backend | Node.js + Express 4 + Prisma ORM 5 + JWT + Winston |
| Base de datos | PostgreSQL 18 |
| Servicios Windows | NSSM (Non-Sucking Service Manager) |
| PDF | `window.print()` con estilos de impresión |

---

## Arquitectura

```
Browser  →  nginx :80
               ├── /api/*      →  Node.js :3000  (Express API)
               ├── /uploads/*  →  Node.js :3000  (archivos adjuntos)
               └── /*          →  server/public/ (React compilado)
```

nginx actúa como punto de entrada único en el puerto 80. No es necesario exponer el puerto 3000 ni el 5173.

---

## Requisitos

- **Node.js** ≥ 20
- **PostgreSQL** 18 corriendo en `localhost:5432`
- **nginx para Windows** extraído en `C:\nginx` → [descargar](https://nginx.org/en/download.html)
- **NSSM** (gestor de servicios Windows) en `scripts\nssm.exe` → [descargar](https://nssm.cc/download) (win64)

---

## Instalación

### 1. Clonar y configurar dependencias

```bash
git clone <repo>
cd el-cordobes

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Base de datos

Crear la base de datos y correr las migraciones:

```bash
cd server
npx prisma migrate deploy
```

Variables de entorno (`server/.env`):

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/el_cordobes"
JWT_SECRET="cambia_esto_por_un_secreto_largo"
JWT_EXPIRES_IN="8h"
PORT=3000
NODE_ENV="production"
```

### 3. Instalar nginx

1. Descargar [nginx para Windows](https://nginx.org/en/download.html) (versión Stable)
2. Descomprimir y renombrar la carpeta a `nginx`
3. Mover a `C:\` → debe quedar `C:\nginx\nginx.exe`

### 4. Descargar NSSM

1. Descargar [NSSM](https://nssm.cc/download) (win64)
2. Copiar `nssm.exe` a la carpeta `scripts\` del proyecto

### 5. Instalar todo como servicios Windows

Ejecutar **como Administrador**:

```
scripts\instalar-servicios.bat
```

Este script:
- Compila el frontend React → `server/public/`
- Instala `ElCordobesBackend` (Node.js) como servicio Windows
- Instala `ElCordobesNginx` (nginx) como servicio Windows
- Ambos servicios **arrancan automáticamente con Windows**

---

## Administración del sistema

### Panel de control (recomendado)

Doble clic en **`ADMINISTRAR.bat`** → Ejecutar como administrador

Muestra el estado de los servicios en tiempo real y permite:
- Iniciar / Detener / Reiniciar todo
- Controlar cada servicio por separado
- Abrir la aplicación en el navegador
- Actualizar el frontend después de cambios en el código

### Comandos manuales

```batch
:: Iniciar
net start ElCordobesBackend
net start ElCordobesNginx

:: Detener
net stop ElCordobesNginx
net stop ElCordobesBackend

:: Ver estado
sc query ElCordobesBackend
sc query ElCordobesNginx
```

### Administrador de Servicios de Windows

`Win + R` → `services.msc` → buscar **El Cordobes**

---

## Actualizar el frontend

Después de hacer cambios en el código del frontend:

```
scripts\build-y-recargar.bat
```

O desde `ADMINISTRAR.bat` → opción **9**.

---

## Acceso

| URL | Descripción |
|-----|-------------|
| `http://localhost` | Esta PC |
| `http://192.168.0.17` | Red local (verificar IP con `ipconfig`) |
| `http://taller.local` | Si se configuró DNS con `scripts\configurar-dns.bat` |

Credenciales por defecto: `admin` / `admin123` (cambiar desde Configuración)

---

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `ADMINISTRAR.bat` | Panel de control de servicios (raíz del proyecto) |
| `scripts\instalar-servicios.bat` | Instala backend + nginx como servicios Windows (admin) |
| `scripts\build-y-recargar.bat` | Compila frontend y recarga nginx |
| `scripts\build-produccion-solo.bat` | Solo compila el frontend |
| `scripts\configurar-dns.bat` | Agrega `taller.local` al archivo hosts |
| `scripts\desinstalar-servicio.bat` | Desinstala los servicios |
| `scripts\nginx.conf` | Plantilla de configuración nginx |
| `scripts\backup.bat` | Copia de seguridad de la base de datos |

---

## Estructura del proyecto

```
el-cordobes/
├── client/                        # Frontend React + Vite
│   └── src/
│       ├── main.jsx               # Punto de entrada
│       ├── App.jsx                # Rutas (React Router 6)
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Clients.jsx        # Lista + CRUD de clientes y vehículos
│       │   ├── ClientDetail.jsx
│       │   ├── VehicleDetail.jsx
│       │   ├── Jobs.jsx
│       │   ├── JobDetail.jsx
│       │   ├── Quotes.jsx
│       │   └── Settings.jsx
│       ├── components/
│       │   ├── layout/            # AppLayout, Sidebar, PageHeader
│       │   └── ui/                # button, card, dialog, input, select, table, toast, badge
│       ├── lib/
│       │   ├── api.js             # Axios + interceptor JWT + todos los endpoints
│       │   ├── utils.js           # formatCurrency, formatDate, JOB_STATUS, QUOTE_STATUS
│       │   └── car-brands.js      # Marcas y modelos para autocompletar
│       └── store/
│           └── authStore.js       # Zustand — estado de autenticación
├── server/                        # Backend Node.js + Express
│   ├── src/
│   │   ├── index.js               # Entry point Express
│   │   ├── routes/
│   │   │   ├── auth.js            # POST /login, GET /me, POST /change-password
│   │   │   ├── users.js           # CRUD usuarios
│   │   │   ├── clients.js         # CRUD clientes
│   │   │   ├── vehicles.js        # CRUD vehículos
│   │   │   ├── jobs.js            # CRUD trabajos + adjuntos
│   │   │   ├── quotes.js          # CRUD presupuestos + conversión a trabajo
│   │   │   ├── dashboard.js       # Estadísticas + búsqueda global
│   │   │   ├── settings.js        # Datos del taller (lee/escribe settings.json)
│   │   │   └── catalog.js         # Buscador de ítems de reparación
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT authenticate + requireAdmin
│   │   ├── config/
│   │   │   └── prisma.js          # Cliente Prisma singleton
│   │   ├── services/
│   │   │   └── pdfGenerator.js    # (legacy, reemplazado por window.print)
│   │   └── utils/
│   │       └── logger.js          # Winston logger
│   ├── prisma/
│   │   └── schema.prisma          # Modelos: User, Client, Vehicle, Job, Quote, etc.
│   ├── data/
│   │   ├── settings.json          # Nombre, dirección, teléfono, CUIT del taller
│   │   └── car-brands.json        # Marcas y modelos para autocompletar
│   └── public/                    # Frontend compilado (salida de npm run build)
├── scripts/
│   ├── nginx.conf                 # Configuración nginx lista para C:\nginx\conf\
│   ├── instalar-servicios.bat     # Instala backend + nginx como servicios (admin)
│   ├── build-y-recargar.bat       # Compila frontend y recarga nginx
│   ├── build-produccion-solo.bat  # Solo compila el frontend
│   ├── configurar-dns.bat         # Agrega taller.local al archivo hosts
│   ├── desinstalar-servicio.bat   # Desinstala los servicios
│   └── backup.bat                 # Copia de seguridad de la base de datos
└── ADMINISTRAR.bat                # Panel de control para el usuario (requiere admin)
```

---

## Módulos del sistema

- **Dashboard** — Estadísticas, búsqueda global, últimos trabajos y presupuestos
- **Clientes y Vehículos** — CRUD unificado, ficha completa, historial
- **Trabajos** — Órdenes de trabajo con ítems, adjuntos y estados
- **Presupuestos** — Con buscador de catálogo, kilometraje del vehículo, impresión PDF
- **Configuración** — Datos del taller, usuarios, gestión de contraseñas
