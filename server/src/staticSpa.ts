import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
/** client/dist относительно server/dist при `node dist/index.js` */
export const clientDistPath = path.resolve(serverDir, '../../client/dist');

export async function registerClientSpa(app: FastifyInstance): Promise<void> {
  if (!existsSync(clientDistPath)) {
    app.log.warn(
      `Папка фронтенда не найдена: ${clientDistPath}. Выполните "npm run build" в корне проекта. Маршруты SPA (/, /login, /lk, /c/...) вернут 404.`,
    );
    return;
  }

  await app.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/',
    wildcard: false,
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api')) {
      return reply.status(404).send({ message: 'Not found', code: 'NOT_FOUND' });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return reply.status(404).send({ message: 'Not found', code: 'NOT_FOUND' });
    }
    return reply.sendFile('index.html', clientDistPath);
  });

  app.log.info(`Статика SPA: ${clientDistPath}`);
}
