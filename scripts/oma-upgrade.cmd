@echo off
REM oma-upgrade.cmd — Windows wrapper for oma-upgrade.sh
REM Forwards all args to Git Bash; auto-detects bash.exe location.

setlocal

set BASH_PATHS=^
"C:\Program Files\Git\bin\bash.exe" ^
"C:\Program Files (x86)\Git\bin\bash.exe" ^
"%LOCALAPPDATA%\Programs\Git\bin\bash.exe"

set BASH_EXE=
for %%P in (%BASH_PATHS%) do (
  if exist %%P (
    set BASH_EXE=%%P
    goto :found
  )
)

echo [err] Git Bash not found. Install Git for Windows: https://git-scm.com/download/win
exit /b 1

:found
%BASH_EXE% -c "bash '%~dp0oma-upgrade.sh' %*"
exit /b %ERRORLEVEL%
