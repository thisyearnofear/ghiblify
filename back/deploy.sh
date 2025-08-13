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

# Pull latest code or clone if first time
if [ -d ".git" ]; then
    echo "📥 Pulling latest code from GitHub..."
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone $REPO_URL .
fi

# Activate virtual environment
echo "🐍 Activating Python environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
$PIP_PATH install -r back/requirements.txt

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

# Verify deployment
echo "🔍 Verifying deployment..."
sleep 3
if pm2 show ghiblify > /dev/null 2>&1; then
    echo "✅ Deployment completed successfully!"
    echo "🌐 Application is running on port 8000"
else
    echo "❌ Deployment failed!"
    exit 1
fi
