import React, { useState, useCallback } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isNetworkErr = (err) =>
  !navigator.onLine ||
  err?.message === 'Failed to fetch' ||
  err?.message?.includes('NetworkError') ||
  err?.message?.includes('network');

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useError()
 *
 * Returns { error, handleError, clear }
 *
 * Usage:
 *   const { error, handleError, clear } = useError();
 *
 *   try {
 *     await api.something();
 *   } catch (e) {
 *     handleError(e);
 *   }
 */
export function useError() {
  const [error, setError] = useState(null);

  const handleError = useCallback((err, fallback = 'Something went wrong. Please try again.') => {
    if (isNetworkErr(err)) {
      setError('No internet connection. Please check your network and try again.');
    } else {
      setError(err?.message || fallback);
    }
  }, []);

  const clear = useCallback(() => setError(null), []);

  return { error, handleError, clear };
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * <ErrorBanner error={...} onDismiss={clear} />
 *
 * Renders nothing when error is null/undefined.
 * Automatically styles differently for network vs. business-logic errors.
 */
export function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;

  const isNet =
    error.toLowerCase().includes('internet') ||
    error.toLowerCase().includes('network') ||
    error.toLowerCase().includes('connect');

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm
        ${isNet
          ? 'bg-orange-50 border-orange-200 text-orange-900'
          : 'bg-red-50 border-red-200 text-red-900'
        }`}
    >
      {/* Icon */}
      <span className="flex-shrink-0 mt-0.5">
        {isNet ? (
          /* wifi-off */
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01
                 m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0
                 M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        ) : (
          /* exclamation-circle */
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </span>

      <p className="flex-1 leading-snug">{error}</p>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-xl leading-none opacity-50 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
}