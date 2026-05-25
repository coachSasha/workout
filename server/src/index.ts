import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { initSpreadsheet, listClients } from './sheets/service.js';
import { authRoutes } from './routes/auth.js';
import { clientRoutes } from './routes/clients.js';
import { sessionRoutes } from './routes/sessions.js';
import { publicRoutes } from './routes/public.js';
import { daysOffRoutes } from './routes/daysOff.js';
import { registerClientSpa } from './staticSpa.js';
import { mapApiError } from './errors.js';

const app = Fastify({ logger: true });

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (reply.sent) return;
  const body = mapApiError(error);
  if (body.code === 'INTERNAL' && error instanceof Error) {
    request.log.error({ err: error.message, stack: error.stack }, 'Unhandled API error');
  }
  reply.status(body.status).send(body);
});

await app.register(cors, {
  origin: config.clientUrl,
  credentials: true,
});

await app.register(cookie);

await authRoutes(app);
await clientRoutes(app);
await sessionRoutes(app);
await publicRoutes(app);
await daysOffRoutes(app);

app.get('/api/health', async () => ({ ok: true }));

app.get('/api/health/sheets', async (request, reply) => {
  try {
    const clients = await listClients();
    return { ok: true, clientsCount: clients.length };
  } catch (e) {
    const body = mapApiError(e);
    return reply.status(body.status).send(body);
  }
});

await registerClientSpa(app);

try {
  const initMessages = await initSpreadsheet();
  for (const msg of initMessages) {
    app.log.info(msg);
  }
} catch (e) {
  app.log.error(e, 'Could not init spreadsheet — проверьте SPREADSHEET_ID, ключ и доступ Editor для service account');
}

app.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server http://localhost:${config.port}`);
});
