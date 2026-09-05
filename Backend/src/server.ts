import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { projectsRouter } from './routes/projects';
import { tasksRouter } from './routes/tasks';
import { chatRouter } from './routes/chat';
import { authRouter } from './routes/auth';
import { groqKeyManager } from './agent/groqKeyManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for kairo.bond, Vercel deployments, and local development
const allowedOrigins = [
  'https://kairo.bond',
  'https://www.kairo.bond',
  'http://localhost:3000',
  'http://localhost:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-side Next.js rewrites, curl)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('kairo.bond')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for API consumers
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/chat', chatRouter);

// Groq Key Pool Diagnostic Route
app.get('/api/groq/keys', (req, res) => {
  res.json({
    domain: 'kairo.bond',
    totalKeys: groqKeyManager.getKeyCount(),
    poolStatus: groqKeyManager.getPoolStatus(),
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    domain: 'kairo.bond',
    service: 'Kairo Security Backend & Groq Multi-Key Agent',
    groqKeysLoaded: groqKeyManager.getKeyCount(),
    timestamp: new Date().toISOString(),
  });
});

// Listen on 0.0.0.0 for Railway / Docker / Cloud environments
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`⚡ Kairo Backend Server running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 Primary Domain: https://kairo.bond`);
  console.log(`🔑 Groq API Key Pool: ${groqKeyManager.getKeyCount()} key(s) active with auto-failover.`);
});
