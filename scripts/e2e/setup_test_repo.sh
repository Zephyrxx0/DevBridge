#!/bin/bash
# Setup test repository for E2E testing
# Usage: ./setup_test_repo.sh [REPO_URL]
# Default: uses E2E_TEST_REPO env var or https://github.com/google/e2e-test-repo

set -e

REPO_URL="${1:-$E2E_TEST_REPO}"
REPO_URL="${REPO_URL:-https://github.com/google/e2e-test-repo}"

# Create temp directory
TEMP_DIR=$(mktemp -d)
echo "Created temp directory: $TEMP_DIR"

# Extract repo name from URL
REPO_NAME=$(basename "$REPO_URL" .git)
REPO_PATH="$TEMP_DIR/$REPO_NAME"

# Clone repository
echo "Cloning $REPO_URL ..."
git clone --depth 1 "$REPO_URL" "$REPO_PATH"

echo "Test repo path: $REPO_PATH"
echo "$REPO_PATH"