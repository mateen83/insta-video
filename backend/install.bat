@echo off
echo 🚀 Installing Instagram Reel Scraper Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo ⚙️ Creating .env file...
    copy .env.example .env
    echo ✅ .env file created. Please edit it with your configuration.
)

echo.
echo 🎉 Installation complete!
echo.
echo 📋 Next steps:
echo 1. Edit .env file with your configuration
echo 2. Run 'npm run dev' to start development server
echo 3. Run 'npm test' to test the API
echo.
echo 📍 API will be available at: http://localhost:3001
echo 📍 Health check: http://localhost:3001/health
pause