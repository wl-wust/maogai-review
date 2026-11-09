@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" scripts\serve.mjs --open
  goto :end
)

where node >nul 2>nul
if %errorlevel% equ 0 (
  node scripts\serve.mjs --open
  goto :end
)

echo 未找到 Node.js，无法启动本地离线服务。
echo 请安装 Node.js 后重新双击“启动.bat”。
pause

:end
