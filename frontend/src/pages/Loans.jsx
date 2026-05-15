import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { ErrorBanner, useError } from '../components/ErrorBanner.jsx';

// ─── Helpers (outside component so identity is stable) ────────────────────────

const EMPTY = { student_id: '', book_id: '', issue_date: '', due_date: '' };

const fmt = d =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ row }) {
  if (row.status === 'RETURNED')
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">Returned</span>;
  if (row.overdue || row.status === 'OVERDUE')
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">Overdue</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">Issued</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Loans() {
  const [loans,    setLoans]    = useState([]);
  const [students, setStudents] = useState([]);
  const [books,    setBooks]    = useState([]);
  const [form,     setForm]     = useState(EMPTY);
  const [loading,  setLoading]  = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Per-action error (form submissions, return button)
  const { error: actionError, handleError: handleActionError, clear: clearActionError } = useError();
  // Data-load error (initial fetch / network down)
  const { error: loadError, handleError: handleLoadError, clear: clearLoadError } = useError();

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadLoans = async () => {
    try {
      const data = await api.listLoans();
      setLoans(data);
    } catch (e) {
      handleLoadError(e);
    }
  };

  const loadAll = async () => {
    setDataLoading(true);
    try {
      const [st, bk, ln] = await Promise.all([
        api.listStudents(),
        api.listBooks(),
        api.listLoans(),
      ]);
      setStudents(st);
      setBooks(bk);
      setLoans(ln);
    } catch (e) {
      handleLoadError(e);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Derived: books with availability meta ───────────────────────────────────
  // For books with 0 copies available, find the earliest due date from active loans
  // so we can tell users when to expect the book back.
  const booksWithMeta = useMemo(() =>
    books.map(book => {
      if (book.available_copies > 0) {
        return { ...book, unavailable: false, dueBack: null };
      }
      const activeForBook = loans
        .filter(l => l.book_id === book.id && l.status !== 'RETURNED')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      return {
        ...book,
        unavailable: true,
        dueBack: activeForBook[0]?.due_date ?? null,
      };
    }),
    [books, loans]
  );

  const availableBooks  = booksWithMeta.filter(b => !b.unavailable);
  const unavailableBooks = booksWithMeta.filter(b =>  b.unavailable);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const issue = async (e) => {
    e.preventDefault();
    clearActionError();
    setLoading(true);
    try {
      await api.issueLoan({
        student_id: Number(form.student_id),
        book_id:    Number(form.book_id),
        issue_date: form.issue_date,
        due_date:   form.due_date,
      });
      setForm(EMPTY);
      await loadAll(); // refresh books (available_copies changed) + loans
    } catch (e) {
      handleActionError(e);
    } finally {
      setLoading(false);
    }
  };

  const doReturn = async (loan) => {
    clearActionError();
    const today = new Date().toISOString().slice(0, 10);
    try {
      await api.returnLoan(loan.id, today);
      await loadAll(); // refresh both loans + books
    } catch (e) {
      handleActionError(e);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-full">

      {/* ── Network / load errors ─────────────────────────────────────────── */}
      {loadError && (
        <ErrorBanner error={loadError} onDismiss={clearLoadError} />
      )}

      {/* ── Issue Book form ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-800 mb-1">Issue Book</p>
        <p className="text-xs text-gray-400 mb-4">
          {availableBooks.length === 0 && !dataLoading
            ? 'No books are available to loan right now.'
            : `${availableBooks.length} book${availableBooks.length !== 1 ? 's' : ''} available to loan`}
        </p>

        {/* Action-level error (issue/return failures) */}
        {actionError && (
          <div className="mb-4">
            <ErrorBanner error={actionError} onDismiss={clearActionError} />
          </div>
        )}

        <form onSubmit={issue} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

          {/* Student selector */}
          <select
            required
            value={form.student_id}
            onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
          >
            <option value="">Select Student</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>
            ))}
          </select>

          {/* Book selector — shows ALL books; unavailable ones are disabled with return date hint */}
          <select
            required
            value={form.book_id}
            onChange={e => setForm(f => ({ ...f, book_id: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
          >
            <option value="">Select Book</option>

            {/* Available books */}
            {availableBooks.length > 0 && (
              <optgroup label="Available">
                {availableBooks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.available_copies} left)
                  </option>
                ))}
              </optgroup>
            )}

            {/* Unavailable books — disabled, show expected return date */}
            {unavailableBooks.length > 0 && (
              <optgroup label="Currently on loan">
                {unavailableBooks.map(b => (
                  <option key={b.id} value={b.id} disabled>
                    {b.title}
                    {b.dueBack
                      ? ` — due back ${fmt(b.dueBack)}`
                      : ' — none available'}
                  </option>
                ))}
              </optgroup>
            )}

            {books.length === 0 && (
              <option disabled>No books in system yet</option>
            )}
          </select>

          {/* Issue date */}
          <input
            required
            type="date"
            value={form.issue_date}
            onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />

          {/* Due date */}
          <input
            required
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />

          <button
            type="submit"
            disabled={loading || availableBooks.length === 0}
            className="col-span-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {loading ? 'Issuing…' : 'Issue Book'}
          </button>
        </form>

        {/* Inline hint when all books are on loan */}
        {!dataLoading && books.length > 0 && availableBooks.length === 0 && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            All books are currently on loan.
            {unavailableBooks.some(b => b.dueBack) && (
              <> The next return is expected on <strong>
                {fmt(
                  unavailableBooks
                    .filter(b => b.dueBack)
                    .sort((a, b) => new Date(a.dueBack) - new Date(b.dueBack))[0]?.dueBack
                )}
              </strong>.</>
            )}
          </p>
        )}
      </div>

      {/* ── Loans table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">All Loans</p>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {loans.length} records
          </span>
        </div>

        {dataLoading ? (
          <div className="py-14 text-center text-sm text-gray-400 animate-pulse">Loading loans…</div>
        ) : (
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
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-sm text-gray-400">No loans yet</td>
                  </tr>
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
        )}
      </div>
    </div>
  );
}