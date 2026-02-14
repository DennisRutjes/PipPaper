#!/bin/bash
set -e

echo "🚀 Starting PipPaper..."

# Function to install Deno
install_deno() {
    echo "🦕 Deno not found. Installing..."
    curl -fsSL https://deno.land/install.sh | sh
    
    # Add Deno to PATH for this session
    export DENO_INSTALL="$HOME/.deno"
    export PATH="$DENO_INSTALL/bin:$PATH"
    
    echo "✅ Deno installed successfully."
}

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    install_deno
else
    echo "✅ Deno is already installed: $(deno --version | head -n 1)"
fi

# Check .env
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env. Please update it with your API keys."
    else
        echo "❌ .env.example not found. Please create .env manually."
    fi
else
    echo "✅ .env file exists."
fi

# Start dev server
echo "✅ Starting development server..."
echo "🌐 App running at http://localhost:8000"
deno task start
