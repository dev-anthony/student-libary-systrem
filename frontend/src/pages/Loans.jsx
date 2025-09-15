import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ student_id:'', book_id:'', issue_date:'', due_date:'' });

  const loadLoans = () => api.listLoans().then(setLoans);

  useEffect(() => {
    loadLoans();
    api.listStudents().then(setStudents);
    api.listBooks().then(setBooks);
  }, []);

  const issue = async (e) => {
    e.preventDefault();
    await api.issueLoan({
      student_id: Number(form.student_id),
      book_id: Number(form.book_id),
      issue_date: form.issue_date,
      due_date: form.due_date
    });
    setForm({ student_id:'', book_id:'', issue_date:'', due_date:'' });
    loadLoans();
  };

  const doReturn = async (loan) => {
    const today = new Date().toISOString().slice(0,10);
    await api.returnLoan(loan.id, today);
    loadLoans();
  };

  const statusBadge = (row) => {
    if (row.status === 'RETURNED') return <span className="badge ok">RETURNED</span>;
    if (row.overdue) return <span className="badge danger">OVERDUE</span>;
    return <span className="badge warn">ISSUED</span>;
  };

  return (
    <div className="card">
      <h2>Loans</h2>
      <form className="form" onSubmit={issue}>
        <select value={form.student_id} onChange={e=>setForm(f=>({...f, student_id:e.target.value}))}>
          <option value="">Select Student</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.student_id} - {s.name}</option>)}
        </select>
        <select value={form.book_id} onChange={e=>setForm(f=>({...f, book_id:e.target.value}))}>
          <option value="">Select Book</option>
          {books.map(b => <option key={b.id} value={b.id}>{b.title} ({b.available_copies}/{b.total_copies})</option>)}
        </select>
        <input type="date" value={form.issue_date} onChange={e=>setForm(f=>({...f, issue_date:e.target.value}))}/>
        <input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f, due_date:e.target.value}))}/>
        <button className="primary" type="submit">Issue Book</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>Student</th><th>Book</th><th>Issued</th><th>Due</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map(l => (
            <tr key={l.id}>
              <td>{l.id}</td>
              <td>{l.student_name}</td>
              <td>{l.book_title}</td>
              <td>{l.issue_date}</td>
              <td>{l.due_date}</td>
              <td>{statusBadge(l)}</td>
              <td>
                {l.status !== 'RETURNED' ? (
                  <button onClick={()=>doReturn(l)}>Mark Return</button>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
