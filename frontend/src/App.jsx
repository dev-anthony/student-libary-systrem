import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Books from './pages/Books.jsx';
import Loans from './pages/Loans.jsx';

const PAGES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'students',  label: 'Students' },
  { key: 'books',     label: 'Books' },
  { key: 'loans',     label: 'Loans' },
];

export default function App() {
  const [page, setPage] = useState(() => {
    // Restore page from localStorage on app load
    const saved = localStorage.getItem('currentPage');
    return saved && PAGES.some(p => p.key === saved) ? saved : 'dashboard';
  });

  // Save page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', page);
  }, [page]);

  return (
    <div className="min-h-screen bg-gray-50">
      {page !== 'dashboard' && (
        <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-1 px-4 h-14">
            {PAGES.map(p => (
              <button
                key={p.key}
                onClick={() => setPage(p.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${page === p.key
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'students'  && <div className="p-5"><Students /></div>}
      {page === 'books'     && <div className="p-5"><Books /></div>}
      {page === 'loans'     && <div className="p-5"><Loans /></div>}
    </div>
  );
}