#!/bin/bash
set -e

echo "🚀 Starting Ghiblify Backend Deployment..."

# Configuration
APP_DIR="/opt/ghiblify"
REPO_URL="https://github.com/thisyearnofear/ghiblify.git"
PYTHON_PATH="$APP_DIR/venv/bin/python"
PIP_PATH="$APP_DIR/venv/bin/pip"

# Navigate to app directory
cd $APP_DIR

# Initialize git repository and pull code
if [ -d ".git" ]; then
    echo "📥 Pulling latest code from GitHub..."
    git pull origin main
else
    echo "📥 Initializing repository..."
    git init
    git remote add origin $REPO_URL
    git fetch origin main
    git checkout -b main origin/main
fi

# Activate virtual environment
echo "🐍 Activating Python environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing Python dependencies..."
$PIP_PATH install -r back/requirements.txt

# Install Node.js dependencies for automation services
echo "📦 Installing Node.js automation dependencies..."
cd $APP_DIR/back
if [ -f "package.json" ]; then
    npm install
else
    echo "⚠️  No package.json found in back/ - automation services may not work"
fi
cd $APP_DIR

# Copy environment file if it doesn't exist
if [ ! -f "back/.env" ]; then
    echo "📝 Creating environment file..."
    cp back/.env.example back/.env
    echo "⚠️  Please update back/.env with your actual configuration!"
fi

# Run database migrations (if any)
echo "🗄️ Running database migrations..."
# Add migration commands here when needed

# Restart the application
echo "🔄 Restarting application..."
pm2 restart ghiblify || pm2 start back/main.py --name ghiblify --interpreter $PYTHON_PATH --cwd $APP_DIR

# Start/restart automation services
echo "🤖 Managing automation services..."
cd $APP_DIR/back

# Stop existing automation if running
if pm2 show ghiblify-automation > /dev/null 2>&1; then
    echo "🛑 Stopping existing automation..."
    pm2 stop ghiblify-automation
    pm2 delete ghiblify-automation
fi

# Start price automation service
echo "🚀 Starting price automation..."
pm2 start automation/ghiblify-price-automation.cjs --name ghiblify-automation --cwd $APP_DIR/back

cd $APP_DIR

# Verify deployment
echo "🔍 Verifying deployment..."
sleep 3

# Check main application
if pm2 show ghiblify > /dev/null 2>&1; then
    echo "✅ Main application deployed successfully!"
    echo "🌐 Application is running on port 8000"
else
    echo "❌ Main application deployment failed!"
    exit 1
fi

# Check automation service
if pm2 show ghiblify-automation > /dev/null 2>&1; then
    echo "✅ Price automation service deployed successfully!"
    echo "🤖 Automation monitoring $GHIBLIFY prices"
else
    echo "⚠️  Price automation service not running - check logs"
    echo "💡 Run: pm2 logs ghiblify-automation"
fi

echo ""
echo "🎉 Deployment completed!"
echo "📊 Monitor services: pm2 status"
echo "📈 Check automation: cd back && npm run price:status"
