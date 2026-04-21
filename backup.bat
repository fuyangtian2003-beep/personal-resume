@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: 获取今日日期
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"') do set TODAY=%%i
set TAG=backup-%TODAY%

echo ============================================
echo  顶级个人简历 - 每日代码备份工具
echo  备份日期: %TODAY%
echo ============================================
echo.

:: 检查今日标签是否已存在
git tag -l "%TAG%" | findstr /i "%TAG%" >nul 2>&1
if not errorlevel 1 (
    echo [跳过] 今日 %TODAY% 已有备份，无需重复备份。
    echo.
    echo 当前所有备份:
    git tag -l "backup-*" --sort=-version:refname
    echo.
    pause
    exit /b 0
)

:: 暂存所有变更并提交
echo [备份中] 正在收集代码变更...
git add -A
git commit -m "backup-%TODAY%" --allow-empty
if errorlevel 1 (
    echo [错误] 提交失败！请检查 Git 配置。
    pause
    exit /b 1
)

:: 打标签
git tag %TAG%
echo [成功] 备份标签已创建: %TAG%
echo.

:: 统计并清理旧备份（保留最新3个）
echo [检查] 正在检查旧备份...
set COUNT=0
for /f %%t in ('git tag -l "backup-*" --sort=-version:refname') do set /a COUNT+=1

if %COUNT% GTR 3 (
    :: 找出最旧的标签并删除
    for /f %%t in ('git tag -l "backup-*" --sort=version:refname') do (
        set OLDEST=%%t
        goto :delete_oldest
    )
    :delete_oldest
    echo [清理] 备份已超过3个，删除最旧备份: %OLDEST%
    git tag -d %OLDEST%
)

echo.
echo ============================================
echo  备份完成！当前保留的备份:
git tag -l "backup-*" --sort=-version:refname
echo ============================================
echo.
pause
