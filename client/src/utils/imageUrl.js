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
  const baseUrl = import.meta.env.VITE_API_URL || 'https://evs-crm.towsindia.com';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};
