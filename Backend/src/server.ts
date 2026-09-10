import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { projectsRouter } from './routes/projects';
import { tasksRouter } from './routes/tasks';
import { chatRouter } from './routes/chat';
import { authRouter } from './routes/auth';
import { groqKeyManager } from './agent/groqKeyManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Railway, Render, Vercel, Cloudflare, AWS) for accurate client IP
app.set('trust proxy', 1);

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Handled per-page on frontend
  })
);

import { getClientIp } from './utils/ip';

// 2. Global & Endpoint Rate Limiting (DoS & Brute Force Protection)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, forwardedHeader: false, trustProxy: false },
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, forwardedHeader: false, trustProxy: false },
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // Limit each IP to 60 chat streams per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, forwardedHeader: false, trustProxy: false },
  message: { error: 'Too many security scan requests. Please wait a moment before trying again.' },
});

app.use(globalLimiter);

// 3. CORS configuration for kairo.bond, Vercel deployments, and local development
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

// 4. Strict Payload Boundaries (10MB Cap)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. API Routes with Targeted Rate Limits
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/chat', chatLimiter, chatRouter);

// Groq Key Pool Diagnostic Route
app.get('/api/groq/keys', (req, res) => {
  res.json({
    domain: 'kairo.bond',
    groq: {
      totalKeys: groqKeyManager.getKeyCount(),
      poolStatus: groqKeyManager.getPoolStatus(),
    },
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
