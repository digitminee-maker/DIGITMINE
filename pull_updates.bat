@echo off

:: Continuous pull script for live synchronization
:: Adjust the branch name if you are using a different default branch
set "BRANCH=master"

:loop
    echo [%date% %time%] Pulling latest changes from origin %BRANCH%...
    git pull origin %BRANCH%
    if %errorlevel% neq 0 (
        echo Pull failed (error %errorlevel%). Will retry shortly.
    )
    timeout /t 5 >nul
    goto loop
