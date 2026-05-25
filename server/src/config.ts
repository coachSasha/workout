import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  spreadsheetId: required('SPREADSHEET_ID'),
  googleEmail: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  googlePrivateKey: required('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  trainerPassword: required('TRAINER_PASSWORD'),
  jwtSecret: required('JWT_SECRET'),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  initSheets: process.env.INIT_SHEETS === 'true',
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '45', 10),
  timezone: process.env.DEFAULT_TIMEZONE ?? 'Europe/Moscow',
  slotDurationMinutes: parseInt(process.env.SLOT_DURATION_MINUTES ?? '60', 10),
  cookieName: 'trainer_token',
  isProd: process.env.NODE_ENV === 'production',
};
