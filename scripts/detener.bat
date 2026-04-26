@echo off
echo ====================================
echo   Taller El Cordobes - Deteniendo...
echo ====================================

echo.
echo Cerrando servidor backend...
taskkill /FI "WINDOWTITLE eq El Cordobes - Backend" /F >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend detenido.
) else (
    echo [--] Backend no estaba activo.
)

echo Cerrando frontend...
taskkill /FI "WINDOWTITLE eq El Cordobes - Frontend" /F >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend detenido.
) else (
    echo [--] Frontend no estaba activo.
)

echo.
echo Sistema detenido correctamente.
echo Para volver a iniciar: iniciar.bat
echo.
pause
