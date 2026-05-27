import type { FastifyInstance } from 'fastify';
import { requireTrainer, isTrainerAuthenticated } from '../middleware/auth.js';
import * as sheets from '../sheets/service.js';
import type { WorkoutType } from '../types.js';
import { mapApiError } from '../errors.js';

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

  app.post<{
    Body: {
      clientId?: string;
      clientIds?: string[];
      start?: string;
      workoutType?: WorkoutType;
    };
  }>(
    '/api/sessions',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const { clientId, clientIds, start, workoutType } = request.body ?? {};
      const ids =
        clientIds?.length ? clientIds : clientId ? [clientId] : [];
      if (!ids.length || !start || !workoutType) {
        return reply.status(400).send({
          message: 'clientIds (или clientId), start и workoutType обязательны',
          code: 'VALIDATION',
        });
      }
      if (!['solo', 'split', 'online', 'running'].includes(workoutType)) {
        return reply.status(400).send({ message: 'Неверный тип тренировки', code: 'VALIDATION' });
      }
      try {
        return await sheets.createSessions({ clientIds: ids, start, workoutType });
      } catch (e) {
        const err = mapApiError(e);
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
        const err = mapApiError(e);
        return reply.status(err.status).send(err);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { deduct?: boolean } }>(
    '/api/sessions/:id/cancel',
    { preHandler: requireTrainer },
    async (request, reply) => {
      try {
        const deduct = request.body?.deduct === true;
        return await sheets.cancelSession(request.params.id, deduct);
      } catch (e) {
        const err = mapApiError(e);
        return reply.status(err.status).send(err);
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { clientId?: string; workoutType?: WorkoutType };
  }>(
    '/api/sessions/:id/reassign',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const { clientId, workoutType } = request.body ?? {};
      if (!clientId || !workoutType) {
        return reply.status(400).send({
          message: 'clientId и workoutType обязательны',
          code: 'VALIDATION',
        });
      }
      try {
        return await sheets.reassignSession(request.params.id, {
          clientId,
          workoutType,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg === 'SESSION_NOT_CANCELLED') {
          return reply.status(400).send({
            message: 'Переназначить можно только отменённую запись',
            code: msg,
          });
        }
        if (msg === 'SESSION_ALREADY_REASSIGNED') {
          return reply.status(400).send({
            message: 'На этот слот уже назначен другой клиент',
            code: msg,
          });
        }
        const err = mapApiError(e);
        return reply.status(err.status).send(err);
      }
    },
  );

  app.delete<{
    Params: { id: string };
    Querystring: { scope?: 'one' | 'running_group' };
  }>(
    '/api/sessions/:id',
    { preHandler: requireTrainer },
    async (request, reply) => {
      try {
        const scope = request.query.scope === 'running_group' ? 'running_group' : 'one';
        return await sheets.deleteSession(request.params.id, scope);
      } catch (e) {
        const err = mapApiError(e);
        return reply.status(err.status).send(err);
      }
    },
  );
}
