# El Cordobés — Sistema de Gestión para Taller Automotriz

Sistema web local para gestión de clientes, vehículos, trabajos y presupuestos del taller automotriz **El Cordobés**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 + Zustand |
| Backend | Node.js + Express 4 + Prisma ORM 5 |
| Base de datos | PostgreSQL 18 |
| Web server | nginx (proxy reverso + archivos estáticos) |
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
├── client/              # Frontend React + Vite
│   └── src/
│       ├── pages/       # Dashboard, Clientes, Vehículos, Trabajos, Presupuestos, Settings
│       ├── components/  # Layout, UI reutilizable
│       └── lib/         # api.js, utils.js
├── server/              # Backend Node.js + Express
│   ├── src/
│   │   ├── routes/      # auth, clients, vehicles, jobs, quotes, dashboard, settings, catalog
│   │   ├── middleware/  # auth JWT
│   │   └── config/      # Prisma client
│   ├── prisma/          # Schema y migraciones
│   ├── data/            # settings.json (datos del taller)
│   └── public/          # Frontend compilado (generado por npm run build)
├── scripts/             # Scripts de instalación y administración
└── ADMINISTRAR.bat      # Panel de control para el usuario
```

---

## Módulos del sistema

- **Dashboard** — Estadísticas, búsqueda global, últimos trabajos y presupuestos
- **Clientes y Vehículos** — CRUD unificado, ficha completa, historial
- **Trabajos** — Órdenes de trabajo con ítems, adjuntos y estados
- **Presupuestos** — Con buscador de catálogo, kilometraje del vehículo, impresión PDF
- **Configuración** — Datos del taller, usuarios, gestión de contraseñas
