@echo off
:: Recompila el frontend y recarga nginx
:: Usar después de actualizar el código del frontend
setlocal

echo ============================================================
echo   El Cordobes - Actualizar Frontend
echo ============================================================
echo.

:: Compilar
call "%~dp0build-produccion-solo.bat"
if %errorlevel% neq 0 (
    echo [ERROR] La compilacion fallo. nginx no fue recargado.
    pause & exit /b 1
)

:: Recargar nginx (sin cortar conexiones activas)
set NGINX_EXE=C:\nginx\nginx.exe
if exist "%NGINX_EXE%" (
    echo [NGINX] Recargando configuracion...
    "%NGINX_EXE%" -s reload
    echo [OK] nginx recargado.
) else (
    echo [AVISO] nginx no encontrado en C:\nginx - saltando recarga.
)

echo.
echo [OK] Frontend actualizado. Los cambios ya estan disponibles.
pause
