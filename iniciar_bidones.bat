@echo off
cd /d %~dp0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3030 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
start http://localhost:3030
npm.cmd run app
