@echo off
cd /d "%~dp0"

echo ============================================
echo  Personal Resume - Code Restore Tool
echo ============================================
echo.

:: List all backups
echo Available Backup List:
git tag -l "backup-*" --sort=-version:refname
echo.

set /p TAG="Enter backup tag to restore (Enter to cancel): "

if "%TAG%"=="" (
    echo [Cancelled] Operation aborted.
    pause
    exit /b 0
)

:: Check if tag exists
git tag -l "%TAG%" | findstr /i "%TAG%" >nul 2>&1
if errorlevel 1 (
    echo [Error] Tag "%TAG%" not found! Please check the name.
    pause
    exit /b 1
)

echo.
echo [Warning] Restore will overwrite all unsaved changes!
set /p CONFIRM="Confirm restore to %TAG%? (Type Y to confirm): "

if /i "%CONFIRM%"=="Y" (
    echo [Restoring] Switching to %TAG%...
    git checkout %TAG% .
    echo [Success] Successfully restored to %TAG% state.
) else (
    echo [Cancelled] Operation aborted.
)

echo.
pause
