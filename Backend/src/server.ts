import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { projectsRouter } from './routes/projects';
import { tasksRouter } from './routes/tasks';
import { chatRouter } from './routes/chat';
import { groqKeyManager } from './agent/groqKeyManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/chat', chatRouter);

// Groq Key Pool Diagnostic Route
app.get('/api/groq/keys', (req, res) => {
  res.json({
    totalKeys: groqKeyManager.getKeyCount(),
    poolStatus: groqKeyManager.getPoolStatus(),
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Reindeer Security Backend & Groq Multi-Key Agent',
    groqKeysLoaded: groqKeyManager.getKeyCount(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`⚡ Reindeer Backend Server running on http://localhost:${PORT}`);
  console.log(`🔑 Groq API Key Pool: ${groqKeyManager.getKeyCount()} key(s) active with auto-failover.`);
});
