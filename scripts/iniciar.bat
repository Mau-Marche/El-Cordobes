@echo off
echo ====================================
echo   Taller El Cordobes - Iniciando...
echo ====================================
echo.

:: ── Verificar si el backend ya está corriendo (puerto 3000) ──
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [!] El backend ya esta corriendo en el puerto 3000.
    echo     No se abre una nueva instancia para evitar conflictos.
    echo.
    goto check_frontend
)
echo [1/2] Iniciando servidor backend (puerto 3000)...
start "El Cordobes - Backend" cmd /k "cd /d %~dp0..\server && node src/index.js"
timeout /t 3 /nobreak >nul

:check_frontend
:: ── Verificar si el frontend ya está corriendo (puerto 5173) ──
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [!] El frontend ya esta corriendo en el puerto 5173.
    goto open_browser
)
echo [2/2] Iniciando frontend (puerto 5173)...
start "El Cordobes - Frontend" cmd /k "cd /d %~dp0..\client && node_modules\.bin\vite.cmd --host"
timeout /t 4 /nobreak >nul

:open_browser
echo.
echo Sistema listo. Abriendo navegador...
start http://localhost:5173
echo.
echo Para detener: ejecutar detener.bat
echo Acceso red local: http://192.168.0.17:5173
echo Con DNS interno: http://taller.local:5173
