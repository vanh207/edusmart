@echo off
echo ========================================
echo   Installing PostgreSQL Package
echo ========================================
echo.

npm install pg

echo.
echo ========================================
echo   PostgreSQL Package Installed!
echo ========================================
echo.
echo Next steps:
echo 1. Create PostgreSQL database on Render
echo 2. Copy DATABASE_URL from Render
echo 3. Set environment variable:
echo    set DATABASE_URL=postgresql://...
echo 4. Run migration:
echo    node migrate-to-postgres.js
echo.
pause
