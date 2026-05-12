import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const EMPTY = { student_id: '', book_id: '', issue_date: '', due_date: '' };

export default function Loans() {
  const [loans,    setLoans]    = useState([]);
  const [students, setStudents] = useState([]);
  const [books,    setBooks]    = useState([]);
  const [form,     setForm]     = useState(EMPTY);
  const [loading,  setLoading]  = useState(false);

  const loadLoans = () => api.listLoans().then(setLoans);

  useEffect(() => {
    loadLoans();
    api.listStudents().then(setStudents);
    api.listBooks().then(setBooks);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const issue = async (e) => {
    e.preventDefault();
    setLoading(true);
    await api.issueLoan({
      student_id: Number(form.student_id),
      book_id:    Number(form.book_id),
      issue_date: form.issue_date,
      due_date:   form.due_date,
    });
    setForm(EMPTY);
    await loadLoans();
    setLoading(false);
  };

  const doReturn = async (loan) => {
    const today = new Date().toISOString().slice(0, 10);
    await api.returnLoan(loan.id, today);
    loadLoans();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const StatusBadge = ({ row }) => {
    if (row.status === 'RETURNED')
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">Returned</span>;
    if (row.overdue || row.status === 'OVERDUE')
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">Overdue</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">Issued</span>;
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* Issue form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Issue Book</p>
        <form onSubmit={issue} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            required value={form.student_id} onChange={e => set('student_id', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
          >
            <option value="">Select Student</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>
            ))}
          </select>

          <select
            required value={form.book_id} onChange={e => set('book_id', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
          >
            <option value="">Select Book</option>
            {books.filter(b => b.available_copies > 0).map(b => (
              <option key={b.id} value={b.id}>{b.title} ({b.available_copies} left)</option>
            ))}
          </select>

          <input
            required type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            required type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <button
            type="submit" disabled={loading}
            className="col-span-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {loading ? 'Issuing...' : 'Issue Book'}
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">All Loans</p>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{loans.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {['ID', 'Student', 'Book', 'Issued', 'Due', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loans.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400">No loans yet</td></tr>
              ) : loans.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-400">#{l.id}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">
                    {l.students?.name || l.student_name || '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                    {l.books?.title || l.book_title || '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmt(l.issue_date)}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmt(l.due_date)}</td>
                  <td className="px-5 py-3"><StatusBadge row={l} /></td>
                  <td className="px-5 py-3">
                    {l.status !== 'RETURNED' ? (
                      <button
                        onClick={() => doReturn(l)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors font-medium"
                      >
                        Mark Return
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}