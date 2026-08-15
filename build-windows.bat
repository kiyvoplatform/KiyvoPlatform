@echo off
call npm install
if errorlevel 1 goto error
call npm run build:win
if errorlevel 1 goto error
echo.
echo Build complete. Check the desktop\dist folder.
pause
exit /b 0
:error
echo.
echo Build failed. Read the error above.
pause
exit /b 1
