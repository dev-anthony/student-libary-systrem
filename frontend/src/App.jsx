import React, { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Books from './pages/Books.jsx';
import Loans from './pages/Loans.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');
  return (
    <div className="app">
      <nav>
        <button className={page==='dashboard'?'active':''} onClick={()=>setPage('dashboard')}>Dashboard</button>
        <button className={page==='students'?'active':''} onClick={()=>setPage('students')}>Students</button>
        <button className={page==='books'?'active':''} onClick={()=>setPage('books')}>Books</button>
        <button className={page==='loans'?'active':''} onClick={()=>setPage('loans')}>Loans</button>
      </nav>
      {page === 'dashboard' && <Dashboard />}
      {page === 'students' && <Students />}
      {page === 'books' && <Books />}
      {page === 'loans' && <Loans />}
    </div>
  );
}
