@echo off
:: ============================================================
::  Instala nginx como servicio Windows para El Cordobés
::
::  REQUIERE:
::   1. Ejecutar como Administrador
::   2. nssm.exe en esta carpeta (https://nssm.cc/download)
::   3. nginx para Windows en C:\nginx  (https://nginx.org/en/download.html)
::      Descargar la versión "Stable" .zip, descomprimir como C:\nginx
::      (Debe existir C:\nginx\nginx.exe)
:: ============================================================
@echo off
setlocal

echo ============================================================
echo   El Cordobes - Instalar nginx como Servicio Windows
echo ============================================================
echo.

:: Verificar administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ejecutar como Administrador.
    pause & exit /b 1
)

:: Verificar NSSM
set NSSM=%~dp0nssm.exe
if not exist "%NSSM%" (
    echo [ERROR] No se encontro nssm.exe en scripts\
    echo  Descargar de: https://nssm.cc/download  ^(win64^)
    pause & exit /b 1
)

:: Verificar nginx
set NGINX_DIR=C:\nginx
set NGINX_EXE=%NGINX_DIR%\nginx.exe
if not exist "%NGINX_EXE%" (
    echo [ERROR] No se encontro nginx en C:\nginx\nginx.exe
    echo.
    echo  Pasos para instalar nginx:
    echo  1. Ir a: https://nginx.org/en/download.html
    echo  2. Descargar la version Stable Windows  ^(nginx/Windows-x.x.x^)
    echo  3. Descomprimir el ZIP
    echo  4. Renombrar la carpeta resultante a "nginx"
    echo  5. Moverla a C:\nginx
    echo     ^(debe quedar el archivo C:\nginx\nginx.exe^)
    echo.
    pause & exit /b 1
)
echo [OK] nginx encontrado: %NGINX_EXE%

:: Ruta del frontend compilado
set FRONTEND_DIST=%~dp0..\server\public
for %%i in ("%FRONTEND_DIST%") do set FRONTEND_DIST_ABS=%%~fi

:: Verificar que el frontend esté compilado
if not exist "%FRONTEND_DIST_ABS%\index.html" (
    echo.
    echo [AVISO] El frontend no está compilado todavia.
    echo  Ejecutando compilacion...
    call "%~dp0build-produccion-solo.bat"
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la compilacion del frontend.
        pause & exit /b 1
    )
)

:: Generar nginx.conf con la ruta real del frontend
set CONF_SRC=%~dp0nginx.conf
set CONF_DST=%NGINX_DIR%\conf\nginx.conf

:: Reemplazar el placeholder con la ruta real (barras invertidas → barras normales)
set "DIST_SLASH=%FRONTEND_DIST_ABS:\=/%"
powershell -Command "(Get-Content '%CONF_SRC%') -replace 'FRONTEND_DIST_PLACEHOLDER', '%DIST_SLASH%' | Set-Content '%CONF_DST%' -Encoding UTF8"
echo [OK] nginx.conf generado en %CONF_DST%

:: Probar configuracion de nginx
"%NGINX_EXE%" -t -c "%CONF_DST%"
if %errorlevel% neq 0 (
    echo [ERROR] La configuracion de nginx tiene errores.
    pause & exit /b 1
)
echo [OK] Configuracion de nginx valida.

:: Instalar servicio nginx
set SVC=ElCordobesNginx
"%NSSM%" stop %SVC% >nul 2>&1
"%NSSM%" remove %SVC% confirm >nul 2>&1

echo Instalando servicio nginx...
"%NSSM%" install %SVC% "%NGINX_EXE%"
"%NSSM%" set %SVC% AppDirectory "%NGINX_DIR%"
"%NSSM%" set %SVC% DisplayName "El Cordobes - Web Server"
"%NSSM%" set %SVC% Description "nginx - Servidor web para El Cordobes Taller"
"%NSSM%" set %SVC% Start SERVICE_AUTO_START
"%NSSM%" set %SVC% AppStdout "%NGINX_DIR%\logs\service-out.log"
"%NSSM%" set %SVC% AppStderr "%NGINX_DIR%\logs\service-err.log"

echo Iniciando nginx...
"%NSSM%" start %SVC%
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo iniciar nginx.
    echo  Revisar: %NGINX_DIR%\logs\error.log
    pause & exit /b 1
)

echo.
echo ============================================================
echo  [OK] nginx instalado e iniciado correctamente.
echo.
echo  El sistema ahora es accesible en:
echo    - Esta PC:     http://localhost
echo    - Red local:   http://192.168.0.17
echo    - Nombre:      http://taller.local  (si configuraste DNS)
echo.
echo  Para actualizar el frontend despues de cambios:
echo    Ejecutar: build-y-recargar.bat
echo ============================================================
echo.
pause
