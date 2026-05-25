import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface JwtPayload {
  role: 'trainer';
}

export function signTrainerToken(): string {
  return jwt.sign({ role: 'trainer' } satisfies JwtPayload, config.jwtSecret, {
    expiresIn: '7d',
  });
}

export function verifyTrainerToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

export async function requireTrainer(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = request.cookies[config.cookieName];
  if (!token || !verifyTrainerToken(token)) {
    reply.status(401).send({ message: 'Требуется авторизация', code: 'UNAUTHORIZED' });
  }
}

export function isTrainerAuthenticated(request: FastifyRequest): boolean {
  const token = request.cookies[config.cookieName];
  return !!token && !!verifyTrainerToken(token);
}
