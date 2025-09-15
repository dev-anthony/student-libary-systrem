import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/** GET /api/students */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY id DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

/** POST /api/students */
router.post('/', async (req, res, next) => {
  try {
    const { student_id, name, email, department, level } = req.body;
    if (!student_id || !name || !email) {
      return res.status(400).json({ message: 'student_id, name, email are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO students (student_id, name, email, department, level)
       VALUES (?,?,?,?,?)`,
      [student_id, name, email, department ?? null, level ?? null]
    );
    const [row] = await pool.query('SELECT * FROM students WHERE id=?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (e) { next(e); }
});

/** PUT /api/students/:id */
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, department, level } = req.body;
    const [result] = await pool.query(
      `UPDATE students SET name=?, email=?, department=?, level=? WHERE id=?`,
      [name, email, department ?? null, level ?? null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Student not found' });
    const [row] = await pool.query('SELECT * FROM students WHERE id=?', [req.params.id]);
    res.json(row[0]);
  } catch (e) { next(e); }
});

/** DELETE /api/students/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(`DELETE FROM students WHERE id=?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Student not found' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
