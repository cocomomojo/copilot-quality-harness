const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), FILE_SIZE_UNITS.length - 1);
  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${FILE_SIZE_UNITS[i]}`;
}
