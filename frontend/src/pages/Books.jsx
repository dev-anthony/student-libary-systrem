import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { ErrorBanner, useError } from '../components/ErrorBanner.jsx';
import { LoadingOverlay } from '../components/LoadingOverlay.jsx';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const BUCKET = 'book-files';

const EMPTY = { title: '', author: '', category: '', total_copies: 1 };

const ACCEPTED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/epub+zip',
  'text/plain',
];

const FILE_ICONS = {
  'application/pdf': { label: 'PDF', color: 'bg-red-50 text-red-600 ring-red-200' },
  'application/msword': { label: 'DOC', color: 'bg-blue-50 text-blue-600 ring-blue-200' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', color: 'bg-blue-50 text-blue-600 ring-blue-200' },
  'application/epub+zip': { label: 'EPUB', color: 'bg-purple-50 text-purple-600 ring-purple-200' },
  'text/plain': { label: 'TXT', color: 'bg-gray-50 text-gray-600 ring-gray-200' },
};

function fileLabel(url) {
  if (!url) return null;
  const ext = url.split('.').pop().toUpperCase();
  const map = { PDF: FILE_ICONS['application/pdf'], DOC: FILE_ICONS['application/msword'], DOCX: FILE_ICONS['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], EPUB: FILE_ICONS['application/epub+zip'], TXT: FILE_ICONS['text/plain'] };
  return map[ext] || { label: ext, color: 'bg-gray-50 text-gray-600 ring-gray-200' };
}

async function uploadToSupabase(file) {
  // Unique filename to avoid collisions
  const ext = file.name.split('.').pop();
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
  const filename = `${Date.now()}_${safeName}`;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: file,
    }
  );

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try { const b = await res.json(); msg = b.message || b.error || msg; } catch (_) {}
    throw new Error(msg);
  }

  // Return the public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

export default function Books() {
  const [list, setList]           = useState([]);
  const [form, setForm]           = useState(EMPTY);
  const [file, setFile]           = useState(null);  // File object
  const [loading, setLoading]     = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [uploadPct, setUploadPct] = useState(null);  // null | 0-100
  const fileRef = useRef();

  const { error, handleError, clear } = useError();

  const load = async () => {
    try {
      const data = await api.listBooks();
      setList(data);
    } catch (e) {
      handleError(e);
    }
  };

  useEffect(() => {
    load().finally(() => setDataLoading(false));
  }, []);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      handleError(new Error('Unsupported file type. Please upload a PDF, DOC, DOCX, EPUB, or TXT file.'));
      e.target.value = '';
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      handleError(new Error('File is too large. Maximum size is 50 MB.'));
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clear();
    try {
      let file_url = null;
      if (file) {
        setUploadPct(10); // Show upload started
        file_url = await uploadToSupabase(file);
        setUploadPct(100);
      }

      await api.createBook({
        ...form,
        total_copies: Number(form.total_copies) || 1,
        file_url,
      });

      setForm(EMPTY);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setUploadPct(null);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this book?')) return;
    try {
      await api.deleteBook(id);
      await load();
    } catch (e) {
      handleError(e);
    }
  };

  return (
    <div className="space-y-5 max-w-full">
      {dataLoading && <LoadingOverlay />}
      {error && <ErrorBanner error={error} onDismiss={clear} />}

      {/* Add form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Add Book</p>
        <form onSubmit={submit} className="space-y-3">
          {/* Row 1: metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <input
              type="text" required placeholder="Title" autoComplete="off" spellCheck="false"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <input
              type="text" required placeholder="Author" autoComplete="off" spellCheck="false"
              value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <input
              type="text" placeholder="Category" autoComplete="off" spellCheck="false"
              value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <input
              required type="number" min="1" placeholder="Total Copies" autoComplete="off"
              value={form.total_copies} onChange={e => setForm(f => ({ ...f, total_copies: e.target.value }))}
              className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <button
              type="submit" disabled={loading}
              className="col-span-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {loading ? (uploadPct !== null ? `Uploading…` : 'Adding...') : 'Add Book'}
            </button>
          </div>

          {/* Row 2: file upload */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Attach file (optional) — PDF, DOC, DOCX, EPUB, TXT · max 50 MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.epub,.txt"
                onChange={handleFile}
                className="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2
                  file:mr-3 file:py-1 file:px-3 file:rounded file:border-0
                  file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
            {file && (
              <button
                type="button"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-5"
              >
                ✕ Remove
              </button>
            )}
          </div>

          {/* Upload progress */}
          {uploadPct !== null && (
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">All Books</p>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{list.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {['Title', 'Author', 'Category', 'Total', 'Available', 'File', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400">No books yet</td></tr>
              ) : list.map(b => {
                const pct = b.total_copies > 0 ? Math.round((b.available_copies / b.total_copies) * 100) : 0;
                const badgeClass = pct > 50
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                  : pct > 20
                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200';
                const fl = fileLabel(b.file_url);
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
                      {fl ? (
                        <a
                          href={b.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 transition-opacity hover:opacity-75 ${fl.color}`}
                        >
                          {fl.label}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
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