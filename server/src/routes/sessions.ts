import type { FastifyInstance } from 'fastify';
import { requireTrainer, isTrainerAuthenticated } from '../middleware/auth.js';
import * as sheets from '../sheets/service.js';
import type { WorkoutType } from '../types.js';

function mapSheetError(err: unknown): { status: number; message: string; code: string } {
  const msg = err instanceof Error ? err.message : 'UNKNOWN';
  switch (msg) {
    case 'INSUFFICIENT_BALANCE':
      return { status: 400, message: 'Недостаточно тренировок в пакете', code: msg };
    case 'SESSION_NOT_FOUND':
      return { status: 404, message: 'Запись не найдена', code: msg };
    case 'SESSION_CANCELLED':
      return { status: 400, message: 'Запись отменена', code: msg };
    case 'SESSION_ALREADY_COMPLETED':
      return { status: 400, message: 'Тренировка уже проведена', code: msg };
    case 'CLIENT_NOT_FOUND':
      return { status: 404, message: 'Клиент не найден', code: msg };
    default:
      return { status: 500, message: 'Внутренняя ошибка', code: 'INTERNAL' };
  }
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/api/sessions',
    async (request) => {
      const { from, to } = request.query;
      if (!from || !to) {
        return [];
      }
      const isTrainer = isTrainerAuthenticated(request);
      const sessions = await sheets.getSessionsInRange(from, to);
      return sessions.map((s) => sheets.sanitizeSessionForGuest(s, isTrainer));
    },
  );

  app.post<{ Body: { clientId?: string; start?: string; workoutType?: WorkoutType } }>(
    '/api/sessions',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const { clientId, start, workoutType } = request.body ?? {};
      if (!clientId || !start || !workoutType) {
        return reply.status(400).send({
          message: 'clientId, start и workoutType обязательны',
          code: 'VALIDATION',
        });
      }
      if (!['solo', 'split', 'running'].includes(workoutType)) {
        return reply.status(400).send({ message: 'Неверный тип тренировки', code: 'VALIDATION' });
      }
      try {
        return await sheets.createSession({ clientId, start, workoutType });
      } catch (e) {
        const err = mapSheetError(e);
        return reply.status(err.status).send(err);
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/sessions/:id/confirm',
    { preHandler: requireTrainer },
    async (request, reply) => {
      try {
        return await sheets.confirmSession(request.params.id);
      } catch (e) {
        const err = mapSheetError(e);
        return reply.status(err.status).send(err);
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/sessions/:id/cancel',
    { preHandler: requireTrainer },
    async (request, reply) => {
      try {
        return await sheets.cancelSession(request.params.id);
      } catch (e) {
        const err = mapSheetError(e);
        return reply.status(err.status).send(err);
      }
    },
  );
}
