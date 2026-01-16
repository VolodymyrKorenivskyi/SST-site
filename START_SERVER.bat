@echo off
title Backend Server - SST Site
color 0A
echo ========================================
echo    Запуск Backend сервера (API)
echo ========================================
echo.
echo Це вікно показує логи Backend сервера
echo Якщо бачите помилки - скопіюйте їх
echo.
echo Натисніть Ctrl+C для зупинки
echo.
npm run dev:server
pause
