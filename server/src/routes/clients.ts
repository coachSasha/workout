import type { FastifyInstance } from 'fastify';
import { requireTrainer } from '../middleware/auth.js';
import * as sheets from '../sheets/service.js';

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/clients', { preHandler: requireTrainer }, async () => {
    return sheets.listClients();
  });

  app.post<{ Body: Record<string, unknown> }>(
    '/api/clients',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const body = request.body;
      const name = String(body.name ?? '').trim();
      if (!name) {
        return reply.status(400).send({ message: 'Имя обязательно', code: 'VALIDATION' });
      }
      const client = await sheets.createClient({
        name,
        surname: body.surname ? String(body.surname) : undefined,
        soloRemaining: Number(body.soloRemaining ?? 0),
        splitRemaining: Number(body.splitRemaining ?? 0),
        runningRemaining: Number(body.runningRemaining ?? 0),
      });
      return client;
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/clients/:id',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const result = await sheets.getClientWithHistory(request.params.id);
      if (!result) {
        return reply.status(404).send({ message: 'Клиент не найден', code: 'NOT_FOUND' });
      }
      return result;
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/clients/:id',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const body = request.body;
      const client = await sheets.updateClient(request.params.id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        surname: body.surname !== undefined ? String(body.surname) : undefined,
        soloRemaining: body.soloRemaining !== undefined ? Number(body.soloRemaining) : undefined,
        splitRemaining: body.splitRemaining !== undefined ? Number(body.splitRemaining) : undefined,
        runningRemaining: body.runningRemaining !== undefined ? Number(body.runningRemaining) : undefined,
      });
      if (!client) {
        return reply.status(404).send({ message: 'Клиент не найден', code: 'NOT_FOUND' });
      }
      return client;
    },
  );

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/clients/:id/packages',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const body = request.body;
      const client = await sheets.addClientPackages(request.params.id, {
        addSolo: body.addSolo !== undefined ? Number(body.addSolo) : undefined,
        addSplit: body.addSplit !== undefined ? Number(body.addSplit) : undefined,
        addRunning: body.addRunning !== undefined ? Number(body.addRunning) : undefined,
      });
      if (!client) {
        return reply.status(404).send({ message: 'Клиент не найден', code: 'NOT_FOUND' });
      }
      return client;
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/clients/:id/share-link',
    { preHandler: requireTrainer },
    async (request, reply) => {
      const result = await sheets.getShareUrl(request.params.id);
      if (!result) {
        return reply.status(404).send({ message: 'Клиент не найден', code: 'NOT_FOUND' });
      }
      return result;
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/clients/:id',
    { preHandler: requireTrainer },
    async (request, reply) => {
      try {
        return await sheets.deleteClient(request.params.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'UNKNOWN';
        if (msg === 'CLIENT_NOT_FOUND') {
          return reply.status(404).send({ message: 'Клиент не найден', code: msg });
        }
        throw e;
      }
    },
  );
}
