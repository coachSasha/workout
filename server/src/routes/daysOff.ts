import type { FastifyInstance } from 'fastify';
import { requireTrainer } from '../middleware/auth.js';
import * as sheets from '../sheets/service.js';

export async function daysOffRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/api/days-off',
    async (request, reply) => {
      const { from, to } = request.query;
      if (!from || !to) {
        return reply.status(400).send({
          message: 'Параметры from и to обязательны',
          code: 'VALIDATION',
        });
      }
      return sheets.getDaysOffInRange(from, to);
    },
  );

  app.post<{ Body: { date?: string; note?: string } }>(
    '/api/days-off',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const { date, note } = request.body ?? {};
      if (!date) {
        return reply.status(400).send({
          message: 'Дата обязательна (YYYY-MM-DD)',
          code: 'VALIDATION',
        });
      }
      try {
        return await sheets.createDayOff({ date, note });
      } catch (e) {
        if (e instanceof Error && e.message === 'DAY_OFF_EXISTS') {
          return reply.status(400).send({
            message: 'На этот день выходной уже отмечен',
            code: 'DAY_OFF_EXISTS',
          });
        }
        throw e;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/days-off/:id',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const ok = await sheets.deleteDayOff(request.params.id);
      if (!ok) {
        return reply.status(404).send({ message: 'Выходной не найден', code: 'NOT_FOUND' });
      }
      return { ok: true };
    },
  );
}
