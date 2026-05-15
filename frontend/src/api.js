const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;
const H = {
  'Content-Type': 'application/json',
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Prefer': 'return=representation'
};

// ─── Response helper ──────────────────────────────────────────────────────────
// PostgREST returns JSON error objects on 4xx/5xx; surface them as real Errors.
async function checkOk(res) {
  if (res.ok) return res.json();
  let msg = `Server error (${res.status})`;
  try {
    const body = await res.json();
    msg = body.message || body.hint || body.details || msg;
  } catch (_) { /* ignore parse errors */ }
  throw new Error(msg);
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const api = {

  // ── Students ────────────────────────────────────────────────────────────────
  listStudents: () =>
    fetch(`${URL}/students?order=id.desc`, { headers: H }).then(checkOk),

  createStudent: (data) =>
    fetch(`${URL}/students`, {
      method: 'POST', headers: H, body: JSON.stringify(data)
    }).then(checkOk),

  updateStudent: (id, data) =>
    fetch(`${URL}/students?id=eq.${id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify(data)
    }).then(checkOk),

  deleteStudent: (id) =>
    fetch(`${URL}/students?id=eq.${id}`, {
      method: 'DELETE', headers: H
    }).then(r => { if (!r.ok) throw new Error(`Delete failed (${r.status})`); return true; }),

  // ── Books ────────────────────────────────────────────────────────────────────
  listBooks: () =>
    fetch(`${URL}/books?order=id.desc`, { headers: H }).then(checkOk),

  createBook: ({ title, author, category, total_copies }) =>
    fetch(`${URL}/books`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ title, author, category, total_copies, available_copies: total_copies })
    }).then(checkOk),

  updateBook: (id, data) =>
    fetch(`${URL}/books?id=eq.${id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify(data)
    }).then(checkOk),

  deleteBook: (id) =>
    fetch(`${URL}/books?id=eq.${id}`, {
      method: 'DELETE', headers: H
    }).then(r => { if (!r.ok) throw new Error(`Delete failed (${r.status})`); return true; }),

  // ── Loans ────────────────────────────────────────────────────────────────────
  listLoans: () =>
    fetch(
      `${URL}/loans?select=*,students(student_id,name),books(title)&order=id.desc`,
      { headers: H }
    )
      .then(checkOk)
      .then(rows => rows.map(r => ({
        ...r,
        student_no:   r.students?.student_id,
        student_name: r.students?.name,
        book_title:   r.books?.title,
        overdue:      !r.return_date && new Date(r.due_date) < new Date(),
      }))),

  issueLoan: async ({ student_id, book_id, issue_date, due_date }) => {
    // 1. Verify availability (server-side check, not just UI)
    const book = await fetch(`${URL}/books?id=eq.${book_id}`, { headers: H })
      .then(checkOk)
      .then(r => r[0]);

    if (!book) throw new Error('Book not found.');
    if (book.available_copies < 1) {
      throw new Error(
        `"${book.title}" has no available copies right now. ` +
        `Please check the loans list for the expected return date.`
      );
    }

    // 2. Decrement available_copies
    await fetch(`${URL}/books?id=eq.${book_id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ available_copies: book.available_copies - 1 })
    }).then(checkOk);

    // 3. Create loan record
    return fetch(`${URL}/loans`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ student_id, book_id, issue_date, due_date, status: 'ISSUED' })
    }).then(checkOk);
  },

  returnLoan: async (loanId, return_date) => {
    // 1. Fetch loan
    const loan = await fetch(`${URL}/loans?id=eq.${loanId}`, { headers: H })
      .then(checkOk)
      .then(r => r[0]);
    if (!loan) throw new Error('Loan not found.');

    // 2. Fetch current book state
    const book = await fetch(`${URL}/books?id=eq.${loan.book_id}`, { headers: H })
      .then(checkOk)
      .then(r => r[0]);
    if (!book) throw new Error('Book record not found.');

    // 3. Determine status (overdue if returned after due date)
    const status = new Date(return_date) > new Date(loan.due_date) ? 'OVERDUE' : 'RETURNED';

    // 4. Increment available_copies
    await fetch(`${URL}/books?id=eq.${loan.book_id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ available_copies: book.available_copies + 1 })
    }).then(checkOk);

    // 5. Mark loan returned
    return fetch(`${URL}/loans?id=eq.${loanId}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ return_date, status })
    }).then(checkOk);
  },
};