import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'kairo_secure_jwt_secret_key_849204192';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role?: string;
  tier?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function generateAuthToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyAuthToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }

  req.user = decoded;
  next();
}
