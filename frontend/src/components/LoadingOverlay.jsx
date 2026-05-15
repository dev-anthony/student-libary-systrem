import React from 'react';

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-700">Loading...</p>
      </div>
    </div>
  );
}
