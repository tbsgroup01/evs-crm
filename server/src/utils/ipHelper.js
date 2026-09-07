/**
 * Helper to extract, normalize, and format the client's real IP address.
 * Handles reverse proxies (X-Forwarded-For, X-Real-IP, Cloudflare), IPv6 loopback (::1 -> 127.0.0.1),
 * and IPv4-mapped IPv6 addresses (::ffff:192.168.x.x).
 */
const getRealIp = (req) => {
  if (!req) return '127.0.0.1';

  let ip =
    req.headers?.['cf-connecting-ip'] ||
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }

  return ip;
};

module.exports = {
  getRealIp
};
