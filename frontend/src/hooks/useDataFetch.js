import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing data fetching with auto-refresh
 * @param {Function} fetchFn - Function that returns a promise
 * @param {number} autoRefreshMs - Auto-refresh interval in milliseconds (0 to disable)
 * @returns {Object} { data, loading, error, refetch, setData }
 */
export function useDataFetch(fetchFn, autoRefreshMs = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (e) {
      setError(e);
      console.error('Data fetch error:', e);
    }
  }, [fetchFn]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await refetch();
      setLoading(false);
    })();
  }, [refetch]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshMs > 0) {
      intervalRef.current = setInterval(() => {
        refetch();
      }, autoRefreshMs);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoRefreshMs, refetch]);

  return { data, loading, error, refetch, setData };
}
