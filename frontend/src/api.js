const base = '/api'; // thanks to vite proxy, this points to http://localhost:4000/api

export const api = {
  // Students
  listStudents: () => fetch(`${base}/students`).then(r => r.json()),
  createStudent: (payload) =>
    fetch(`${base}/students`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  updateStudent: (id, payload) =>
    fetch(`${base}/students/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  deleteStudent: (id) =>
    fetch(`${base}/students/${id}`, { method:'DELETE' }).then(r => r.json()),

  // Books
  listBooks: () => fetch(`${base}/books`).then(r => r.json()),
  createBook: (payload) =>
    fetch(`${base}/books`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  updateBook: (id, payload) =>
    fetch(`${base}/books/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  deleteBook: (id) =>
    fetch(`${base}/books/${id}`, { method:'DELETE' }).then(r => r.json()),

  // Loans
  listLoans: () => fetch(`${base}/loans`).then(r => r.json()),
  issueLoan: (payload) =>
    fetch(`${base}/loans/issue`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json()),
  returnLoan: (loanId, return_date) =>
    fetch(`${base}/loans/return/${loanId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ return_date })}).then(r => r.json()),
};
