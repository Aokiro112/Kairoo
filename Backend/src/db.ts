import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const candidates = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'Backend/.env'),
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
if (dbUrl.startsWith('file:')) {
  let dbFilePath = dbUrl.slice(5);
  if (!path.isAbsolute(dbFilePath)) {
    dbFilePath = path.resolve(process.cwd(), dbFilePath);
  }
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
