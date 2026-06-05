@echo off
REM oma-upgrade.cmd — Windows wrapper for oma-upgrade.sh
REM Forwards all args to Git Bash; auto-detects bash.exe location.

setlocal

set BASH_EXE=
if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%LOCALAPPDATA%\Programs\Git\bin\bash.exe" set "BASH_EXE=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"

if not defined BASH_EXE (
  echo [err] Git Bash not found. Install Git for Windows: https://git-scm.com/download/win
  exit /b 1
)

"%BASH_EXE%" "%~dp0oma-upgrade.sh" %*
exit /b %ERRORLEVEL%
