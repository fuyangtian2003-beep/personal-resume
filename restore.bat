@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo  顶级个人简历 - 代码恢复工具
echo ============================================
echo.

:: 列出所有备份
echo 可用的备份列表:
git tag -l "backup-*" --sort=-version:refname
echo.

set /p TAG="请输入要恢复的备份标签名 (直接回车取消): "

if "%TAG%"=="" (
    echo [取消] 操作已中止。
    pause
    exit /b 0
)

:: 检查标签是否存在
git tag -l "%TAG%" | findstr /i "%TAG%" >nul 2>&1
if errorlevel 1 (
    echo [错误] 标签 "%TAG%" 不存在！请检查输入。
    pause
    exit /b 1
)

echo.
echo [警告] 恢复操作将覆盖当前未保存的所有代码变更！
set /p CONFIRM="确认恢复到 %TAG% 吗? (输入 Y 确认): "

if /i "%CONFIRM%"=="Y" (
    echo [恢复中] 正在切换到 %TAG%...
    git checkout %TAG% .
    echo [成功] 已成功恢复到 %TAG% 状态。
) else (
    echo [取消] 恢复操作已中止。
)

echo.
pause
