@echo off
echo ========================================
echo Зупинка всіх Node.js процесів
echo ========================================
echo.
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo ✅ Всі Node процеси зупинено
) else (
    echo ℹ️  Node процеси не знайдено або вже зупинені
)
echo.
echo Порт 3000 та 5173 тепер вільні
echo Можете запускати сервер заново
echo.
pause
