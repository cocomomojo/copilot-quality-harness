import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Files from './Files.jsx';
import { jsonResponse, mockFetch, renderWithApp } from '../test-utils.jsx';

const file = { fileId: 'f1', fileName: 'report.pdf', fileSize: 2048, fileType: 'application/pdf', uploadedAt: '2026-01-01T00:00:00Z' };

describe('Files page', () => {
  let files;
  let fetchMock;

  beforeEach(() => {
    files = [file];
    fetchMock = mockFetch({
      'GET /api/files': () => jsonResponse(files),
      'POST /api/files/presigned-url': { presignedUrl: 'https://s3.example/upload', fileId: 'f2', key: 'k2' },
      'PUT https://s3.example/upload': () => jsonResponse({}),
      'POST /api/files/record-upload': (url, init) => {
        const body = JSON.parse(init.body);
        files = [...files, { ...body, uploadedAt: '2026-01-02T00:00:00Z' }];
        return jsonResponse({}, 201);
      },
      'DELETE /api/files/f1': () => {
        files = [];
        return jsonResponse({});
      },
      'GET /api/files/f1/presigned-url': { presignedUrl: 'https://s3.example/download' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const fileInput = (container) => container.querySelector('input[type="file"]');

  it('lists files with formatted size', async () => {
    renderWithApp(<Files />);
    const row = await screen.findByTestId('file-item-f1');
    expect(within(row).getByText('report.pdf')).toBeInTheDocument();
    expect(within(row).getByText('2 KB')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    files = [];
    renderWithApp(<Files />);
    expect(await screen.findByText('No files uploaded yet')).toBeInTheDocument();
  });

  it('uploads a file via presigned URL and records metadata', async () => {
    const { container } = renderWithApp(<Files />);
    await screen.findByTestId('file-item-f1');
    const upload = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    await userEvent.upload(fileInput(container), upload);

    expect(await screen.findByTestId('file-item-f2')).toHaveTextContent('hello.txt');
    expect(screen.getByTestId('toast')).toHaveTextContent('hello.txt uploaded successfully');
    const s3Call = fetchMock.mock.calls.find(([url]) => url === 'https://s3.example/upload');
    expect(s3Call[1]).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'text/plain' } });
  });

  it('reports upload failures per file', async () => {
    mockFetch({
      'GET /api/files': () => jsonResponse([]),
      'POST /api/files/presigned-url': () => jsonResponse({ error: 'denied' }, 403),
    });
    const { container } = renderWithApp(<Files />);
    await screen.findByText('No files uploaded yet');
    await userEvent.upload(fileInput(container), new File(['x'], 'x.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Failed to upload x.txt: denied')).toBeInTheDocument();
  });

  it('ignores empty file selection', async () => {
    const { container } = renderWithApp(<Files />);
    await screen.findByTestId('file-item-f1');
    fireEvent.change(fileInput(container), { target: { files: [] } });
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/files/presigned-url')).toBe(false);
  });

  it('downloads a file in a new window', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithApp(<Files />);
    await userEvent.click(await screen.findByTestId('file-download-button-f1'));
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://s3.example/download', '_blank'));
  });

  it('deletes a file after confirmation and skips when cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderWithApp(<Files />);
    await userEvent.click(await screen.findByTestId('file-delete-button-f1'));
    expect(screen.getByTestId('file-item-f1')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('file-delete-button-f1'));
    expect(await screen.findByText('No files uploaded yet')).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith('Delete report.pdf?');
    expect(screen.getByTestId('toast')).toHaveTextContent('File deleted successfully');
  });

  it('shows errors for failed load, download and delete', async () => {
    mockFetch({ 'GET /api/files': () => jsonResponse({ error: 'load failed' }, 500) });
    renderWithApp(<Files />);
    expect(await screen.findByText('load failed')).toBeInTheDocument();
  });

  it('shows errors for failed download and delete', async () => {
    mockFetch({
      'GET /api/files': () => jsonResponse([file]),
      'GET /api/files/f1/presigned-url': () => jsonResponse({ error: 'no url' }, 500),
      'DELETE /api/files/f1': () => jsonResponse({ error: 'no delete' }, 500),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithApp(<Files />);
    await userEvent.click(await screen.findByTestId('file-download-button-f1'));
    expect(await screen.findByText('no url')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('file-delete-button-f1'));
    expect(await screen.findByText('no delete')).toBeInTheDocument();
  });
});
