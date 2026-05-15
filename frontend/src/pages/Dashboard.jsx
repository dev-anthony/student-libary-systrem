import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { ErrorBanner, useError } from '../components/ErrorBanner.jsx';
import { LoadingOverlay } from '../components/LoadingOverlay.jsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const BUCKET = 'book-files';

const ACCEPTED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/epub+zip',
  'text/plain',
];

async function uploadToSupabase(file) {
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
  const filename = `${Date.now()}_${safeName}`;

  // Strip any trailing path (e.g. /rest/v1) — we only want https://xxx.supabase.co
  const base = SUPABASE_URL.replace(/\/(rest|storage)\/.*$/, '');

  const res = await fetch(
    `${base}/storage/v1/object/${BUCKET}/${filename}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    }
  );
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try { const b = await res.json(); msg = b.message || b.error || msg; } catch (_) {}
    throw new Error(msg);
  }
  return `${base}/storage/v1/object/public/${BUCKET}/${filename}`;
}

function fileLabel(url) {
  if (!url) return null;
  const ext = url.split('?')[0].split('.').pop().toUpperCase();
  const map = {
    PDF:  { label: 'PDF',  color: 'bg-red-50 text-red-600 ring-red-200' },
    DOC:  { label: 'DOC',  color: 'bg-blue-50 text-blue-600 ring-blue-200' },
    DOCX: { label: 'DOCX', color: 'bg-blue-50 text-blue-600 ring-blue-200' },
    EPUB: { label: 'EPUB', color: 'bg-purple-50 text-purple-600 ring-purple-200' },
    TXT:  { label: 'TXT',  color: 'bg-gray-50 text-gray-600 ring-gray-200' },
  };
  return map[ext] || { label: ext, color: 'bg-gray-50 text-gray-600 ring-gray-200' };
}

const NAV = [
  { key: 'overview',  label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'students',  label: 'Students',      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { key: 'books',     label: 'Books',         icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { key: 'loans',     label: 'Loans',         icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { key: 'available', label: 'Availability',  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

function Icon({ path, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function StatusBadge({ status, overdue }) {
  if (overdue)               return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">Overdue</span>;
  if (status === 'RETURNED') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">Returned</span>;
  return                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">Active</span>;
}

function AvailBadge({ pct }) {
  if (pct > 50) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">{pct}%</span>;
  if (pct > 20) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">{pct}%</span>;
  return               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">{pct}%</span>;
}

function Modal({ isOpen, title, onClose, children, onSubmit, submitText = 'Submit', isLoading = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {children}
          <button type="submit" disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {isLoading ? 'Processing…' : submitText}
          </button>
        </form>
      </div>
    </div>
  );
}

const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function buildChartData(loans) {
  const months = {};
  loans.forEach(l => {
    if (!l.issue_date) return;
    const key = new Date(l.issue_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    months[key] = months[key] || { issued: 0, returned: 0, overdue: 0 };
    months[key].issued++;
    if (l.status === 'RETURNED') months[key].returned++;
    if (l.status === 'OVERDUE' || (!l.return_date && new Date(l.due_date) < new Date())) months[key].overdue++;
  });
  return Object.entries(months).slice(-8).map(([name, v]) => ({ name, ...v }));
}

const INPUT_CLS  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';
const SELECT_CLS = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [books,    setBooks]    = useState([]);
  const [loans,    setLoans]    = useState([]);
  const [tab,      setTab]      = useState('overview');
  const [sidebar,  setSidebar]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  const [modals,        setModals]        = useState({ addStudent: false, addBook: false, issueLoan: false, returnLoan: false });
  const [actionLoading, setActionLoading] = useState(false);

  const [studentForm, setStudentForm] = useState({ student_id: '', name: '', email: '', department: '', level: '' });
  const [bookForm,    setBookForm]    = useState({ title: '', author: '', category: '', total_copies: 1 });
  const [loanForm,    setLoanForm]    = useState({ student_id: '', book_id: '', issue_date: '', due_date: '' });
  const [returnForm,  setReturnForm]  = useState({ loan_id: '' });

  // File upload state for Add Book modal
  const [bookFile,    setBookFile]    = useState(null);
  const [uploadPct,   setUploadPct]   = useState(null);
  const bookFileRef = useRef();

  const { error: loadError,   handleError: handleLoadError,   clear: clearLoadError   } = useError();
  const { error: actionError, handleError: handleActionError, clear: clearActionError } = useError();

  const loadData = async () => {
    try {
      const [st, bk, ln] = await Promise.all([api.listStudents(), api.listBooks(), api.listLoans()]);
      setStudents(st); setBooks(bk); setLoans(ln);
    } catch (e) { handleLoadError(e); }
  };

  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  const stats = {
    students: students.length,
    books:    books.reduce((a, b) => a + b.total_copies, 0),
    avail:    books.reduce((a, b) => a + b.available_copies, 0),
    loans:    loans.filter(l => l.status !== 'RETURNED').length,
  };

  const chartData   = buildChartData(loans);
  const activeLoans = loans.filter(l => l.status !== 'RETURNED');

  const booksWithMeta = useMemo(() =>
    books.map(book => {
      if (book.available_copies > 0) return { ...book, unavailable: false, dueBack: null };
      const next = loans
        .filter(l => l.book_id === book.id && l.status !== 'RETURNED')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
      return { ...book, unavailable: true, dueBack: next?.due_date ?? null };
    }),
    [books, loans]
  );
  const availableBooks   = booksWithMeta.filter(b => !b.unavailable);
  const unavailableBooks = booksWithMeta.filter(b =>  b.unavailable);

  const changeTab  = (key)  => { setTab(key); setSidebar(false); };
  const openModal  = (name) => { clearActionError(); setModals(m => ({ ...m, [name]: true  })); };
  const closeModal = (name) => {
    clearActionError();
    setModals(m => ({ ...m, [name]: false }));
    if (name === 'addBook') {
      setBookFile(null);
      setUploadPct(null);
      if (bookFileRef.current) bookFileRef.current.value = '';
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await api.createStudent(studentForm);
      setStudentForm({ student_id: '', name: '', email: '', department: '', level: '' });
      closeModal('addStudent'); await loadData();
    } catch (e) { handleActionError(e); }
    finally { setActionLoading(false); }
  };

  const handleAddBook = async (e) => {
    e.preventDefault(); setActionLoading(true);
    try {
      let file_url = null;
      if (bookFile) {
        setUploadPct(20);
        file_url = await uploadToSupabase(bookFile);
        setUploadPct(100);
      }
      await api.createBook({ ...bookForm, total_copies: Number(bookForm.total_copies) || 1, file_url });
      setBookForm({ title: '', author: '', category: '', total_copies: 1 });
      setBookFile(null);
      setUploadPct(null);
      if (bookFileRef.current) bookFileRef.current.value = '';
      closeModal('addBook'); await loadData();
    } catch (e) { handleActionError(e); }
    finally { setActionLoading(false); }
  };

  const handleBookFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      handleActionError(new Error('Unsupported file. Please upload PDF, DOC, DOCX, EPUB, or TXT.'));
      e.target.value = ''; return;
    }
    if (f.size > 50 * 1024 * 1024) {
      handleActionError(new Error('File too large. Max 50 MB.'));
      e.target.value = ''; return;
    }
    setBookFile(f);
  };

  const handleIssueLoan = async (e) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await api.issueLoan({
        student_id: Number(loanForm.student_id),
        book_id:    Number(loanForm.book_id),
        issue_date: loanForm.issue_date,
        due_date:   loanForm.due_date,
      });
      setLoanForm({ student_id: '', book_id: '', issue_date: '', due_date: '' });
      closeModal('issueLoan'); await loadData();
    } catch (e) { handleActionError(e); }
    finally { setActionLoading(false); }
  };

  const handleReturnLoan = async (e) => {
    e.preventDefault(); setActionLoading(true);
    try {
      const loan = loans.find(l => l.id === Number(returnForm.loan_id));
      if (loan) {
        await api.returnLoan(loan.id, new Date().toISOString().slice(0, 10));
        setReturnForm({ loan_id: '' });
        closeModal('returnLoan'); await loadData();
      }
    } catch (e) { handleActionError(e); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {loading && <LoadingOverlay />}
      {sidebar && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebar(false)} />}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100
        shadow-xl lg:shadow-none flex flex-col transition-transform duration-200
        ${sidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">LibraryMS</p>
            <p className="text-xs text-gray-400 mt-0.5">Management system</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(n => (
            <button key={n.key} onClick={() => changeTab(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${tab === n.key ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
            >
              <Icon path={n.icon} className="w-4 h-4 flex-shrink-0" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Powered by Supabase</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={() => setSidebar(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-gray-900">{NAV.find(n => n.key === tab)?.label}</h1>
          </div>
          {loading && <span className="text-xs text-gray-400 animate-pulse">Loading data…</span>}
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {loadError && <ErrorBanner error={loadError} onDismiss={clearLoadError} />}

          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students',  val: stats.students, color: 'text-blue-600',    bg: 'bg-blue-50',    path: NAV[1].icon },
                  { label: 'Total Books',      val: stats.books,    color: 'text-emerald-600', bg: 'bg-emerald-50', path: NAV[2].icon },
                  { label: 'Available Copies', val: stats.avail,    color: 'text-amber-600',   bg: 'bg-amber-50',   path: NAV[4].icon },
                  { label: 'Active Loans',     val: stats.loans,    color: 'text-rose-600',    bg: 'bg-rose-50',    path: NAV[3].icon },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl shadow-md border border-gray-100 p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon path={s.path} className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-gray-900 leading-none">{s.val}</p>
                      <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-800 mb-1">Loan activity over time</p>
                <p className="text-xs text-gray-400 mb-4">Monthly issued, returned, and overdue loans</p>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#374151', fontWeight: 600 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                      <Line type="monotone" dataKey="issued"   stroke="#3b82f6" strokeWidth={2} dot={false} name="Issued" />
                      <Line type="monotone" dataKey="returned" stroke="#10b981" strokeWidth={2} dot={false} name="Returned" />
                      <Line type="monotone" dataKey="overdue"  stroke="#f43f5e" strokeWidth={2} dot={false} name="Overdue" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">No loan data yet</div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Students</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{students.length}</span>
                      <button onClick={() => openModal('addStudent')} className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors">+ Add</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-50">
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Student ID</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Name</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 hidden sm:table-cell">Department</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {students.slice(0, 5).map(s => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 text-xs"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{s.student_id}</span></td>
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{s.name}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">{s.department || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {students.length > 5 && <div className="px-4 py-2.5 border-t border-gray-50"><button onClick={() => changeTab('students')} className="text-xs text-blue-600 hover:underline">View all {students.length} students</button></div>}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Books</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{books.length}</span>
                      <button onClick={() => openModal('addBook')} className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-medium rounded-lg transition-colors">+ Add</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-50">
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Title</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 hidden sm:table-cell">Category</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Available</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {books.slice(0, 5).map(b => {
                          const pct = b.total_copies > 0 ? Math.round((b.available_copies / b.total_copies) * 100) : 0;
                          return (
                            <tr key={b.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-700 max-w-[160px] truncate">{b.title}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">{b.category || '—'}</td>
                              <td className="px-4 py-2.5"><AvailBadge pct={pct} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {books.length > 5 && <div className="px-4 py-2.5 border-t border-gray-50"><button onClick={() => changeTab('books')} className="text-xs text-blue-600 hover:underline">View all {books.length} books</button></div>}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Active Loans</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{activeLoans.length}</span>
                      <button onClick={() => openModal('issueLoan')}  className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors">Issue</button>
                      <button onClick={() => openModal('returnLoan')} className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 text-xs font-medium rounded-lg transition-colors">Return</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-50">
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Student</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 hidden sm:table-cell">Book</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Status</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {activeLoans.slice(0, 5).map(l => {
                          const overdue = !l.return_date && new Date(l.due_date) < new Date();
                          return (
                            <tr key={l.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{l.students?.name || l.student_name || '—'}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell max-w-[140px] truncate">{l.books?.title || l.book_title || '—'}</td>
                              <td className="px-4 py-2.5"><StatusBadge status={l.status} overdue={overdue} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {activeLoans.length > 5 && <div className="px-4 py-2.5 border-t border-gray-50"><button onClick={() => changeTab('loans')} className="text-xs text-blue-600 hover:underline">View all {activeLoans.length} loans</button></div>}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Book Availability</p>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{books.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-50">
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Title</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5">Copies</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2.5 hidden sm:table-cell">Fill rate</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {books.slice(0, 5).map(b => {
                          const pct = b.total_copies > 0 ? Math.round((b.available_copies / b.total_copies) * 100) : 0;
                          return (
                            <tr key={b.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-700 max-w-[160px] truncate">{b.title}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{b.available_copies}/{b.total_copies}</td>
                              <td className="px-4 py-2.5 hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-400">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {books.length > 5 && <div className="px-4 py-2.5 border-t border-gray-50"><button onClick={() => changeTab('available')} className="text-xs text-blue-600 hover:underline">View all</button></div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'students' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">All Students</p>
                  <p className="text-xs text-gray-400 mt-0.5">{students.length} total records</p>
                </div>
                <button onClick={() => openModal('addStudent')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">+ Add Student</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    {['Student ID','Name','Email','Department','Level'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.length === 0
                      ? <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No students found</td></tr>
                      : students.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 text-xs"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{s.student_id}</span></td>
                            <td className="px-5 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                            <td className="px-5 py-3 text-xs text-gray-500">{s.email || '—'}</td>
                            <td className="px-5 py-3 text-xs text-gray-500">{s.department || '—'}</td>
                            <td className="px-5 py-3 text-xs text-gray-500">{s.level || '—'}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'books' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">All Books</p>
                  <p className="text-xs text-gray-400 mt-0.5">{books.length} total records</p>
                </div>
                <button onClick={() => openModal('addBook')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">+ Add Book</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    {['Title','Author','Category','Total','Available','File'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {books.length === 0
                      ? <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No books found</td></tr>
                      : books.map(b => {
                          const pct = b.total_copies > 0 ? Math.round((b.available_copies / b.total_copies) * 100) : 0;
                          const fl = fileLabel(b.file_url);
                          return (
                            <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 text-sm font-medium text-gray-800">{b.title}</td>
                              <td className="px-5 py-3 text-xs text-gray-500">{b.author}</td>
                              <td className="px-5 py-3 text-xs text-gray-500">{b.category || '—'}</td>
                              <td className="px-5 py-3 text-xs text-gray-500">{b.total_copies}</td>
                              <td className="px-5 py-3"><AvailBadge pct={pct} /></td>
                              <td className="px-5 py-3">
                                {fl ? (
                                  <a href={b.file_url} target="_blank" rel="noopener noreferrer"
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 hover:opacity-75 transition-opacity ${fl.color}`}>
                                    {fl.label}
                                  </a>
                                ) : <span className="text-xs text-gray-300">—</span>}
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'loans' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Active Loans</p>
                  <p className="text-xs text-gray-400 mt-0.5">{activeLoans.length} active records</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openModal('issueLoan')}  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">+ Issue Book</button>
                  <button onClick={() => openModal('returnLoan')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">Return Book</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    {['Student','Book','Issue date','Due date','Status'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeLoans.length === 0
                      ? <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No active loans</td></tr>
                      : activeLoans.map(l => {
                          const overdue = !l.return_date && new Date(l.due_date) < new Date();
                          return (
                            <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 text-sm font-medium text-gray-800">{l.students?.name || l.student_name || '—'}</td>
                              <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate">{l.books?.title || l.book_title || '—'}</td>
                              <td className="px-5 py-3 text-xs text-gray-500">{fmt(l.issue_date)}</td>
                              <td className="px-5 py-3 text-xs text-gray-500">{fmt(l.due_date)}</td>
                              <td className="px-5 py-3"><StatusBadge status={l.status} overdue={overdue} /></td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'available' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Book Availability</p>
                <p className="text-xs text-gray-400 mt-0.5">{books.length} books tracked</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    {['Title','Category','Available','Total','Fill rate'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {books.length === 0
                      ? <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No books found</td></tr>
                      : books.map(b => {
                          const pct = b.total_copies > 0 ? Math.round((b.available_copies / b.total_copies) * 100) : 0;
                          return (
                            <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 text-sm font-medium text-gray-800">{b.title}</td>
                              <td className="px-5 py-3 text-xs text-gray-500">{b.category || '—'}</td>
                              <td className="px-5 py-3 text-xs font-medium text-gray-700">{b.available_copies}</td>
                              <td className="px-5 py-3 text-xs text-gray-500">{b.total_copies}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-400 w-8">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}

      <Modal isOpen={modals.addStudent} title="Add New Student" onClose={() => closeModal('addStudent')} onSubmit={handleAddStudent} submitText="Add Student" isLoading={actionLoading}>
        {actionError && <ErrorBanner error={actionError} onDismiss={clearActionError} />}
        <input type="text"  required placeholder="Student ID"  autoComplete="off" spellCheck="false" value={studentForm.student_id} onChange={e => setStudentForm(f => ({ ...f, student_id: e.target.value }))} className={INPUT_CLS} />
        <input type="text"  required placeholder="Full Name"   autoComplete="off" spellCheck="false" value={studentForm.name}       onChange={e => setStudentForm(f => ({ ...f, name:       e.target.value }))} className={INPUT_CLS} />
        <input type="email" required placeholder="Email"       autoComplete="off" spellCheck="false" value={studentForm.email}      onChange={e => setStudentForm(f => ({ ...f, email:      e.target.value }))} className={INPUT_CLS} />
        <input type="text"          placeholder="Department"   autoComplete="off" spellCheck="false" value={studentForm.department} onChange={e => setStudentForm(f => ({ ...f, department: e.target.value }))} className={INPUT_CLS} />
        <input type="text"          placeholder="Level"        autoComplete="off" spellCheck="false" value={studentForm.level}      onChange={e => setStudentForm(f => ({ ...f, level:      e.target.value }))} className={INPUT_CLS} />
      </Modal>

      {/* Add Book — with file upload */}
      <Modal isOpen={modals.addBook} title="Add New Book" onClose={() => closeModal('addBook')} onSubmit={handleAddBook} submitText={actionLoading && uploadPct !== null ? 'Uploading…' : 'Add Book'} isLoading={actionLoading}>
        {actionError && <ErrorBanner error={actionError} onDismiss={clearActionError} />}
        <input type="text"   required placeholder="Title"        autoComplete="off" spellCheck="false" value={bookForm.title}        onChange={e => setBookForm(f => ({ ...f, title:        e.target.value }))} className={INPUT_CLS} />
        <input type="text"   required placeholder="Author"       autoComplete="off" spellCheck="false" value={bookForm.author}       onChange={e => setBookForm(f => ({ ...f, author:       e.target.value }))} className={INPUT_CLS} />
        <input type="text"           placeholder="Category"      autoComplete="off" spellCheck="false" value={bookForm.category}     onChange={e => setBookForm(f => ({ ...f, category:     e.target.value }))} className={INPUT_CLS} />
        <input type="number" required placeholder="Total Copies" autoComplete="off" min="1"            value={bookForm.total_copies} onChange={e => setBookForm(f => ({ ...f, total_copies: e.target.value }))} className={INPUT_CLS} />

        {/* File upload — plain visible input */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Attach book file <span className="font-normal text-gray-400">(optional — PDF, DOC, DOCX, EPUB, TXT · max 50 MB)</span></p>
          <input
            ref={bookFileRef}
            type="file"
            accept=".pdf,.doc,.docx,.epub,.txt"
            onChange={handleBookFile}
            className="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2
              file:mr-3 file:py-1 file:px-3 file:rounded file:border-0
              file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700
              hover:file:bg-emerald-100 cursor-pointer"
          />
          {bookFile && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-emerald-700 truncate">{bookFile.name}</span>
              <button type="button" onClick={() => { setBookFile(null); if (bookFileRef.current) bookFileRef.current.value = ''; }}
                className="text-xs text-gray-400 hover:text-red-500 ml-2 shrink-0">✕ Remove</button>
            </div>
          )}
          {uploadPct !== null && (
            <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={modals.issueLoan} title="Issue Book" onClose={() => closeModal('issueLoan')} onSubmit={handleIssueLoan} submitText="Issue Book" isLoading={actionLoading}>
        {actionError && <ErrorBanner error={actionError} onDismiss={clearActionError} />}
        <select required value={loanForm.student_id} onChange={e => setLoanForm(f => ({ ...f, student_id: e.target.value }))} className={SELECT_CLS}>
          <option value="">Select Student</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>)}
        </select>
        <select required value={loanForm.book_id} onChange={e => setLoanForm(f => ({ ...f, book_id: e.target.value }))} className={SELECT_CLS}>
          <option value="">Select Book</option>
          {availableBooks.length > 0 && (
            <optgroup label="Available">
              {availableBooks.map(b => <option key={b.id} value={b.id}>{b.title} ({b.available_copies} left)</option>)}
            </optgroup>
          )}
          {unavailableBooks.length > 0 && (
            <optgroup label="Currently on loan">
              {unavailableBooks.map(b => (
                <option key={b.id} value={b.id} disabled>
                  {b.title}{b.dueBack ? ` — due back ${fmt(b.dueBack)}` : ' — none available'}
                </option>
              ))}
            </optgroup>
          )}
          {books.length === 0 && <option disabled>No books in system yet</option>}
        </select>
        {books.length > 0 && availableBooks.length === 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            All books are currently on loan.
            {unavailableBooks.some(b => b.dueBack) && (
              <> Next return expected on <strong>{fmt(unavailableBooks.filter(b => b.dueBack).sort((a, b) => new Date(a.dueBack) - new Date(b.dueBack))[0]?.dueBack)}</strong>.</>
            )}
          </p>
        )}
        <input type="date" required value={loanForm.issue_date} onChange={e => setLoanForm(f => ({ ...f, issue_date: e.target.value }))} className={INPUT_CLS} />
        <input type="date" required value={loanForm.due_date}   onChange={e => setLoanForm(f => ({ ...f, due_date:   e.target.value }))} className={INPUT_CLS} />
      </Modal>

      <Modal isOpen={modals.returnLoan} title="Return Book" onClose={() => closeModal('returnLoan')} onSubmit={handleReturnLoan} submitText="Return Book" isLoading={actionLoading}>
        {actionError && <ErrorBanner error={actionError} onDismiss={clearActionError} />}
        <select required value={returnForm.loan_id} onChange={e => setReturnForm(f => ({ ...f, loan_id: e.target.value }))} className={SELECT_CLS}>
          <option value="">Select Active Loan</option>
          {activeLoans.map(l => (
            <option key={l.id} value={l.id}>
              {l.students?.name || l.student_name || '—'} — {l.books?.title || l.book_title || '—'}
            </option>
          ))}
        </select>
      </Modal>
    </div>
  );
}