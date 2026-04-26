@echo off
REM Bootstrap para doble-click: invoca stop-all.ps1.
REM   stop-all.cmd             -> detiene servicios, deja Docker infra arriba.
REM   stop-all.cmd -IncludeInfra -> tambien baja postgres/kafka/ngrok.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1" %*
