import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

/** GET /api/books */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM books ORDER BY id DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

/** POST /api/books */
router.post('/', async (req, res, next) => {
  try {
    const { title, author, category, total_copies } = req.body;
    if (!title || !author || total_copies == null) {
      return res.status(400).json({ message: 'title, author, total_copies are required' });
    }
    const total = Number(total_copies);
    if (isNaN(total) || total < 1) return res.status(400).json({ message: 'total_copies must be >= 1' });

    const [result] = await pool.query(
      `INSERT INTO books (title, author, category, total_copies, available_copies)
       VALUES (?,?,?,?,?)`,
      [title, author, category ?? null, total, total]
    );
    const [row] = await pool.query('SELECT * FROM books WHERE id=?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (e) { next(e); }
});

/** PUT /api/books/:id */
router.put('/:id', async (req, res, next) => {
  try {
    const { title, author, category, total_copies } = req.body;
    const [existingRows] = await pool.query('SELECT * FROM books WHERE id=?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ message: 'Book not found' });
    const existing = existingRows[0];

    let query = 'UPDATE books SET title=?, author=?, category=?';
    let params = [title ?? existing.title, author ?? existing.author, category ?? existing.category];

    if (total_copies != null) {
      const total = Number(total_copies);
      if (isNaN(total) || total < 1) return res.status(400).json({ message: 'total_copies must be >= 1' });
      const newAvailable = Math.min(total, Math.max(0, existing.available_copies));
      query += ', total_copies=?, available_copies=?';
      params.push(total, newAvailable);
    }

    query += ' WHERE id=?';
    params.push(req.params.id);

    await pool.query(query, params);
    const [row] = await pool.query('SELECT * FROM books WHERE id=?', [req.params.id]);
    res.json(row[0]);
  } catch (e) { next(e); }
});

/** DELETE /api/books/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(`DELETE FROM books WHERE id=?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Book not found' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
