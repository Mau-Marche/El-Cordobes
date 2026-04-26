@echo off
echo ============================================================
echo   El Cordobes - Desinstalar Servicio Windows
echo ============================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Ejecutar como Administrador.
    pause
    exit /b 1
)

set NSSM=%~dp0nssm.exe
set SERVICE_NAME=ElCordobesBackend

"%NSSM%" stop %SERVICE_NAME% >nul 2>&1
"%NSSM%" remove %SERVICE_NAME% confirm
echo.
echo [OK] Servicio eliminado. El sistema vuelve a iniciarse con iniciar.bat
echo.
pause
