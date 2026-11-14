import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useApp } from '../context/AppContext.jsx';
import './Files.css';

function Files() {
  const { showToast } = useApp();
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const data = await api.files.list();
      setFiles(data || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    for (const file of selectedFiles) {
      try {
        // Get presigned URL
        const { presignedUrl, fileId, key } = await api.files.getPresignedUrl(file.name, file.type);

        // Upload to S3
        await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        // Record upload metadata
        await api.files.recordUpload(file.name, file.size, file.type, fileId, key);
        showToast(`${file.name} uploaded successfully`, 'success');
      } catch (error) {
        showToast(`Failed to upload ${file.name}: ${error.message}`, 'error');
      }
    }

    setIsUploading(false);
    await loadFiles();
    e.target.value = '';
  };

  const deleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Delete ${fileName}?`)) return;

    try {
      await api.files.delete(fileId);
      showToast('File deleted successfully', 'success');
      await loadFiles();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const { presignedUrl } = await api.files.getDownloadUrl(fileId);
      window.open(presignedUrl, '_blank');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <main className="files-page" data-testid="files-page">
      <header className="page-header">
        <h1>File Management</h1>
      </header>

      <section className="upload-section">
        <h2>Upload Files</h2>
        <div className="upload-area" data-testid="file-upload-area">
          <label className="upload-label">
            <div className="upload-icon">📤</div>
            <p className="upload-text">
              Drag and drop files here or click to select
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {isUploading && <p className="uploading">Uploading...</p>}
      </section>

      <section className="files-list-section">
        <h2>Your Files</h2>
        {isLoading ? (
          <p>Loading files...</p>
        ) : files.length === 0 ? (
          <p className="empty-message">No files uploaded yet</p>
        ) : (
          <div className="files-table-wrapper">
            <table className="files-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.fileId} data-testid={`file-item-${file.fileId}`}>
                    <td className="file-name">{file.fileName}</td>
                    <td>{formatFileSize(file.fileSize)}</td>
                    <td>{file.fileType}</td>
                    <td>{new Date(file.uploadedAt).toLocaleDateString()}</td>
                    <td className="file-actions">
                      <button
                        data-testid={`file-download-button-${file.fileId}`}
                        onClick={() => downloadFile(file.fileId, file.fileName)}
                        className="btn btn-sm btn-info"
                      >
                        Download
                      </button>
                      <button
                        data-testid={`file-delete-button-${file.fileId}`}
                        onClick={() => deleteFile(file.fileId, file.fileName)}
                        className="btn btn-sm btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default Files;
