@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  AethOS Prime - Automated Setup Script
::  This script installs all dependencies and launches AethOS.
::  Run this once from the root of the AethOS_Repository folder.
:: ============================================================

title AethOS Prime - Setup

echo.
echo  ===================================================
echo   AethOS Prime - Automated Environment Setup
echo  ===================================================
echo.

:: ----------------------------------------------------------
:: Step 0: Verify we are in the correct directory
:: ----------------------------------------------------------
if not exist "backend\main.py" (
    echo  [ERROR] Could not find backend\main.py
    echo  Please run this script from the root of AethOS_Repository.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo  [ERROR] Could not find frontend\package.json
    echo  Please run this script from the root of AethOS_Repository.
    echo.
    pause
    exit /b 1
)

:: ----------------------------------------------------------
:: Step 1: Check Python
:: ----------------------------------------------------------
echo  [1/6] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python is not installed or not in your PATH.
    echo  Please install Python 3.10+ from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do (
    echo         Found Python %%v
)

:: ----------------------------------------------------------
:: Step 2: Check Node.js / npm
:: ----------------------------------------------------------
echo  [2/6] Checking Node.js installation...
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] npm is not installed or not in your PATH.
    echo  Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f %%v in ('call npm --version 2^>^&1') do (
    echo         Found npm %%v
)

:: ----------------------------------------------------------
:: Step 3: Create Python virtual environment
:: ----------------------------------------------------------
echo  [3/6] Setting up Python virtual environment...
if not exist "backend\venv\" (
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo         Virtual environment created at backend\venv\
) else (
    echo         Virtual environment already exists, skipping creation.
)

:: Activate the virtual environment
call backend\venv\Scripts\activate.bat

:: ----------------------------------------------------------
:: Step 4: Install Python dependencies
:: ----------------------------------------------------------
echo  [4/6] Installing Python dependencies (this may take a few minutes)...
pip install --upgrade pip >nul 2>&1
pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo  [WARNING] Some packages may have failed to install.
    echo  You can try running the following manually:
    echo    cd backend
    echo    venv\Scripts\activate
    echo    pip install -r requirements.txt
    echo.
)

:: ----------------------------------------------------------
:: Step 5: Build the React frontend
:: ----------------------------------------------------------
echo  [5/6] Installing frontend dependencies and building the dashboard...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo  [ERROR] npm install failed.
    cd ..
    pause
    exit /b 1
)

call npm run build
if %errorlevel% neq 0 (
    echo  [ERROR] Frontend build failed.
    cd ..
    pause
    exit /b 1
)
cd ..

:: ----------------------------------------------------------
:: Step 6: Finalize setup
:: ----------------------------------------------------------
echo  [6/6] Finalizing setup...

:: ----------------------------------------------------------
:: Create the storage directory for first-time users
:: ----------------------------------------------------------
if not exist "backend\storage\" (
    mkdir "backend\storage"
)

:: ----------------------------------------------------------
:: Done
:: ----------------------------------------------------------
echo.
echo  ===================================================
echo   Setup Complete!
echo  ===================================================
echo.
echo  To launch AethOS Prime, run:
echo.
echo    cd backend
echo    venv\Scripts\activate
echo    python main.py
echo.
echo  Or simply run: start_aethos.bat
echo.

:: Generate a quick-launch script for convenience
(
    echo @echo off
    echo title AethOS Prime
    echo call backend\venv\Scripts\activate.bat
    echo cd backend
    echo python main.py
    echo pause
) > start_aethos.bat

echo  A quick-launch script "start_aethos.bat" has been created
echo  in this directory for future use.
echo.
pause
