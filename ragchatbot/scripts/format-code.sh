#!/bin/bash

echo "🎨 Formatting code..."
echo

echo "📋 1. Running Black (code formatting)..."
uv run black .

echo
echo "🗂️  2. Running isort (import sorting)..."
uv run isort .

echo
echo "✅ Code formatting complete!"