import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import students from './routes/students.js';
import books from './routes/books.js';
import loans from './routes/loans.js';

dotenv.config();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health
app.get('/api/health', async (req, res) => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: !!r[0].ok });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// Routes
app.use('/api/students', students);
app.use('/api/books', books);
app.use('/api/loans', loans);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
