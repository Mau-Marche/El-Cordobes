@echo off
:: Instala Backend y nginx como servicios Windows con arranque automático
:: EJECUTAR COMO ADMINISTRADOR (clic derecho -> Ejecutar como administrador)
setlocal

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requiere Administrador. Clic derecho ^> Ejecutar como administrador.
    pause & exit /b 1
)

set NSSM=%~dp0nssm.exe
set NODE_EXE=
for /f "tokens=*" %%i in ('where node 2^>nul') do set NODE_EXE=%%i

if not exist "%NSSM%" ( echo ERROR: falta nssm.exe en scripts\ & pause & exit /b 1 )
if "%NODE_EXE%"=="" ( echo ERROR: Node.js no encontrado & pause & exit /b 1 )
if not exist "C:\nginx\nginx.exe" ( echo ERROR: falta C:\nginx\nginx.exe & pause & exit /b 1 )

echo.
echo === Instalando servicio Backend ===
set BACK=ElCordobesBackend
set SRV=%~dp0..\server
for %%i in ("%SRV%") do set SRV=%%~fi

"%NSSM%" stop   %BACK% >nul 2>&1
"%NSSM%" remove %BACK% confirm >nul 2>&1
"%NSSM%" install %BACK% "%NODE_EXE%" "%SRV%\src\index.js"
"%NSSM%" set %BACK% AppDirectory "%SRV%"
"%NSSM%" set %BACK% DisplayName  "El Cordobes - Backend"
"%NSSM%" set %BACK% Start SERVICE_AUTO_START
mkdir "%SRV%\logs" >nul 2>&1
"%NSSM%" set %BACK% AppStdout "%SRV%\logs\out.log"
"%NSSM%" set %BACK% AppStderr "%SRV%\logs\err.log"
"%NSSM%" set %BACK% AppRotateFiles 1
"%NSSM%" set %BACK% AppRotateBytes 1048576
"%NSSM%" start %BACK%
echo [OK] Backend instalado.

echo.
echo === Instalando servicio nginx ===
:: Detener proceso nginx si está corriendo suelto
taskkill /f /im nginx.exe >nul 2>&1

set NGX=ElCordobesNginx
"%NSSM%" stop   %NGX% >nul 2>&1
"%NSSM%" remove %NGX% confirm >nul 2>&1
"%NSSM%" install %NGX% "C:\nginx\nginx.exe"
"%NSSM%" set %NGX% AppDirectory "C:\nginx"
"%NSSM%" set %NGX% DisplayName  "El Cordobes - Web Server"
"%NSSM%" set %NGX% Start SERVICE_AUTO_START
"%NSSM%" start %NGX%
echo [OK] nginx instalado.

echo.
echo ====================================================
echo  Listo. Ambos servicios arrancan con Windows.
echo  Acceder en: http://localhost
echo  Administrar: doble clic en ADMINISTRAR.bat (admin)
echo ====================================================
pause
