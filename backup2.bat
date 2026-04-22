@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: Get date and precise time
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"') do set TODAY=%%i
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"') do set NOW=%%i
set TAG=backup-%NOW%

echo ============================================
echo  Premium Portfolio - Code Backup Tool
echo  Backup Time: %NOW%
echo ============================================
echo.

:: Stage and commit all changes
echo [Backing up] Collecting code changes...
git add -A
git commit -m "%TAG%" --allow-empty
if errorlevel 1 (
    echo [Error] Commit failed! Please check Git configuration.
    pause
    exit /b 1
)

:: Create tag
git tag %TAG%
echo [Success] Backup tag created: %TAG%
echo.

:: Cleanup old backups of today (Keep max 3)
echo [Checking] Checking backup count for today...
set TODAY_COUNT=0
for /f %%t in ('git tag -l "backup-%TODAY%_*"') do set /a TODAY_COUNT+=1

if %TODAY_COUNT% GTR 3 (
    for /f "skip=3" %%t in ('git tag -l "backup-%TODAY%_*" --sort=-version:refname') do (
        echo [Cleanup] Daily count > 3, deleting older: %%t
        git tag -d %%t
    )
)

:: Cleanup total historical backups (Keep max 9)
echo [Checking] Checking total backup count...
set TOTAL_COUNT=0
for /f %%t in ('git tag -l "backup-*"') do set /a TOTAL_COUNT+=1

if %TOTAL_COUNT% GTR 9 (
    for /f "skip=9" %%t in ('git tag -l "backup-*" --sort=-version:refname') do (
        echo [Cleanup] Total count > 9, deleting oldest: %%t
        git tag -d %%t
    )
)

echo.
echo ============================================
echo  Backup completed! Current valid backups:
git tag -l "backup-*" --sort=-version:refname
echo ============================================
echo.
pause
