import { expect, test } from '@playwright/test';
import { API_BASE, authHeaders, registerUser } from './helpers.js';

async function createFileMetadata(request, token, suffix = '') {
  const presign = await request.post(`${API_BASE}/files/presigned-url`, {
    headers: authHeaders(token),
    data: { filename: `file-${suffix}-${Date.now()}.txt`, contentType: 'text/plain' },
  });
  expect(presign.status()).toBe(200);
  const { fileId, key } = await presign.json();

  const record = await request.post(`${API_BASE}/files/record-upload`, {
    headers: authHeaders(token),
    data: {
      fileName: `file-${suffix}.txt`,
      fileSize: 128,
      fileType: 'text/plain',
      fileId,
      key,
    },
  });
  expect(record.status()).toBe(201);
  return { fileId, key };
}

test.describe('Files API', () => {
  test('E2E-301 list files empty', async ({ request }) => {
    const user = await registerUser(request, 'files-empty');
    const res = await request.get(`${API_BASE}/files`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('E2E-302 create presigned upload URL', async ({ request }) => {
    const user = await registerUser(request, 'files-presigned');
    const res = await request.post(`${API_BASE}/files/presigned-url`, {
      headers: authHeaders(user.token),
      data: { filename: 'upload.txt', contentType: 'text/plain' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.presignedUrl).toBeTruthy();
    expect(body.fileId).toBeTruthy();
    expect(body.key).toContain(user.userId);
  });

  test('E2E-303 presigned-upload alias works', async ({ request }) => {
    const user = await registerUser(request, 'files-alias');
    const res = await request.post(`${API_BASE}/files/presigned-upload`, {
      headers: authHeaders(user.token),
      data: { fileName: 'upload-legacy.txt', fileType: 'text/plain' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.presignedUrl).toBeTruthy();
  });

  test('E2E-304 missing upload fields returns 400', async ({ request }) => {
    const user = await registerUser(request, 'files-missing');
    const res = await request.post(`${API_BASE}/files/presigned-url`, {
      headers: authHeaders(user.token),
      data: { filename: 'missing.txt' },
    });
    expect(res.status()).toBe(400);
  });

  test('E2E-305 record upload metadata', async ({ request }) => {
    const user = await registerUser(request, 'files-record');
    const { fileId, key } = await createFileMetadata(request, user.token, 'record');
    expect(fileId).toBeTruthy();
    expect(key).toBeTruthy();
  });

  test('E2E-306 list files after record', async ({ request }) => {
    const user = await registerUser(request, 'files-list');
    const { fileId } = await createFileMetadata(request, user.token, 'list');
    const res = await request.get(`${API_BASE}/files`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const files = await res.json();
    expect(files.some((f) => f.fileId === fileId)).toBeTruthy();
  });

  test('E2E-307 get file detail by id', async ({ request }) => {
    const user = await registerUser(request, 'files-get');
    const { fileId } = await createFileMetadata(request, user.token, 'get');
    const res = await request.get(`${API_BASE}/files/${fileId}`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.fileId).toBe(fileId);
  });

  test('E2E-308 get missing file returns 404', async ({ request }) => {
    const user = await registerUser(request, 'files-missing-id');
    const res = await request.get(`${API_BASE}/files/not-found`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(404);
  });

  test('E2E-309 get download URL by file id', async ({ request }) => {
    const user = await registerUser(request, 'files-download');
    const { fileId } = await createFileMetadata(request, user.token, 'download');
    const res = await request.get(`${API_BASE}/files/${fileId}/presigned-url`, {
      headers: authHeaders(user.token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.presignedUrl).toBeTruthy();
  });

  test('E2E-310 delete file', async ({ request }) => {
    const user = await registerUser(request, 'files-delete');
    const { fileId } = await createFileMetadata(request, user.token, 'delete');
    const del = await request.delete(`${API_BASE}/files/${fileId}`, {
      headers: authHeaders(user.token),
    });
    expect(del.status()).toBe(204);
    const get = await request.get(`${API_BASE}/files/${fileId}`, {
      headers: authHeaders(user.token),
    });
    expect(get.status()).toBe(404);
  });

  test('E2E-311 unauthorized file list returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/files`);
    expect(res.status()).toBe(401);
  });
});

