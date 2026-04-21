const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const createApiClient = (getIdToken) => {
  const request = async (path, options = {}) => {
    const token = await getIdToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
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
