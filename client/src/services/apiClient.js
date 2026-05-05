import { resolveApiBaseUrl } from '../utils/apiBaseUrl.js';

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV);

export const createApiClient = (getIdToken) => {
  const request = async (path, options = {}) => {
    const token = await getIdToken();

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Request failed.');
    }

    return payload;
  };

  return {
    getProductByBarcode: (barcode) => request(`/products/${encodeURIComponent(barcode)}`),
    analyzeProduct: (body) =>
      request('/analysis', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    getHistory: () => request('/history'),
    addHistory: (entry) =>
      request('/history', {
        method: 'POST',
        body: JSON.stringify(entry)
      })
  };
};
