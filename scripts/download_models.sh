#!/bin/bash
# Model pre-download script for vLLM caches

set -e

echo "Starting model cache pre-download..."
echo "--------------------------------------------------"

echo "Downloading Qwen model into isolated cache (qwen)..."
export HF_HOME="/app/repo_cache/qwen"
huggingface-cli download Qwen/Qwen2.5-72B-Instruct-AWQ

echo "--------------------------------------------------"
echo "Downloading Gemma model into isolated cache (gemma)..."
export HF_HOME="/app/repo_cache/gemma"
huggingface-cli download Gemma-4-9B-it

echo "--------------------------------------------------"
echo "Model cache pre-download completed successfully."
