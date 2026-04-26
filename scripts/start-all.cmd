@echo off
REM Bootstrap para doble-click: invoca start-all.ps1 pasando cualquier argumento.
REM Ejemplos:
REM   start-all.cmd
REM   start-all.cmd -Minimal
REM   start-all.cmd -SkipDocker -NoFrontend
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1" %*
