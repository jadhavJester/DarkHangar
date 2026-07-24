@echo off
:: ============================================
:: DarkHangar V2 — Build Pipeline
:: ============================================
:: 1. Build React frontend
:: 2. Install Python dependencies
:: 3. Build standalone EXE with PyInstaller
:: 4. Copy EXE to desktop distribution folder
:: 5. Zip for distribution
:: ============================================

setlocal
set PROJECT=%~dp0
set BACKEND=%PROJECT%backend
set FRONTEND=%PROJECT%frontend
set DIST=%PROJECT%distribution

:: Step 1: Build frontend
echo.
echo ============================================
echo [1/5] Building React frontend...
echo ============================================
cd /d "%FRONTEND%"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    exit /b 1
)
echo [OK] Frontend built to backend\static

:: Step 2: Install Python deps
echo.
echo ============================================
echo [2/5] Installing Python dependencies...
echo ============================================
cd /d "%BACKEND%"
pip install -r requirements.txt pyinstaller -q
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed!
    exit /b 1
)
echo [OK] Dependencies installed

:: Step 3: Build EXE
echo.
echo ============================================
echo [3/5] Building EXE with PyInstaller...
echo ============================================
cd /d "%BACKEND%"
rmdir /s /q build 2>nul
rmdir /s /q dist 2>nul
pyinstaller DarkHangarV2.spec --clean -y
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller build failed!
    exit /b 1
)
echo [OK] EXE built

:: Step 4: Create distribution folder
echo.
echo ============================================
echo [4/5] Creating distribution folder...
echo ============================================
if exist "%DIST%" rmdir /s /q "%DIST%"
mkdir "%DIST%"
xcopy "%BACKEND%\dist\DarkHangarV2\*" "%DIST%\" /e /i /y
echo [OK] Distribution folder created

:: Step 5: Zip
echo.
echo ============================================
echo [5/5] Zipping for distribution...
echo ============================================
if exist "%PROJECT%DarkHangarV2.zip" del "%PROJECT%DarkHangarV2.zip"
cd /d "%PROJECT%"
powershell -Command "Compress-Archive -Path 'distribution\*' -DestinationPath 'DarkHangarV2.zip' -Force"
echo [OK] DarkHangarV2.zip created

echo.
echo ============================================
echo BUILD COMPLETE
echo ============================================
echo EXE:    %DIST%\DarkHangarV2.exe
echo ZIP:    %PROJECT%DarkHangarV2.zip
echo.
echo To run: double-click DarkHangarV2.exe
echo ============================================

endlocal
