#!/bin/bash
# Cleanup test repository and test vectors from database
# Usage: ./cleanup_test_repo.sh <REPO_PATH> [REPO_NAME]
# Example: ./cleanup_test_repo.sh /tmp/xyz123/e2e-test-repo e2e-test-repo

set -e

REPO_PATH="$1"
REPO_NAME="${2:-$(basename "$REPO_PATH")}"

if [ -z "$REPO_PATH" ]; then
    echo "Usage: $0 <REPO_PATH> [REPO_NAME]"
    exit 1
fi

# Remove git directory
if [ -d "$REPO_PATH/.git" ]; then
    echo "Removing git directory: $REPO_PATH"
    rm -rf "$REPO_PATH"
fi

# Remove parent temp directory if empty
TEMP_PARENT=$(dirname "$REPO_PATH")
if [ -d "$TEMP_PARENT" ] && [ -z "$(ls -A "$TEMP_PARENT" 2>/dev/null)" ]; then
    echo "Removing temp parent: $TEMP_PARENT"
    rm -rf "$TEMP_PARENT"
fi

# Delete test vectors from database
echo "Cleaning up test vectors for repo: $REPO_NAME"

# Get database URL from environment
DATABASE_URL="${SUPABASE_CONNECTION_STRING:-${DATABASE_URL:-}}"

if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "DELETE FROM code_chunks WHERE repo = '$REPO_NAME';" || {
        echo "Warning: Failed to clean up database vectors"
    }
else
    echo "Warning: No database URL configured, skipping vector cleanup"
fi

echo "Cleanup complete for: $REPO_NAME"