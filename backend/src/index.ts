import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { boardsRouter } from './routes/boards';
import { columnsRouter } from './routes/columns';
import { notesRouter } from './routes/notes';
import { aiRouter } from './routes/ai';
import { authRouter } from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.NEXTAUTH_URL, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
