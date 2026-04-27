import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

test.describe('Full Ingestion Loop E2E', () => {
  const repoName = 'e2e-test-repo';
  const sampleFile = 'sample.py';
  const bucket = process.env.GCS_BUCKET || 'handy-curve-491715-e9-code-snapshots';
  const rootDir = path.resolve(__dirname, '../../');

  test.beforeAll(async () => {
    // Ensure clean state
    try {
      execSync(`python ${path.join(rootDir, 'scripts/cleanup_e2e.py')} --repo ${repoName}`, { stdio: 'inherit' });
    } catch (e) {
      console.warn('Cleanup failed, might be first run or missing credentials. Continuing...');
    }
  });

  test.afterAll(async () => {
    // Cleanup after test
    try {
      execSync(`python ${path.join(rootDir, 'scripts/cleanup_e2e.py')} --repo ${repoName}`, { stdio: 'inherit' });
    } catch (e) {
      console.error('Final cleanup failed:', e);
    }
  });

  test('should ingest file and retrieve via chat', async ({ page }) => {
    // 1. Simulate Ingestion: Upload file to GCS
    const content = 'def hello_world():\n    return "Hello from E2E test"';
    console.log(`Uploading to gs://${bucket}/${repoName}/${sampleFile}`);
    
    // Using python one-liner to upload since we have google-cloud-storage installed in .venv
    const uploadCmd = `python -c "from google.cloud import storage; client = storage.Client(); bucket = client.bucket('${bucket}'); blob = bucket.blob('${repoName}/${sampleFile}'); blob.upload_from_string('''${content}''')"`;
    execSync(uploadCmd, { stdio: 'inherit' });

    // Wait for ingestion processing (polling for DB state or just fixed wait for v0.1)
    console.log('Waiting for ingestion worker to process...');
    // In a real scenario, we'd poll an API to check repo status.
    await page.waitForTimeout(15000); 

    // 2. Verify UI Retrieval
    await page.goto(`/repo/${repoName}`);
    
    // We expect the chat input to be present
    const chatInput = page.locator('textarea[placeholder*="Ask"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    await chatInput.fill('What does the hello_world function in sample.py return?');
    await page.keyboard.press('Enter');

    // 3. Assert Response
    // Responses are streamed, so we wait for the content to appear in a bubble
    const assistantResponse = page.locator('.chat-message-assistant, .bg-card').last();
    await expect(assistantResponse).toContainText('Hello from E2E test', { timeout: 45000 });
    await expect(assistantResponse).toContainText(sampleFile);
  });
});
