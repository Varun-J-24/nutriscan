import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createApiClient } from '../services/apiClient.js';

const FAVORITES_KEY = 'nutriscan_favorites';

export function useScanHistory() {
  const { getIdToken } = useAuth();
  const api = useMemo(() => createApiClient(getIdToken), [getIdToken]);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const [favorites, setFavorites] = useState(() => {
    if (typeof window === 'undefined') return [];

    try {
      const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = useCallback((barcode) => {
    if (!barcode) return;

    setFavorites((prev) =>
      prev.includes(barcode) ? prev.filter((item) => item !== barcode) : [...prev, barcode]
    );
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await api.getHistory();
      setHistory(response.items || []);
    } catch (error) {
      setHistoryError(error.message || 'Unable to load history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    api,
    history,
    historyLoading,
    historyError,
    loadHistory,
    favorites,
    favoriteSet,
    toggleFavorite,
    clearFavorites
  };
}
