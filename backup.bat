@echo off
setlocal enabledelayedexpansion

:: Get timestamp
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd-HHmm'"') do set TS=%%i
set TAG=backup-%TS%

echo ============================================
echo  Personal Resume - Code Backup Tool
echo  Timestamp: %TS%
echo ============================================
echo.

:: Check git status
git status >nul 2>&1
if errorlevel 1 (
    echo [Error] Git not initialized in this directory.
    pause
    exit /b 1
)

:: Stage and commit
echo [Processing] Collecting changes...
git add -A
git commit -m "%TAG%" --allow-empty
if errorlevel 1 (
    echo [Error] Commit failed! Check your git config.
    pause
    exit /b 1
)

:: Create tag
git tag %TAG%
echo [Success] Backup tag created: %TAG%
echo.

:: Statistics and Cleanup (Keep latest 5 backups)
echo [Checking] Managing old backups...
set COUNT=0
for /f %%t in ('git tag -l "backup-*" --sort=-version:refname') do set /a COUNT+=1

if %COUNT% GTR 5 (
    for /f "skip=5" %%t in ('git tag -l "backup-*" --sort=-version:refname') do (
        echo [Cleanup] Removing old backup: %%t
        git tag -d %%t
    )
)

echo.
echo ============================================
echo  Backup Complete! Current Backups:
git tag -l "backup-*" --sort=-version:refname
echo ============================================
echo.
pause
