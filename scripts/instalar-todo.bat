@echo off
:: ============================================================
::  Instala El Cordobés completo como servicios Windows
::  Backend (Node.js) + Web Server (nginx)
::
::  REQUISITOS antes de ejecutar:
::   1. Ejecutar como Administrador
::   2. nssm.exe en esta misma carpeta scripts\
::      Descargar: https://nssm.cc/download  (win64)
::   3. nginx en C:\nginx\
::      Descargar: https://nginx.org/en/download.html
::      Descomprimir y renombrar la carpeta a "nginx", mover a C:\
:: ============================================================
setlocal
echo.
echo   =====================================================
echo        EL CORDOBES — Instalacion Completa
echo   =====================================================
echo.

:: Verificar administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ejecutar como Administrador (clic derecho → Ejecutar como administrador)
    pause & exit /b 1
)

:: Verificar NSSM
set NSSM=%~dp0nssm.exe
if not exist "%NSSM%" (
    echo [ERROR] Falta nssm.exe en la carpeta scripts\
    echo  Descargar de: https://nssm.cc/download  ^(elegir win64^)
    echo  Copiar nssm.exe a: %~dp0
    pause & exit /b 1
)
echo [OK] NSSM encontrado.

:: Verificar Node.js
for /f "tokens=*" %%i in ('where node 2^>nul') do set NODE_PATH=%%i
if "%NODE_PATH%"=="" (
    echo [ERROR] Node.js no encontrado. Instalar desde https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js: %NODE_PATH%

:: Verificar nginx
if not exist "C:\nginx\nginx.exe" (
    echo [ERROR] No se encontro C:\nginx\nginx.exe
    echo.
    echo  Pasos:
    echo  1. Ir a https://nginx.org/en/download.html
    echo  2. Descargar nginx/Windows ^(Stable version^)
    echo  3. Descomprimir el ZIP
    echo  4. Renombrar la carpeta a "nginx"
    echo  5. Moverla a C:\  ^(resultado: C:\nginx\nginx.exe^)
    pause & exit /b 1
)
echo [OK] nginx encontrado.

echo.
echo --- Paso 1/4: Compilando frontend ---
call "%~dp0build-produccion-solo.bat"
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion del frontend.
    pause & exit /b 1
)

echo.
echo --- Paso 2/4: Configurando nginx ---
set FRONTEND_DIST=%~dp0..\server\public
for %%i in ("%FRONTEND_DIST%") do set FRONTEND_DIST_ABS=%%~fi
set "DIST_SLASH=%FRONTEND_DIST_ABS:\=/%"
powershell -Command "(Get-Content '%~dp0nginx.conf') -replace 'FRONTEND_DIST_PLACEHOLDER', '%DIST_SLASH%' | Set-Content 'C:\nginx\conf\nginx.conf' -Encoding UTF8"
C:\nginx\nginx.exe -t -c C:\nginx\conf\nginx.conf
if %errorlevel% neq 0 (
    echo [ERROR] Configuracion de nginx invalida.
    pause & exit /b 1
)
echo [OK] nginx configurado.

echo.
echo --- Paso 3/4: Instalando servicio Backend ---
set BACK_SVC=ElCordobesBackend
set SERVER_DIR=%~dp0..\server
for %%i in ("%SERVER_DIR%") do set SERVER_DIR_ABS=%%~fi
set SERVER_SCRIPT=%SERVER_DIR_ABS%\src\index.js

"%NSSM%" stop %BACK_SVC% >nul 2>&1
"%NSSM%" remove %BACK_SVC% confirm >nul 2>&1
"%NSSM%" install %BACK_SVC% "%NODE_PATH%" "%SERVER_SCRIPT%"
"%NSSM%" set %BACK_SVC% AppDirectory "%SERVER_DIR_ABS%"
"%NSSM%" set %BACK_SVC% DisplayName "El Cordobes - Backend"
"%NSSM%" set %BACK_SVC% Description "Servidor API Node.js para El Cordobes"
"%NSSM%" set %BACK_SVC% Start SERVICE_AUTO_START
mkdir "%SERVER_DIR_ABS%\logs" >nul 2>&1
"%NSSM%" set %BACK_SVC% AppStdout "%SERVER_DIR_ABS%\logs\service-out.log"
"%NSSM%" set %BACK_SVC% AppStderr "%SERVER_DIR_ABS%\logs\service-err.log"
"%NSSM%" set %BACK_SVC% AppRotateFiles 1
"%NSSM%" set %BACK_SVC% AppRotateBytes 1048576
"%NSSM%" start %BACK_SVC%
echo [OK] Backend instalado e iniciado.

echo.
echo --- Paso 4/4: Instalando servicio nginx ---
set NGX_SVC=ElCordobesNginx
"%NSSM%" stop %NGX_SVC% >nul 2>&1
"%NSSM%" remove %NGX_SVC% confirm >nul 2>&1
"%NSSM%" install %NGX_SVC% "C:\nginx\nginx.exe"
"%NSSM%" set %NGX_SVC% AppDirectory "C:\nginx"
"%NSSM%" set %NGX_SVC% DisplayName "El Cordobes - Web Server"
"%NSSM%" set %NGX_SVC% Description "nginx Web Server para El Cordobes"
"%NSSM%" set %NGX_SVC% Start SERVICE_AUTO_START
"%NSSM%" start %NGX_SVC%
echo [OK] nginx instalado e iniciado.

echo.
echo =====================================================
echo  INSTALACION COMPLETADA
echo.
echo  El sistema esta corriendo en:
echo    http://localhost          (esta PC)
echo    http://192.168.0.17      (red local)
echo    http://taller.local      (si configuraste DNS)
echo.
echo  Para administrar los servicios:
echo    Doble clic en ADMINISTRAR.bat ^(requiere admin^)
echo.
echo  Los servicios arrancan automaticamente con Windows.
echo =====================================================
echo.
pause
