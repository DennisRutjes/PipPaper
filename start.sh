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

# Function to install Ollama
install_ollama() {
    echo "🦙 Ollama not found. Installing..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "✅ Ollama installed successfully."
    
    # Pull gemma4 model
    echo "📦 Pulling gemma4 model..."
    ollama pull gemma4
    echo "✅ gemma4 model ready."
}

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    install_deno
else
    echo "✅ Deno is already installed: $(deno --version | head -n 1)"
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    install_ollama
else
    echo "✅ Ollama is already installed: $(ollama --version)"
    
    # Check if gemma4 model exists
    if ! ollama list | grep -q gemma4; then
        echo "📦 Pulling gemma4 model..."
        ollama pull gemma4
        echo "✅ gemma4 model ready."
    else
        echo "✅ gemma4 model already cached."
    fi
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
