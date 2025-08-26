#!/bin/bash

echo "🔍 Running code quality checks..."
echo

echo "📋 1. Running Black (code formatting check)..."
uv run black --check --diff .
BLACK_EXIT=$?

echo
echo "🗂️  2. Running isort (import sorting check)..."
uv run isort --check-only --diff .
ISORT_EXIT=$?

echo
echo "🔎 3. Running flake8 (linting)..."
uv run flake8 .
FLAKE8_EXIT=$?

echo
echo "========================================="
if [ $BLACK_EXIT -eq 0 ] && [ $ISORT_EXIT -eq 0 ] && [ $FLAKE8_EXIT -eq 0 ]; then
    echo "✅ All quality checks passed!"
    exit 0
else
    echo "❌ Quality checks failed!"
    echo "   - Black: $([ $BLACK_EXIT -eq 0 ] && echo "✅" || echo "❌")"
    echo "   - isort: $([ $ISORT_EXIT -eq 0 ] && echo "✅" || echo "❌")"
    echo "   - flake8: $([ $FLAKE8_EXIT -eq 0 ] && echo "✅" || echo "❌")"
    exit 1
fi