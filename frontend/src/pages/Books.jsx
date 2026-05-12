import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const EMPTY = { title: '', author: '', category: '', total_copies: 1 };

export default function Books() {
  const [list, setList]   = useState([]);
  const [form, setForm]   = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = () => api.listBooks().then(setList);
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await api.createBook({ ...form, total_copies: Number(form.total_copies) || 1 });
    setForm(EMPTY);
    await load();
    setLoading(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this book?')) return;
    await api.deleteBook(id);
    load();
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* Add form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Add Book</p>
        <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <input
            required placeholder="Title"
            value={form.title} onChange={e => set('title', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            required placeholder="Author"
            value={form.author} onChange={e => set('author', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            placeholder="Category"
            value={form.category} onChange={e => set('category', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <input
            required type="number" min="1" placeholder="Total Copies"
            value={form.total_copies} onChange={e => set('total_copies', e.target.value)}
            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <button
            type="submit" disabled={loading}
            className="col-span-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {loading ? 'Adding...' : 'Add Book'}
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">All Books</p>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{list.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {['Title', 'Author', 'Category', 'Total', 'Available', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No books yet</td></tr>
              ) : list.map(b => {
                const pct = b.total_copies > 0 ? Math.round((b.available_copies / b.total_copies) * 100) : 0;
                const badgeClass = pct > 50
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                  : pct > 20
                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200';
                return (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{b.title}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{b.author}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{b.category || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{b.total_copies}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
                        {b.available_copies} available
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => remove(b.id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}