@echo off
setlocal
cd /d "%~dp0frontend"
set "API_PROXY_TARGET=http://127.0.0.1:3001"
npm.cmd run dev -- --host 127.0.0.1
