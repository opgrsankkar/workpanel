import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import todoistRouter from './routes/todoist.js';
import feedsRouter from './routes/feeds.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/todoist', todoistRouter);
app.use('/api/feeds', feedsRouter);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
