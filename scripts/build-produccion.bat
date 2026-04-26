@echo off
echo ============================================
echo   El Cordobes - Compilando para produccion
echo ============================================

echo.
echo [1/3] Compilando frontend React...
cd /d %~dp0..\client
call npm run build
if %errorlevel% neq 0 (
    echo ERROR al compilar el frontend.
    pause
    exit /b 1
)

echo.
echo [2/3] Frontend compilado correctamente en server/public/

echo.
echo [3/3] Iniciando servidor de produccion...
cd /d %~dp0..\server
start "El Cordobes - Produccion" cmd /k "npm start"

timeout /t 3 /nobreak >nul

echo.
echo Sistema listo en produccion.
echo Accede desde cualquier PC en la red: http://TU-IP:3000
echo.
echo Para obtener tu IP: ejecuta "ipconfig" en una consola.
pause
