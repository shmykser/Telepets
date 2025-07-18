@echo off
setlocal enabledelayedexpansion

if "%1"=="" (
    echo Использование: switch.bat ^<состояние^>
    echo Состояния: incubating, hatching, dead, hatched
    echo.
    echo Примеры:
    echo   switch.bat incubating
    echo   switch.bat hatching
    echo   switch.bat dead
    echo   switch.bat hatched
    exit /b 1
)

python quick_switch.py %1 