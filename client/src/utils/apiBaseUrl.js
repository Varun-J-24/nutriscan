export function resolveApiBaseUrl(rawValue, isDev) {
  const raw = String(rawValue || '').trim();

  if (!raw) return '/api';

  const noTrailing = raw.replace(/\/+$/, '');

  if (!isDev && /localhost|127\.0\.0\.1/i.test(noTrailing)) {
    return '/api';
  }

  if (/^https?:\/\//i.test(noTrailing)) {
    try {
      const parsed = new URL(noTrailing);
      const normalizedPath = parsed.pathname.replace(/\/+$/, '');

      if (!normalizedPath || normalizedPath === '/') {
        parsed.pathname = '/api';
      } else if (normalizedPath === '/api') {
        parsed.pathname = '/api';
      } else if (normalizedPath.endsWith('/api')) {
        parsed.pathname = normalizedPath;
      } else if (normalizedPath.endsWith('/api/api')) {
        parsed.pathname = normalizedPath.replace(/\/api\/api$/, '/api');
      } else {
        parsed.pathname = `${normalizedPath}/api`;
      }

      return parsed.toString().replace(/\/+$/, '');
    } catch {
      return '/api';
    }
  }

  const normalizedRelative = noTrailing.startsWith('/') ? noTrailing : `/${noTrailing}`;
  if (normalizedRelative === '/api/api') return '/api';
  return normalizedRelative;
}
