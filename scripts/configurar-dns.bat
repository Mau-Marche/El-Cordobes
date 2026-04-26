@echo off
:: ============================================================
::  Configura el DNS interno para acceder al taller por nombre
::  Agrega "taller.local" al archivo hosts de Windows
::
::  REQUIERE: Ejecutar como Administrador
::
::  Resultado: http://taller.local:5173  (dev con Vite)
::             http://taller.local:3000  (produccion compilada)
::             http://taller.local       (si se configuro puerto 80)
::
::  Para que OTRAS PCs en la red también usen el nombre,
::  hay que repetir este script en cada PC o configurar el
::  router con DNS interno (más avanzado).
:: ============================================================

echo ============================================================
echo   El Cordobes - Configurar DNS interno (taller.local)
echo ============================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Este script debe ejecutarse como Administrador.
    pause
    exit /b 1
)

set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts
set ENTRY=127.0.0.1 taller.local

:: Verificar si ya existe la entrada
findstr /C:"%ENTRY%" "%HOSTS_FILE%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] La entrada "taller.local" ya existe en el hosts file.
    echo      Podes acceder por: http://taller.local:5173
    goto end
)

:: Agregar la entrada
echo. >> "%HOSTS_FILE%"
echo # El Cordobes - Taller automotriz >> "%HOSTS_FILE%"
echo %ENTRY% >> "%HOSTS_FILE%"

echo [OK] Entrada agregada al hosts file.
echo.
echo  Ahora podes acceder por:
echo    http://taller.local:5173  ^(frontend en modo desarrollo^)
echo    http://taller.local:3000  ^(backend directo^)
echo.
echo  Para que otras PCs en la red usen este nombre,
echo  ejecuta este script tambien en cada una de ellas,
echo  reemplazando 127.0.0.1 por la IP de este servidor
echo  (por ejemplo 192.168.0.17).
echo.

:end
pause
