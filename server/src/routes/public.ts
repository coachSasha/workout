import type { FastifyInstance } from 'fastify';
import * as sheets from '../sheets/service.js';

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { shareToken: string } }>(
    '/api/public/client/:shareToken',
    async (request, reply) => {
      const view = await sheets.getPublicClientView(request.params.shareToken);
      if (!view) {
        return reply.status(404).send({
          message: 'Ссылка недействительна или отключена',
          code: 'NOT_FOUND',
        });
      }
      return view;
    },
  );
}
