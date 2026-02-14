#!/bin/bash
set -e

echo "🚀 Initializing PipPaper development environment..."

# Check Deno
if ! command -v deno &> /dev/null; then
    echo "❌ Deno not found. Please install Deno: https://deno.land/manual/getting_started/installation"
    exit 1
fi

echo "🦕 Deno version: $(deno --version | head -n 1)"

# Check .env
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env. Please update it with your API keys."
else
    echo "✅ .env file exists."
fi

# Start dev server
echo "✅ Starting development server..."
echo "🌐 App running at http://localhost:8000"
deno task start
