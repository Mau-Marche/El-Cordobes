@echo off
:: ============================================================
::  Instala el backend de El Cordobés como servicio Windows
::  usando NSSM (Non-Sucking Service Manager)
::
::  REQUIERE:
::   1. Ejecutar como Administrador (clic derecho → Ejecutar como admin)
::   2. Tener NSSM descargado en esta carpeta o en el PATH
::      Descargar de: https://nssm.cc/download
::      Descomprimir nssm.exe (versión win64) en esta carpeta de scripts
:: ============================================================

echo ============================================================
echo   El Cordobes - Instalacion como Servicio Windows
echo ============================================================
echo.

:: Verificar que se ejecuta como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Este script debe ejecutarse como Administrador.
    echo         Clic derecho en el archivo ^> "Ejecutar como administrador"
    pause
    exit /b 1
)

:: Verificar que NSSM existe
set NSSM=%~dp0nssm.exe
if not exist "%NSSM%" (
    echo [ERROR] No se encontro nssm.exe en la carpeta scripts\
    echo.
    echo  Para instalar:
    echo  1. Descarga NSSM de: https://nssm.cc/download
    echo  2. Descomprime y copia nssm.exe ^(win64^) a:
    echo     %~dp0nssm.exe
    echo  3. Vuelve a ejecutar este script como Administrador
    echo.
    pause
    exit /b 1
)

:: Detectar Node.js
for /f "tokens=*" %%i in ('where node 2^>nul') do set NODE_PATH=%%i
if "%NODE_PATH%"=="" (
    echo [ERROR] Node.js no encontrado en el PATH.
    pause
    exit /b 1
)
echo [OK] Node.js: %NODE_PATH%

set SERVICE_NAME=ElCordobesBackend
set SERVER_DIR=%~dp0..\server
set SERVER_SCRIPT=%SERVER_DIR%\src\index.js

:: Detener y eliminar servicio anterior si existe
"%NSSM%" stop %SERVICE_NAME% >nul 2>&1
"%NSSM%" remove %SERVICE_NAME% confirm >nul 2>&1

:: Instalar el servicio
echo Instalando servicio "%SERVICE_NAME%"...
"%NSSM%" install %SERVICE_NAME% "%NODE_PATH%" "%SERVER_SCRIPT%"
"%NSSM%" set %SERVICE_NAME% AppDirectory "%SERVER_DIR%"
"%NSSM%" set %SERVICE_NAME% DisplayName "El Cordobes - Backend"
"%NSSM%" set %SERVICE_NAME% Description "Sistema de gestion Taller El Cordobes - Servidor backend Node.js"
"%NSSM%" set %SERVICE_NAME% Start SERVICE_AUTO_START
"%NSSM%" set %SERVICE_NAME% AppStdout "%SERVER_DIR%\logs\service-out.log"
"%NSSM%" set %SERVICE_NAME% AppStderr "%SERVER_DIR%\logs\service-err.log"
"%NSSM%" set %SERVICE_NAME% AppRotateFiles 1
"%NSSM%" set %SERVICE_NAME% AppRotateBytes 1048576

:: Crear carpeta de logs
mkdir "%SERVER_DIR%\logs" >nul 2>&1

:: Iniciar el servicio
echo Iniciando servicio...
"%NSSM%" start %SERVICE_NAME%

echo.
echo ============================================================
echo  [OK] Servicio instalado e iniciado correctamente.
echo.
echo  El backend ahora arranca automaticamente con Windows.
echo.
echo  Administrar desde:
echo    - Panel de Servicios: services.msc
echo    - Buscar: "El Cordobes - Backend"
echo    - Acciones: Iniciar / Detener / Reiniciar
echo.
echo  El frontend (Vite) todavia se inicia con iniciar.bat
echo  o podes compilarlo y servir desde el backend:
echo    cd ..\client ^&^& npm run build
echo    Luego acceder directo a http://localhost:3000
echo ============================================================
echo.
pause
