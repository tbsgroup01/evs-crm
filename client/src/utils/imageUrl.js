export const getImageUrl = (path) => {
  if (!path) return '';
  if (
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5505';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};
