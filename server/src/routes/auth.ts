import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { signTrainerToken, verifyTrainerToken } from '../middleware/auth.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { password?: string } }>('/api/auth/login', async (request, reply) => {
    const { password } = request.body ?? {};
    if (password !== config.trainerPassword) {
      return reply.status(401).send({ message: 'Неверный пароль', code: 'INVALID_PASSWORD' });
    }

    const token = signTrainerToken();
    reply.setCookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return { ok: true };
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(config.cookieName, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (request, reply) => {
    const token = request.cookies[config.cookieName];
    if (!token || !verifyTrainerToken(token)) {
      return reply.status(401).send({ message: 'Не авторизован', code: 'UNAUTHORIZED' });
    }
    return { role: 'trainer' };
  });
}
