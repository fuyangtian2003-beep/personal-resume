@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: 获取日期与精确时间
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"') do set TODAY=%%i
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'"') do set NOW=%%i
set TAG=backup-%NOW%

echo ============================================
echo  顶级个人简历 - 高频代码备份工具
echo  备份时间: %NOW%
echo ============================================
echo.

:: 暂存所有变更并提交
echo [备份中] 正在收集代码变更...
git add -A
git commit -m "%TAG%" --allow-empty
if errorlevel 1 (
    echo [错误] 提交失败！请检查 Git 配置。
    pause
    exit /b 1
)

:: 打标签
git tag %TAG%
echo [成功] 备份标签已创建: %TAG%
echo.

:: 清理今日旧备份（每日最多留3个）
echo [检查] 正在检查今日备份数量...
set TODAY_COUNT=0
for /f %%t in ('git tag -l "backup-%TODAY%_*"') do set /a TODAY_COUNT+=1

if %TODAY_COUNT% GTR 3 (
    for /f "skip=3" %%t in ('git tag -l "backup-%TODAY%_*" --sort=-version:refname') do (
        echo [清理] 今日备份已超3个，删除较旧的: %%t
        git tag -d %%t
    )
)

:: 清理历史总备份（总共最多留9个）
echo [检查] 正在检查历史备份总数...
set TOTAL_COUNT=0
for /f %%t in ('git tag -l "backup-*"') do set /a TOTAL_COUNT+=1

if %TOTAL_COUNT% GTR 9 (
    for /f "skip=9" %%t in ('git tag -l "backup-*" --sort=-version:refname') do (
        echo [清理] 总备份数已超9个，删除最旧的: %%t
        git tag -d %%t
    )
)

echo.
echo ============================================
echo  备份完成！当前保留的备份:
git tag -l "backup-*" --sort=-version:refname
echo ============================================
echo.
pause
