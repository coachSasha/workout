import { google, sheets_v4 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { config } from '../config.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../cache.js';
import type {
  Client,
  Session,
  WorkoutType,
  SessionStatus,
  CompletedHistoryItem,
  PublicClientView,
} from '../types.js';
import { formatClientName } from '../utils/clientName.js';

const CLIENTS_SHEET = 'Clients';
const SESSIONS_SHEET = 'Sessions';

const CLIENT_HEADERS = [
  'id',
  'name',
  'surname',
  'solo_remaining',
  'split_remaining',
  'running_remaining',
  'share_token',
  'created_at',
];

const SESSION_HEADERS = [
  'id',
  'client_id',
  'client_name',
  'start_datetime',
  'end_datetime',
  'workout_type',
  'status',
  'created_at',
  'updated_at',
];

function getSheets(): sheets_v4.Sheets {
  const auth = new google.auth.JWT({
    email: config.googleEmail,
    key: config.googlePrivateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function colIndex(headers: string[], name: string, legacy?: string): number {
  let i = headers.indexOf(name);
  if (i >= 0) return i;
  if (legacy) {
    i = headers.indexOf(legacy);
    if (i >= 0) return i;
  }
  return -1;
}

function cell(row: string[], index: number): string {
  return index >= 0 ? (row[index] ?? '') : '';
}

function rowToClient(row: string[], headers: string[]): Client {
  const surnameIdx = colIndex(headers, 'surname', 'phone');
  const createdIdx = colIndex(headers, 'created_at');
  const shareIdx = colIndex(headers, 'share_token');

  let shareToken = cell(row, shareIdx);
  if (!shareToken) shareToken = generateShareToken();

  let createdAt = cell(row, createdIdx);
  if (createdAt === 'true' || createdAt === 'false') {
    createdAt = row[8] && row[8] !== 'true' && row[8] !== 'false' ? row[8] : '';
  }
  if (!createdAt) createdAt = nowIso();

  return {
    id: cell(row, colIndex(headers, 'id')),
    name: cell(row, colIndex(headers, 'name')),
    surname: cell(row, surnameIdx),
    soloRemaining: parseInt(cell(row, colIndex(headers, 'solo_remaining')), 10) || 0,
    splitRemaining: parseInt(cell(row, colIndex(headers, 'split_remaining')), 10) || 0,
    runningRemaining: parseInt(cell(row, colIndex(headers, 'running_remaining')), 10) || 0,
    shareToken,
    createdAt,
  };
}

function clientToRow(c: Client): string[] {
  return [
    c.id,
    c.name,
    c.surname,
    String(c.soloRemaining),
    String(c.splitRemaining),
    String(c.runningRemaining),
    c.shareToken || generateShareToken(),
    c.createdAt,
  ];
}

async function getClientHeaders(): Promise<string[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${CLIENTS_SHEET}!A1:Z1`,
  });
  const headers = res.data.values?.[0] ?? [];
  return headers.length > 0 ? headers.map(String) : [...CLIENT_HEADERS];
}

function rowToSession(row: string[]): Session {
  return {
    id: row[0] ?? '',
    clientId: row[1] ?? '',
    clientName: row[2] ?? '',
    startDatetime: row[3] ?? '',
    endDatetime: row[4] ?? '',
    workoutType: (row[5] ?? 'solo') as WorkoutType,
    status: (row[6] ?? 'scheduled') as SessionStatus,
    createdAt: row[7] ?? '',
    updatedAt: row[8] ?? '',
  };
}

function sessionToRow(s: Session): string[] {
  return [
    s.id,
    s.clientId,
    s.clientName,
    s.startDatetime,
    s.endDatetime,
    s.workoutType,
    s.status,
    s.createdAt,
    s.updatedAt,
  ];
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutes(isoStart: string, minutes: number): string {
  const d = new Date(isoStart);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function generateShareToken(): string {
  return randomBytes(24).toString('hex');
}

function remainingField(type: WorkoutType): keyof Pick<
  Client,
  'soloRemaining' | 'splitRemaining' | 'runningRemaining'
> {
  switch (type) {
    case 'solo':
      return 'soloRemaining';
    case 'split':
      return 'splitRemaining';
    case 'running':
      return 'runningRemaining';
  }
}

async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  const rows = res.data.values ?? [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => r.map(String)) as string[][];
}

async function writeAllRows(sheetName: string, headers: string[], dataRows: string[][]): Promise<void> {
  const sheets = getSheets();
  const values = [headers, ...dataRows];
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function ensureSheetWithHeaders(sheetName: string, headers: string[]): Promise<'created' | 'headers_written' | 'ok'> {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === sheetName);
  let action: 'created' | 'headers_written' | 'ok' = 'ok';

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
    action = 'created';
  }

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
  });
  const current = headerRow.data.values?.[0] ?? [];
  const needsHeaders =
    current.length === 0 || headers.some((h, i) => current[i] !== h);

  if (needsHeaders) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
    return action === 'created' ? 'created' : 'headers_written';
  }

  return action;
}

export async function initSpreadsheet(): Promise<string[]> {
  if (!config.initSheets) return [];

  const messages: string[] = [];
  const clients = await ensureSheetWithHeaders(CLIENTS_SHEET, CLIENT_HEADERS);
  const sessions = await ensureSheetWithHeaders(SESSIONS_SHEET, SESSION_HEADERS);

  if (clients === 'created') messages.push(`Создан лист ${CLIENTS_SHEET} с заголовками`);
  else if (clients === 'headers_written') messages.push(`Записаны заголовки на листе ${CLIENTS_SHEET}`);

  if (sessions === 'created') messages.push(`Создан лист ${SESSIONS_SHEET} с заголовками`);
  else if (sessions === 'headers_written') messages.push(`Записаны заголовки на листе ${SESSIONS_SHEET}`);

  if (messages.length === 0) messages.push('Листы Clients и Sessions уже настроены');

  if (await normalizeClientsSheet()) {
    messages.push('Данные Clients приведены к новой схеме (фамилия, без share_enabled)');
  }

  return messages;
}

async function getAllClientsRaw(): Promise<Client[]> {
  const cacheKey = 'clients:all';
  const cached = cacheGet<Client[]>(cacheKey);
  if (cached) return cached;

  const headers = await getClientHeaders();
  const rows = await readSheet(CLIENTS_SHEET);
  const clients = rows
    .filter((r) => cell(r, colIndex(headers, 'id')))
    .map((r) => rowToClient(r, headers));
  cacheSet(cacheKey, clients, config.cacheTtlSeconds);
  return clients;
}

async function normalizeClientsSheet(): Promise<boolean> {
  cacheInvalidate('clients');
  const headers = await getClientHeaders();
  const rows = await readSheet(CLIENTS_SHEET);
  if (rows.length === 0) return false;

  const clients = rows
    .filter((r) => cell(r, colIndex(headers, 'id')))
    .map((r) => rowToClient(r, headers));

  const needsWrite =
    headers.join('|') !== CLIENT_HEADERS.join('|') ||
    headers.includes('phone') ||
    headers.includes('share_enabled');

  if (!needsWrite) return false;

  await writeAllRows(CLIENTS_SHEET, CLIENT_HEADERS, clients.map(clientToRow));
  cacheInvalidate('clients');
  return true;
}

async function getAllSessionsRaw(): Promise<Session[]> {
  const cacheKey = 'sessions:all';
  const cached = cacheGet<Session[]>(cacheKey);
  if (cached) return cached;

  const rows = await readSheet(SESSIONS_SHEET);
  const sessions = rows.filter((r) => r[0]).map(rowToSession);
  cacheSet(cacheKey, sessions, config.cacheTtlSeconds);
  return sessions;
}

async function saveClients(clients: Client[]): Promise<void> {
  await writeAllRows(
    CLIENTS_SHEET,
    CLIENT_HEADERS,
    clients.map(clientToRow),
  );
  cacheInvalidate('clients');
  cacheInvalidate('sessions');
}

async function saveSessions(sessions: Session[]): Promise<void> {
  await writeAllRows(
    SESSIONS_SHEET,
    SESSION_HEADERS,
    sessions.map(sessionToRow),
  );
  cacheInvalidate('sessions');
}

export async function listClients(): Promise<Client[]> {
  return getAllClientsRaw();
}

export async function getClientById(id: string): Promise<Client | null> {
  const clients = await getAllClientsRaw();
  return clients.find((c) => c.id === id) ?? null;
}

export async function getClientByShareToken(token: string): Promise<Client | null> {
  const clients = await getAllClientsRaw();
  return clients.find((c) => c.shareToken === token) ?? null;
}

export async function createClient(data: {
  name: string;
  surname?: string;
  soloRemaining?: number;
  splitRemaining?: number;
  runningRemaining?: number;
}): Promise<Client> {
  const clients = await getAllClientsRaw();
  const client: Client = {
    id: uuidv4(),
    name: data.name.trim(),
    surname: (data.surname ?? '').trim(),
    soloRemaining: data.soloRemaining ?? 0,
    splitRemaining: data.splitRemaining ?? 0,
    runningRemaining: data.runningRemaining ?? 0,
    shareToken: generateShareToken(),
    createdAt: nowIso(),
  };
  clients.push(client);
  await saveClients(clients);
  return client;
}

export async function updateClient(
  id: string,
  patch: Partial<{
    name: string;
    surname: string;
    soloRemaining: number;
    splitRemaining: number;
    runningRemaining: number;
    shareToken: string;
  }>,
): Promise<Client | null> {
  const clients = await getAllClientsRaw();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const c = clients[idx];
  if (patch.name !== undefined) c.name = patch.name.trim();
  if (patch.surname !== undefined) c.surname = patch.surname.trim();
  if (patch.soloRemaining !== undefined) c.soloRemaining = Math.max(0, patch.soloRemaining);
  if (patch.splitRemaining !== undefined) c.splitRemaining = Math.max(0, patch.splitRemaining);
  if (patch.runningRemaining !== undefined) c.runningRemaining = Math.max(0, patch.runningRemaining);
  if (patch.shareToken !== undefined) c.shareToken = patch.shareToken;
  if (!c.shareToken) c.shareToken = generateShareToken();

  clients[idx] = c;
  await saveClients(clients);
  return c;
}

export async function regenerateShareLink(id: string): Promise<Client | null> {
  const client = await getClientById(id);
  if (!client) return null;
  if (client.shareToken) return client;
  return updateClient(id, { shareToken: generateShareToken() });
}

export async function getShareUrl(id: string): Promise<{ shareToken: string; url: string } | null> {
  const client = await getClientById(id);
  if (!client) return null;
  let token = client.shareToken;
  if (!token) {
    const updated = await updateClient(id, { shareToken: generateShareToken() });
    token = updated?.shareToken ?? '';
  }
  return {
    shareToken: token,
    url: `${config.clientUrl}/c/${token}`,
  };
}

export async function getSessionsInRange(from: string, to: string): Promise<Session[]> {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const sessions = await getAllSessionsRaw();
  return sessions.filter((s) => {
    const start = new Date(s.startDatetime).getTime();
    return start >= fromMs && start <= toMs;
  });
}

export async function createSession(data: {
  clientId: string;
  start: string;
  workoutType: WorkoutType;
}): Promise<Session> {
  const client = await getClientById(data.clientId);
  if (!client) throw new Error('CLIENT_NOT_FOUND');

  const sessions = await getAllSessionsRaw();
  const ts = nowIso();
  const session: Session = {
    id: uuidv4(),
    clientId: client.id,
    clientName: formatClientName(client),
    startDatetime: data.start,
    endDatetime: addMinutes(data.start, config.slotDurationMinutes),
    workoutType: data.workoutType,
    status: 'scheduled',
    createdAt: ts,
    updatedAt: ts,
  };
  sessions.push(session);
  await saveSessions(sessions);
  return session;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const sessions = await getAllSessionsRaw();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function confirmSession(id: string): Promise<Session> {
  const sessions = await getAllSessionsRaw();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('SESSION_NOT_FOUND');

  const session = sessions[idx];
  if (session.status === 'completed') return session;
  if (session.status === 'cancelled') throw new Error('SESSION_CANCELLED');

  const clients = await getAllClientsRaw();
  const clientIdx = clients.findIndex((c) => c.id === session.clientId);
  if (clientIdx === -1) throw new Error('CLIENT_NOT_FOUND');

  const client = clients[clientIdx];
  const field = remainingField(session.workoutType);
  if (client[field] <= 0) throw new Error('INSUFFICIENT_BALANCE');

  client[field] -= 1;
  session.status = 'completed';
  session.updatedAt = nowIso();

  clients[clientIdx] = client;
  sessions[idx] = session;

  await saveClients(clients);
  await saveSessions(sessions);
  return session;
}

export async function cancelSession(id: string): Promise<Session> {
  const sessions = await getAllSessionsRaw();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('SESSION_NOT_FOUND');

  const session = sessions[idx];
  if (session.status === 'completed') throw new Error('SESSION_ALREADY_COMPLETED');
  if (session.status === 'cancelled') return session;

  session.status = 'cancelled';
  session.updatedAt = nowIso();
  sessions[idx] = session;
  await saveSessions(sessions);
  return session;
}

export async function getClientWithHistory(id: string): Promise<{
  client: Client;
  history: CompletedHistoryItem[];
} | null> {
  const client = await getClientById(id);
  if (!client) return null;

  const sessions = await getAllSessionsRaw();
  const history = sessions
    .filter((s) => s.clientId === id && s.status === 'completed')
    .map((s) => ({
      id: s.id,
      date: s.startDatetime,
      workoutType: s.workoutType,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { client, history };
}

export async function getPublicClientView(token: string): Promise<PublicClientView | null> {
  const client = await getClientByShareToken(token);
  if (!client) return null;

  const sessions = await getAllSessionsRaw();
  const clientSessions = sessions.filter((s) => s.clientId === client.id);
  const now = Date.now();

  const upcoming = clientSessions
    .filter((s) => s.status === 'scheduled' && new Date(s.startDatetime).getTime() >= now)
    .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());

  const history = clientSessions
    .filter((s) => s.status === 'completed')
    .map((s) => ({
      id: s.id,
      date: s.startDatetime,
      workoutType: s.workoutType,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    name: client.name,
    surname: client.surname,
    soloRemaining: client.soloRemaining,
    splitRemaining: client.splitRemaining,
    runningRemaining: client.runningRemaining,
    upcoming,
    history,
  };
}

/** Guest calendar: hide client names */
export function sanitizeSessionForGuest(s: Session, isTrainer: boolean): Session {
  if (isTrainer) return s;
  return { ...s, clientName: 'Занято', clientId: '' };
}
