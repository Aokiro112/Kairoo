import { Request } from 'express';

export const getClientIp = (req: Request): string => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || '127.0.0.1';
};
