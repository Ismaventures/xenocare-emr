@echo off
REM ============================================================================
REM NDC EMR Server Information Script
REM 
REM Run this script on the SERVER machine (where Supabase is running)
REM to display the IP address that clients should connect to.
REM ============================================================================

echo.
echo ========================================
echo    NDC EMR - Server Information
echo ========================================
echo.

REM Check if Supabase/Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker does not appear to be running!
    echo Please start Docker Desktop and Supabase before clients can connect.
    echo.
) else (
    docker ps --filter "name=supabase" --format "{{.Names}}" | findstr supabase >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Supabase containers not found!
        echo Please start Supabase with: npx supabase start
        echo.
    ) else (
        echo [OK] Supabase is running
        echo.
    )
)

echo Your network IP addresses:
echo --------------------------
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    echo   %%a
)

echo.
echo ========================================
echo    Client Setup Instructions
echo ========================================
echo.
echo 1. Install the EMR application on client computers
echo 2. When launched for the first time, clients will see a setup screen
echo 3. Enter one of the IP addresses shown above (usually starts with 192.168.x.x)
echo 4. Click "Test" to verify connection, then "Connect ^& Continue"
echo.
echo Supabase Services:
echo   - API:      http://YOUR_IP:54321
echo   - Studio:   http://YOUR_IP:54323
echo   - Database: YOUR_IP:54322
echo.
echo ========================================
echo.
pause
