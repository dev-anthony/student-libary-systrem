import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

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
  if (overdue) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">Overdue</span>;
  if (status === 'RETURNED') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">Returned</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">Active</span>;
}

function AvailBadge({ pct }) {
  if (pct > 50) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">{pct}%</span>;
  if (pct > 20) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">{pct}%</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">{pct}%</span>;
}

const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Build simple monthly trend data from loans array
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

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [books,    setBooks]    = useState([]);
  const [loans,    setLoans]    = useState([]);
  const [tab,      setTab]      = useState('overview');
  const [sidebar,  setSidebar]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([api.listStudents(), api.listBooks(), api.listLoans()])
      .then(([st, bk, ln]) => { setStudents(st); setBooks(bk); setLoans(ln); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    students: students.length,
    books:    books.reduce((a, b) => a + b.total_copies, 0),
    avail:    books.reduce((a, b) => a + b.available_copies, 0),
    loans:    loans.filter(l => l.status !== 'RETURNED').length,
  };

  const chartData = buildChartData(loans);
  const activeLoans = loans.filter(l => l.status !== 'RETURNED');

  const changeTab = (key) => { setTab(key); setSidebar(false); };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebar && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100
        shadow-xl lg:shadow-none flex flex-col transition-transform duration-200
        ${sidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
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

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => changeTab(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${tab === n.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
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

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setSidebar(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-gray-900">
              {NAV.find(n => n.key === tab)?.label}
            </h1>
          </div>
          {loading && (
            <span className="text-xs text-gray-400 animate-pulse">Loading data...</span>
          )}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students',   val: stats.students, color: 'text-blue-600',  bg: 'bg-blue-50',  path: NAV[1].icon },
                  { label: 'Total Books',       val: stats.books,    color: 'text-emerald-600', bg: 'bg-emerald-50', path: NAV[2].icon },
                  { label: 'Available Copies',  val: stats.avail,    color: 'text-amber-600', bg: 'bg-amber-50', path: NAV[4].icon },
                  { label: 'Active Loans',      val: stats.loans,    color: 'text-rose-600',  bg: 'bg-rose-50',  path: NAV[3].icon },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
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

              {/* Line chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-800 mb-1">Loan activity over time</p>
                <p className="text-xs text-gray-400 mb-4">Monthly issued, returned, and overdue loans</p>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#374151', fontWeight: 600 }}
                      />
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

              {/* 4-section data grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                {/* Students mini table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Students</p>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{students.length}</span>
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
                            <td className="px-4 py-2.5 text-xs">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{s.student_id}</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{s.name}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell">{s.department || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {students.length > 5 && (
                      <div className="px-4 py-2.5 border-t border-gray-50">
                        <button onClick={() => changeTab('students')} className="text-xs text-blue-600 hover:underline">
                          View all {students.length} students
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Books mini table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Books</p>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{books.length}</span>
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
                    {books.length > 5 && (
                      <div className="px-4 py-2.5 border-t border-gray-50">
                        <button onClick={() => changeTab('books')} className="text-xs text-blue-600 hover:underline">
                          View all {books.length} books
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active loans mini table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">Active Loans</p>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{activeLoans.length}</span>
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
                          const name = l.students?.name || l.student_name || '—';
                          const title = l.books?.title || l.book_title || '—';
                          return (
                            <tr key={l.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{name}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 hidden sm:table-cell max-w-[140px] truncate">{title}</td>
                              <td className="px-4 py-2.5"><StatusBadge status={l.status} overdue={overdue} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {activeLoans.length > 5 && (
                      <div className="px-4 py-2.5 border-t border-gray-50">
                        <button onClick={() => changeTab('loans')} className="text-xs text-blue-600 hover:underline">
                          View all {activeLoans.length} loans
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability mini table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                    {books.length > 5 && (
                      <div className="px-4 py-2.5 border-t border-gray-50">
                        <button onClick={() => changeTab('available')} className="text-xs text-blue-600 hover:underline">
                          View all
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ── STUDENTS ── */}
          {tab === 'students' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">All Students</p>
                  <p className="text-xs text-gray-400 mt-0.5">{students.length} total records</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Student ID</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Department</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Level</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No students found</td></tr>
                    ) : students.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-xs">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{s.student_id}</span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{s.email || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{s.department || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{s.level || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── BOOKS ── */}
          {tab === 'books' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">All Books</p>
                <p className="text-xs text-gray-400 mt-0.5">{books.length} total records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Author</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Total</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Available</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {books.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No books found</td></tr>
                    ) : books.map(b => {
                      const pct = b.total_copies > 0 ? Math.round((b.available_copies / b.total_copies) * 100) : 0;
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-gray-800">{b.title}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{b.author}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{b.category || '—'}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{b.total_copies}</td>
                          <td className="px-5 py-3"><AvailBadge pct={pct} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LOANS ── */}
          {tab === 'loans' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Active Loans</p>
                <p className="text-xs text-gray-400 mt-0.5">{activeLoans.length} active records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Student</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Book</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Issue date</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Due date</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {activeLoans.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No active loans</td></tr>
                    ) : activeLoans.map(l => {
                      const overdue = !l.return_date && new Date(l.due_date) < new Date();
                      const name = l.students?.name || l.student_name || '—';
                      const title = l.books?.title || l.book_title || '—';
                      return (
                        <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-gray-800">{name}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate">{title}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{fmt(l.issue_date)}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{fmt(l.due_date)}</td>
                          <td className="px-5 py-3"><StatusBadge status={l.status} overdue={overdue} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── AVAILABILITY ── */}
          {tab === 'available' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Book Availability</p>
                <p className="text-xs text-gray-400 mt-0.5">{books.length} books tracked</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/70 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Available</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Total</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Fill rate</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {books.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No books found</td></tr>
                    ) : books.map(b => {
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
                                <div
                                  className={`h-full rounded-full ${pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}