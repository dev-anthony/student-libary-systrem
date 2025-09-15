import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

/** GET /api/loans */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, s.student_id AS student_no, s.name AS student_name,
             b.title AS book_title
      FROM loans l
      JOIN students s ON s.id = l.student_id
      JOIN books b ON b.id = l.book_id
      ORDER BY l.id DESC
    `);
    const today = new Date();
    const mapped = rows.map(r => {
      const overdue = !r.return_date && new Date(r.due_date) < today;
      return { ...r, overdue };
    });
    res.json(mapped);
  } catch (e) { next(e); }
});

/** POST /api/loans/issue */
router.post('/issue', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { student_id, book_id, issue_date, due_date } = req.body;
    if (!student_id || !book_id || !issue_date || !due_date) {
      return res.status(400).json({ message: 'student_id, book_id, issue_date, due_date are required' });
    }
    await conn.beginTransaction();

    const [books] = await conn.query('SELECT * FROM books WHERE id=? FOR UPDATE', [book_id]);
    if (!books.length) throw new Error('Book not found');
    const book = books[0];
    if (book.available_copies < 1) {
      await conn.rollback();
      return res.status(400).json({ message: 'No available copies for this book' });
    }

    const [students] = await conn.query('SELECT id FROM students WHERE id=?', [student_id]);
    if (!students.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Student not found' });
    }

    const [ins] = await conn.query(
      `INSERT INTO loans (student_id, book_id, issue_date, due_date, status)
       VALUES (?,?,?,?, 'ISSUED')`,
      [student_id, book_id, issue_date, due_date]
    );

    await conn.query(
      `UPDATE books SET available_copies = available_copies - 1 WHERE id=?`,
      [book_id]
    );

    await conn.commit();
    const [loanRow] = await pool.query('SELECT * FROM loans WHERE id=?', [ins.insertId]);
    res.status(201).json(loanRow[0]);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    next(e);
  } finally {
    conn.release();
  }
});

/** POST /api/loans/return/:loanId */
router.post('/return/:loanId', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { return_date } = req.body;
    await conn.beginTransaction();

    const [loans] = await conn.query('SELECT * FROM loans WHERE id=? FOR UPDATE', [req.params.loanId]);
    if (!loans.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Loan not found' });
    }
    const loan = loans[0];
    if (loan.status === 'RETURNED') {
      await conn.rollback();
      return res.status(400).json({ message: 'Loan already returned' });
    }

    const today = new Date(return_date);
    const due = new Date(loan.due_date);
    const status = today > due ? 'OVERDUE' : 'RETURNED';

    await conn.query(`UPDATE loans SET return_date=?, status=? WHERE id=?`,
      [return_date, status, loan.id]
    );

    await conn.query(
      `UPDATE books SET available_copies = available_copies + 1 WHERE id=?`,
      [loan.book_id]
    );

    await conn.commit();
    const [row] = await pool.query('SELECT * FROM loans WHERE id=?', [loan.id]);
    res.json(row[0]);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    next(e);
  } finally {
    conn.release();
  }
});

export default router;
