// const base = '/api'; // thanks to vite proxy, this points to http://localhost:4000/api

// export const api = {
//   // Students
//   listStudents: () => fetch(`${base}/students`).then(r => r.json()),
//   createStudent: (payload) =>
//     fetch(`${base}/students`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
//   updateStudent: (id, payload) =>
//     fetch(`${base}/students/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
//   deleteStudent: (id) =>
//     fetch(`${base}/students/${id}`, { method:'DELETE' }).then(r => r.json()),

//   // Books
//   listBooks: () => fetch(`${base}/books`).then(r => r.json()),
//   createBook: (payload) =>
//     fetch(`${base}/books`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
//   updateBook: (id, payload) =>
//     fetch(`${base}/books/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
//   deleteBook: (id) =>
//     fetch(`${base}/books/${id}`, { method:'DELETE' }).then(r => r.json()),

//   // Loans
//   listLoans: () => fetch(`${base}/loans`).then(r => r.json()),
//   issueLoan: (payload) =>
//     fetch(`${base}/loans/issue`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
//   returnLoan: (loanId, return_date) =>
//     fetch(`${base}/loans/return/${loanId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ return_date })}).then(r => r.json()),
// };
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;
const H = {
  'Content-Type': 'application/json',
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Prefer': 'return=representation'
};

export const api = {
  // Students
  listStudents: () =>
    fetch(`${URL}/students?order=id.desc`, { headers: H }).then(r => r.json()),
  createStudent: (data) =>
    fetch(`${URL}/students`, { method: 'POST', headers: H, body: JSON.stringify(data) }).then(r => r.json()),
  updateStudent: (id, data) =>
    fetch(`${URL}/students?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(data) }).then(r => r.json()),
  deleteStudent: (id) =>
    fetch(`${URL}/students?id=eq.${id}`, { method: 'DELETE', headers: H }).then(r => r.ok),

  // Books
  listBooks: () =>
    fetch(`${URL}/books?order=id.desc`, { headers: H }).then(r => r.json()),
  createBook: ({ title, author, category, total_copies }) =>
    fetch(`${URL}/books`, { method: 'POST', headers: H, body: JSON.stringify({ title, author, category, total_copies, available_copies: total_copies }) }).then(r => r.json()),
  updateBook: (id, data) =>
    fetch(`${URL}/books?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(data) }).then(r => r.json()),
  deleteBook: (id) =>
    fetch(`${URL}/books?id=eq.${id}`, { method: 'DELETE', headers: H }).then(r => r.ok),

  // Loans
  listLoans: () =>
    fetch(`${URL}/loans?select=*,students(student_id,name),books(title)&order=id.desc`, { headers: H })
      .then(r => r.json())
      .then(rows => rows.map(r => ({
        ...r,
        student_no: r.students?.student_id,
        student_name: r.students?.name,
        book_title: r.books?.title,
        overdue: !r.return_date && new Date(r.due_date) < new Date()
      }))),

  issueLoan: async ({ student_id, book_id, issue_date, due_date }) => {
    // decrement available_copies
    const book = await fetch(`${URL}/books?id=eq.${book_id}`, { headers: H }).then(r => r.json()).then(r => r[0]);
    if (!book || book.available_copies < 1) throw new Error('No available copies');
    await fetch(`${URL}/books?id=eq.${book_id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ available_copies: book.available_copies - 1 }) });
    return fetch(`${URL}/loans`, { method: 'POST', headers: H, body: JSON.stringify({ student_id, book_id, issue_date, due_date, status: 'ISSUED' }) }).then(r => r.json());
  },

  returnLoan: async (loanId, return_date) => {
    const loan = await fetch(`${URL}/loans?id=eq.${loanId}`, { headers: H }).then(r => r.json()).then(r => r[0]);
    if (!loan) throw new Error('Loan not found');
    const status = new Date(return_date) > new Date(loan.due_date) ? 'OVERDUE' : 'RETURNED';
    await fetch(`${URL}/books?id=eq.${loan.book_id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ available_copies: loan.available_copies + 1 }) });
    return fetch(`${URL}/loans?id=eq.${loanId}`, { method: 'PATCH', headers: H, body: JSON.stringify({ return_date, status }) }).then(r => r.json());
  }
};
