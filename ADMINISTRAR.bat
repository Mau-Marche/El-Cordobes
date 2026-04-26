@echo off
:: ============================================================
::  El Cordobés — Panel de Control de Servicios
::  Doble clic para abrir. Requiere Administrador.
:: ============================================================
setlocal

:: Verificar administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Reiniciando como Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:MENU
cls
echo.
echo   =====================================================
echo        EL CORDOBES — Panel de Control
echo   =====================================================
echo.

:: Estado de servicios
call :CHECK_STATUS

echo   Estado actual:
echo   -----------------------------------------------
echo   Backend  (API) :  %BACK_STATUS%
echo   Web Server     :  %NGX_STATUS%
echo   -----------------------------------------------
echo.
echo   1. Iniciar todo
echo   2. Detener todo
echo   3. Reiniciar todo
echo   -----------------------------------------------
echo   4. Iniciar  Backend solamente
echo   5. Detener  Backend solamente
echo   6. Iniciar  Web Server solamente
echo   7. Detener  Web Server solamente
echo   -----------------------------------------------
echo   8. Abrir la aplicacion en el navegador
echo   9. Actualizar frontend (despues de cambios)
echo   0. Salir
echo.
set /p CHOICE=   Elegir opcion:

if "%CHOICE%"=="1" goto :START_ALL
if "%CHOICE%"=="2" goto :STOP_ALL
if "%CHOICE%"=="3" goto :RESTART_ALL
if "%CHOICE%"=="4" goto :START_BACK
if "%CHOICE%"=="5" goto :STOP_BACK
if "%CHOICE%"=="6" goto :START_NGX
if "%CHOICE%"=="7" goto :STOP_NGX
if "%CHOICE%"=="8" goto :OPEN_BROWSER
if "%CHOICE%"=="9" goto :UPDATE_FRONTEND
if "%CHOICE%"=="0" goto :END
goto :MENU

:START_ALL
echo.
echo   Iniciando todos los servicios...
net start ElCordobesBackend >nul 2>&1
net start ElCordobesNginx   >nul 2>&1
echo   [OK] Servicios iniciados.
timeout /t 2 /nobreak >nul
goto :MENU

:STOP_ALL
echo.
echo   Deteniendo todos los servicios...
net stop ElCordobesNginx   >nul 2>&1
net stop ElCordobesBackend >nul 2>&1
echo   [OK] Servicios detenidos.
timeout /t 2 /nobreak >nul
goto :MENU

:RESTART_ALL
echo.
echo   Reiniciando todos los servicios...
net stop ElCordobesNginx   >nul 2>&1
net stop ElCordobesBackend >nul 2>&1
timeout /t 2 /nobreak >nul
net start ElCordobesBackend >nul 2>&1
net start ElCordobesNginx   >nul 2>&1
echo   [OK] Servicios reiniciados.
timeout /t 2 /nobreak >nul
goto :MENU

:START_BACK
net start ElCordobesBackend >nul 2>&1
echo   [OK] Backend iniciado.
timeout /t 2 /nobreak >nul
goto :MENU

:STOP_BACK
net stop ElCordobesBackend >nul 2>&1
echo   [OK] Backend detenido.
timeout /t 2 /nobreak >nul
goto :MENU

:START_NGX
net start ElCordobesNginx >nul 2>&1
echo   [OK] Web Server iniciado.
timeout /t 2 /nobreak >nul
goto :MENU

:STOP_NGX
net stop ElCordobesNginx >nul 2>&1
echo   [OK] Web Server detenido.
timeout /t 2 /nobreak >nul
goto :MENU

:OPEN_BROWSER
start http://localhost
goto :MENU

:UPDATE_FRONTEND
call "%~dp0scripts\build-y-recargar.bat"
goto :MENU

:END
exit /b 0

:: ──────────────────────────────────────────────────
:: Detectar estado de ambos servicios
:: ──────────────────────────────────────────────────
:CHECK_STATUS
sc query "ElCordobesBackend" | find "RUNNING" >nul 2>&1
if %errorlevel%==0 ( set "BACK_STATUS=[ ACTIVO  ]" ) else ( set "BACK_STATUS=[ DETENIDO]" )
sc query "ElCordobesNginx" | find "RUNNING" >nul 2>&1
if %errorlevel%==0 ( set "NGX_STATUS=[ ACTIVO  ]" ) else ( set "NGX_STATUS=[ DETENIDO]" )
exit /b 0
