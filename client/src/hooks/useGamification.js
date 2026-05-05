import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createApiClient } from '../services/apiClient.js';

export function useGamification() {
  const { getIdToken } = useAuth();
  const api = useMemo(() => createApiClient(getIdToken), [getIdToken]);

  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getGamificationProfile();
      setProfile(res.profile);
      setAchievements(res.achievements || []);
    } catch (err) {
      setError(err.message || 'Failed to load gamification profile.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const processScan = useCallback(
    async (barcode, healthScore) => {
      try {
        const result = await api.processGamificationScan({ barcode, healthScore });
        // Refresh profile after scan
        await loadProfile();
        return result;
      } catch (err) {
        console.error('Gamification scan processing failed:', err.message);
        return null;
      }
    },
    [api, loadProfile]
  );

  return {
    profile,
    achievements,
    loading,
    error,
    loadProfile,
    processScan,
    api
  };
}
