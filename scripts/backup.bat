@echo off
setlocal

:: Configuracion de la base de datos (debe coincidir con server/.env)
set PGPASSWORD=cordoba12123
set PG_USER=postgres
set PG_DB=el_cordobes
set PG_BIN=C:\Program Files\PostgreSQL\18\bin

:: Ruta absoluta del directorio de backups
set BACKUPS_DIR=%~dp0..\server\backups

:: Fecha y hora via PowerShell (independiente del idioma/locale de Windows)
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmm'"') do set TIMESTAMP=%%I

set ARCHIVO=%BACKUPS_DIR%\backup_%TIMESTAMP%.sql

if not exist "%BACKUPS_DIR%" mkdir "%BACKUPS_DIR%"

echo.
echo  ============================================
echo   El Cordobes - Backup de base de datos
echo  ============================================
echo.
echo  Base de datos : %PG_DB%
echo  Archivo       : backup_%TIMESTAMP%.sql
echo  Destino       : %BACKUPS_DIR%
echo.
echo  Generando backup...

"%PG_BIN%\pg_dump.exe" -U %PG_USER% -d %PG_DB% -f "%BACKUPS_DIR%\backup_%TIMESTAMP%.sql"

if %errorlevel%==0 (
    echo.
    echo  [OK] Backup generado correctamente.
    echo  %BACKUPS_DIR%\backup_%TIMESTAMP%.sql
) else (
    echo.
    echo  [ERROR] No se pudo generar el backup.
    echo  Verificar que PostgreSQL este corriendo.
)

:: Borrar backups de mas de 30 dias
forfiles /p "%BACKUPS_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul

echo.
endlocal
pause
