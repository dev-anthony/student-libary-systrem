import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState({ students: 0, books: 0, available: 0, loans: 0 });

  useEffect(() => {
    Promise.all([api.listStudents(), api.listBooks(), api.listLoans()])
      .then(([st, bk, ln]) => {
        setStats({
          students: st.length,
          books: bk.reduce((a,b)=>a+b.total_copies, 0),
          available: bk.reduce((a,b)=>a+b.available_copies, 0),
          loans: ln.filter(x => x.status !== 'RETURNED').length
        });
      });
  }, []);

  return (
    <div className="card">
      <h2>Overview</h2>
      <div className="grid">
        <div className="card"><h3>Students</h3><p>{stats.students}</p></div>
        <div className="card"><h3>Total Books</h3><p>{stats.books}</p></div>
        <div className="card"><h3>Available Copies</h3><p>{stats.available}</p></div>
        <div className="card"><h3>Active Loans</h3><p>{stats.loans}</p></div>
      </div>
    </div>
  );
}
