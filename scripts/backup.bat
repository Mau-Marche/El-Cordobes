@echo off
setlocal

:: Configuracion de la base de datos (debe coincidir con server/.env)
set PGPASSWORD=cordoba12123
set PG_USER=postgres
set PG_DB=el_cordobes
set PG_BIN=C:\Program Files\PostgreSQL\18\bin

:: Fecha y hora en formato YYYY-MM-DD_HHMM
set FECHA=%date:~6,4%-%date:~3,2%-%date:~0,2%
set HORA=%time:~0,2%%time:~3,2%
set HORA=%HORA: =0%

set BACKUPS_DIR=%~dp0..\server\backups
set ARCHIVO=%BACKUPS_DIR%\backup_%FECHA%_%HORA%.sql

if not exist "%BACKUPS_DIR%" mkdir "%BACKUPS_DIR%"

echo.
echo  ============================================
echo   El Cordobes — Backup de base de datos
echo  ============================================
echo.
echo  Base de datos : %PG_DB%
echo  Archivo       : backup_%FECHA%_%HORA%.sql
echo  Destino       : %BACKUPS_DIR%
echo.
echo  Generando backup...

"%PG_BIN%\pg_dump.exe" -U %PG_USER% -d %PG_DB% -f "%ARCHIVO%"

if %errorlevel%==0 (
    echo.
    echo  [OK] Backup generado correctamente.
    echo  %ARCHIVO%
) else (
    echo.
    echo  [ERROR] No se pudo generar el backup.
    echo  Verificar que PostgreSQL este corriendo y los datos sean correctos.
)

:: Borrar backups de mas de 30 dias
forfiles /p "%BACKUPS_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul

echo.
endlocal
pause
