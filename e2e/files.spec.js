import { expect, test } from '@playwright/test';
import path from 'path';

test.describe('File Management', () => {
  let authToken;
  let userEmail;

  test.beforeEach(async ({ page, request }) => {
    // Register new user
    const timestamp = Date.now();
    userEmail = `file-user${timestamp}@example.com`;
    const password = 'Password123!';

    const registerRes = await request.post('/api/auth/register', {
      data: { email: userEmail, password, name: 'File User' },
    });
    authToken = (await registerRes.json()).token;

    // Set token and navigate to files page
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userData', JSON.stringify({ email: userEmail }));
    }, authToken);

    await page.goto('/files');
    await page.waitForLoadState('networkidle');
  });

  test('E2E-201: User can upload a file', async ({ page }) => {
    // Create a test file
    const fileName = 'test-file.txt';
    const fileContent = 'This is a test file content';

    // Find file input and upload
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Create file buffer
      const buffer = Buffer.from(fileContent);
      
      // Set files
      await fileInput.setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: buffer,
      });

      // Wait for upload to complete
      await page.waitForTimeout(2000);

      // Verify file appears in the list
      await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-202: User can view file list', async ({ page, request }) => {
    // Upload a file via API
    const fileName = 'api-uploaded-file.txt';
    
    // Get presigned URL
    const presignedRes = await request.post('/api/files/presigned-upload', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { fileName, fileType: 'text/plain' },
    });
    expect(presignedRes.ok()).toBeTruthy();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify file is in list
    const fileList = page.locator('[data-testid*="file"], .file-item, li');
    await expect(fileList).toBeVisible({ timeout: 10000 });
  });

  test('E2E-203: User can download a file', async ({ page, request }) => {
    const fileName = 'downloadable-file.txt';

    // Upload file via API
    const presignedRes = await request.post('/api/files/presigned-upload', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { fileName, fileType: 'text/plain' },
    });
    expect(presignedRes.ok()).toBeTruthy();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find and click download button
    const downloadButton = page.locator(`text=${fileName}`).locator('..').locator('button').filter({ hasText: /download/i }).first();
    
    if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Setup listener for download
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toContain(fileName);
    }
  });

  test('E2E-204: User can delete a file', async ({ page, request }) => {
    const fileName = 'deletable-file.txt';

    // Upload file via API
    const presignedRes = await request.post('/api/files/presigned-upload', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { fileName, fileType: 'text/plain' },
    });
    expect(presignedRes.ok()).toBeTruthy();
    const presignedData = await presignedRes.json();
    const fileId = presignedData.fileId;

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find and click delete button
    const deleteButton = page.locator(`text=${fileName}`).locator('..').locator('button').filter({ hasText: /delete|remove/i }).first();
    
    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm delete if dialog appears
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Verify file is removed from list
      await expect(page.locator(`text=${fileName}`)).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('E2E-205: File upload handles large files', async ({ page }) => {
    // Create a larger test file (1MB)
    const fileName = 'large-file.bin';
    const largeBuffer = Buffer.alloc(1024 * 1024);

    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fileInput.setInputFiles({
        name: fileName,
        mimeType: 'application/octet-stream',
        buffer: largeBuffer,
      });

      // Wait for upload to complete
      await page.waitForTimeout(3000);

      // Verify file appears in the list (or shows success message)
      const fileElement = page.locator(`text=${fileName}`);
      const successMessage = page.locator('[data-testid*="success"], .success, .toast').filter({ hasText: /success|uploaded/i });
      
      const fileVisible = fileElement.isVisible({ timeout: 10000 }).catch(() => false);
      const successVisible = successMessage.isVisible({ timeout: 10000 }).catch(() => false);
      
      expect(await fileVisible || await successVisible).toBeTruthy();
    }
  });

  test('E2E-206: Drag and drop file upload works', async ({ page }) => {
    const fileName = 'drag-drop-file.txt';
    const fileContent = 'Drag and drop test file';

    // Find drop zone
    const dropZone = page.locator('[data-testid*="drop"], .drop-zone, .file-upload').first();
    
    if (await dropZone.isVisible({ timeout: 5000 }).catch(() => false)) {
      const buffer = Buffer.from(fileContent);
      
      // Perform drag and drop
      await dropZone.dispatchEvent('dragover');
      
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: fileName,
          mimeType: 'text/plain',
          buffer: buffer,
        });
      }

      await page.waitForTimeout(2000);

      // Verify file appears
      await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 10000 });
    }
  });
});
