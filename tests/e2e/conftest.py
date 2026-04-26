"""
Pytest configuration and fixtures for E2E tests.
"""
import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest


@pytest.fixture(scope="function")
def test_repo_dir() -> Generator[Path, None, None]:
    """
    Provides a temporary directory for test repository operations.
    Creates and cleans up the directory after each test.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture(scope="function")
def test_vectors_cleanup():
    """
    Fixture that provides cleanup function for test vectors.
    Yields a register function that can be called to register cleanup callbacks.
    """
    cleanup_funcs = []
    
    def register_cleanup(func):
        cleanup_funcs.append(func)
    
    yield register_cleanup
    
    # Execute cleanup functions after test
    for func in cleanup_funcs:
        try:
            func()
        except Exception as e:
            pytest.skip(f"Cleanup failed: {e}")


@pytest.fixture(scope="session")
def api_base_url() -> str:
    """Get API base URL from environment or default."""
    return os.getenv("API_URL", "http://localhost:8000")


@pytest.fixture(scope="session")
def test_repo_url() -> str:
    """Get test repo URL from environment or default."""
    return os.getenv("E2E_TEST_REPO", "https://github.com/google/e2e-test-repo")