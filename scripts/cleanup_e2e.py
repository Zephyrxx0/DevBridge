import os
import argparse
import psycopg
from google.cloud import storage

def _normalize_psycopg_conn(connection_string: str) -> str:
    """Normalize connection string for psycopg3."""
    # Remove SQLAlchemy prefix if present
    return connection_string.replace("postgresql+psycopg://", "postgresql://")

def cleanup_e2e(repo_name="e2e-test-repo", dry_run=False):
    """Purge E2E test data from database and GCS."""
    print(f"Starting E2E cleanup for repo: {repo_name}")
    
    # 1. Database Cleanup
    conn_str = os.environ.get("SUPABASE_CONNECTION_STRING")
    if not conn_str:
        print("Warning: SUPABASE_CONNECTION_STRING not set. Skipping DB cleanup.")
    else:
        try:
            conn = psycopg.connect(_normalize_psycopg_conn(conn_str))
            with conn.cursor() as cur:
                # Delete code chunks
                sql1 = "DELETE FROM code_chunks WHERE repo = %s"
                if not dry_run:
                    cur.execute(sql1, (repo_name,))
                    print(f"Deleted {cur.rowcount} code chunks")
                else:
                    print(f"[Dry Run] Would execute: {sql1} with {repo_name}")

                # Delete pull requests
                sql2 = "DELETE FROM pull_requests WHERE repo = %s"
                if not dry_run:
                    cur.execute(sql2, (repo_name,))
                    print(f"Deleted {cur.rowcount} pull requests")
                else:
                    print(f"[Dry Run] Would execute: {sql2} with {repo_name}")

                # Delete repository metadata
                try:
                    sql3 = "DELETE FROM repositories WHERE full_name = %s"
                    if not dry_run:
                        cur.execute(sql3, (repo_name,))
                        print(f"Deleted {cur.rowcount} repositories")
                    else:
                        print(f"[Dry Run] Would execute: {sql3} with {repo_name}")
                except Exception as db_err:
                     print(f"Note: Could not clean repositories table (may not exist): {db_err}")
                     conn.rollback()

                if not dry_run:
                    conn.commit()
            conn.close()
        except Exception as e:
            print(f"DB Cleanup Error: {e}")

    # 2. GCS Cleanup
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "code-snapshots")
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        # List blobs with the repo prefix
        blobs = list(bucket.list_blobs(prefix=f"{repo_name}/"))
        
        if dry_run:
            print(f"[Dry Run] Would delete {len(blobs)} blobs from gs://{bucket_name}/{repo_name}/")
        else:
            for blob in blobs:
                blob.delete()
            print(f"Deleted {len(blobs)} blobs from gs://{bucket_name}/{repo_name}/")
            
    except Exception as e:
        print(f"GCS Cleanup Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cleanup E2E test artifacts.")
    parser.add_argument("--repo", default="e2e-test-repo", help="Repository name to purge.")
    parser.add_argument("--dry-run", action="store_true", help="Perform a dry run.")
    args = parser.parse_args()
    
    cleanup_e2e(repo_name=args.repo, dry_run=args.dry_run)
