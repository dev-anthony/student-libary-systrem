import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// const EMPTY = { student_id: '', name: '', email: '', department: '', level: '' };

export default function Students() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ student_id: '', name: '', email: '', department: '', level: '' });
  const [loading, setLoading] = useState(false);

  const load = () => api.listStudents().then(setList);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await api.createStudent(form);
    setForm(EMPTY);
    await load();
    setLoading(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this student?')) return;
    await api.deleteStudent(id);
    load();
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* Add form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Add Student</p>
        <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            type="text" required placeholder="Student No." 
            value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            type="text" required placeholder="Name" autoComplete="off" spellCheck="false"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            required type="email" placeholder="Email" autoComplete="off" spellCheck="false"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            type="text" placeholder="Department" autoComplete="off" spellCheck="false"
            value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            type="text" placeholder="Level" autoComplete="off" spellCheck="false"
            value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <button
            type="submit" disabled={loading}
            className="col-span-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {loading ? 'Adding...' : 'Add Student'}
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">All Students</p>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{list.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {['Student No.', 'Name', 'Email', 'Department', 'Level', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No students yet</td></tr>
              ) : list.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{s.student_id}</span>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{s.email || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{s.department || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{s.level || '—'}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      Delete
                    </button>
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