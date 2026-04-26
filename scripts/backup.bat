@echo off
setlocal

set FECHA=%date:~6,4%-%date:~3,2%-%date:~0,2%
set HORA=%time:~0,2%%time:~3,2%
set HORA=%HORA: =0%
set ARCHIVO=%~dp0..\server\backups\backup_%FECHA%_%HORA%.sql

if not exist "%~dp0..\server\backups" mkdir "%~dp0..\server\backups"

echo Generando backup de El Cordobes...
"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U postgres -d el_cordobes -f "%ARCHIVO%"

if %errorlevel%==0 (
    echo Backup guardado exitosamente en:
    echo %ARCHIVO%
) else (
    echo ERROR al generar el backup.
)

:: Borrar backups de mas de 30 dias
forfiles /p "%~dp0..\server\backups" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul

endlocal
pause
