@echo off
title Dark Hangar — Build
echo.
echo ====================================================
echo   DARK HANGAR — Build Desktop App
echo ====================================================
echo.

REM Step 1: Build React frontend
echo [1/4] Building React frontend...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)
echo     Frontend built to backend\static\

REM Step 2: Install Python deps
echo.
echo [2/4] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo ERROR: pip install failed.
    pause
    exit /b 1
)

REM Step 3: Package with PyInstaller
echo.
echo [3/4] Packaging with PyInstaller...
pyinstaller DarkHangar.spec --noconfirm

echo.
echo [4/4] Syncing database and timeseries files to build output...
if exist "%~dp0backend\data" (
    xcopy "%~dp0backend\data" "%~dp0backend\dist\DarkHangar\data" /E /I /Y /Q >nul
)

REM Step 5: Create darkhangarv1 distribution folder
echo.
echo [5/5] Creating darkhangarv1 distribution package...
if not exist "%~dp0darkhangarv1" (
    mkdir "%~dp0darkhangarv1"
)

copy "%~dp0backend\dist\DarkHangarStandalone.exe" "%~dp0darkhangarv1\DarkHangar.exe" /Y >nul

echo Zipping folder version (this might take a few seconds)...
powershell -Command "Compress-Archive -Path '%~dp0backend\dist\DarkHangar' -DestinationPath '%~dp0darkhangarv1\DarkHangar_Folder_v1.zip' -Force"

echo.
echo Done!
echo.
echo   Distribution Directory: %~dp0darkhangarv1\
echo   - Standalone EXE: %~dp0darkhangarv1\DarkHangar.exe
echo   - Zip File:       %~dp0darkhangarv1\DarkHangar_Folder_v1.zip
echo.
echo ====================================================
pause
