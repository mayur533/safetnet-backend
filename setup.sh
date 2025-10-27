#!/bin/bash

echo "🚀 Safe T Net - Setting up the development environment..."

# Setup Frontend
echo "📦 Installing frontend dependencies..."
cd safe-fleet-admin
npm install
cd ..

# Setup Backend
echo "🐍 Setting up Python virtual environment..."
cd SafeTNet

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv and install requirements
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the application, run:"
echo "  npm start"
echo ""
echo "Or run separately:"
echo "  Backend: cd SafeTNet && source venv/bin/activate && python manage.py runserver"
echo "  Frontend: cd safe-fleet-admin && npm run dev"

