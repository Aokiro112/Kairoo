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

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
