@echo off
:: Compila el frontend React sin iniciar el servidor
:: (usado internamente por otros scripts)
setlocal

set CLIENT_DIR=%~dp0..\client

echo [BUILD] Compilando frontend React...
cd /d "%CLIENT_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion.
    exit /b 1
)
echo [BUILD] Frontend compilado correctamente.
exit /b 0
