#!/bin/bash
# Security Scan Script for DevBridge
# Unified entry point for automated security scanning.

set -e

echo "Starting Security Scan..."

# 1. Python Security Scan (Bandit)
echo "--------------------------------------------------"
echo "Running Bandit (Python Security Scanner - High Severity)..."
if command -v bandit &> /dev/null; then
    bandit -r api/ -lll
elif [ -f ".venv/Scripts/bandit" ]; then
    .venv/Scripts/bandit -r api/ -lll
elif [ -f ".venv/bin/bandit" ]; then
    .venv/bin/bandit -r api/ -lll
else
    echo "Warning: bandit not found. Attempting to run via python -m bandit."
    python -m bandit -r api/ -lll
fi

# 2. Web Security Scan (npm audit)
echo "--------------------------------------------------"
echo "Running npm audit in web/ (High Severity)..."
cd web/
npm audit --audit-level=high
cd ..

echo "--------------------------------------------------"
echo "Security Scan Completed Successfully."
