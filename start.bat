@echo off
setlocal enabledelayedexpansion

echo.
echo  PipPaper - Trading Journal
echo  ==========================
echo.

REM Check if Deno is installed
where deno >nul 2>&1
if %errorlevel% neq 0 (
    echo  Deno not found. Installing...
    echo.
    powershell -Command "irm https://deno.land/install.ps1 | iex"
    
    REM Refresh PATH for this session
    set "DENO_INSTALL=%USERPROFILE%\.deno"
    set "PATH=%DENO_INSTALL%\bin;%PATH%"
    
    where deno >nul 2>&1
    if %errorlevel% neq 0 (
        echo  ERROR: Deno installation failed.
        echo  Please install Deno manually: https://deno.land/
        echo  Then re-run this script.
        pause
        exit /b 1
    )
    echo  Deno installed successfully.
) else (
    for /f "tokens=*" %%i in ('deno --version 2^>nul') do (
        echo  Deno is already installed: %%i
        goto :deno_done
    )
)
:deno_done
echo.

REM Check .env
if not exist .env (
    echo  .env file not found. Creating from .env.example...
    if exist .env.example (
        copy .env.example .env >nul
        echo  Created .env - please update it with your API keys.
    ) else (
        echo  WARNING: .env.example not found. Please create .env manually.
    )
) else (
    echo  .env file exists.
)

echo.
echo  Starting development server...
echo  App will be available at http://localhost:8000
echo.

deno task start
