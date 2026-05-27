import { google, sheets_v4 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { config } from '../config.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../cache.js';
import type {
  Client,
  Session,
  DayOff,
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
  'online_remaining',
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
  'deducted',
  'created_at',
  'updated_at',
  'reassigned',
  'running_group_id',
];

const DAYS_OFF_SHEET = 'DaysOff';
const DAYS_OFF_HEADERS = ['id', 'date', 'note', 'created_at'];

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
    onlineRemaining: parseInt(cell(row, colIndex(headers, 'online_remaining')), 10) || 0,
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
    String(c.onlineRemaining),
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
  const hasDeductedCol = row.length > 9;
  const hasReassignedCol = row.length > 10;
  const hasGroupCol = row.length > 11;
  return {
    id: row[0] ?? '',
    clientId: row[1] ?? '',
    clientName: row[2] ?? '',
    startDatetime: row[3] ?? '',
    endDatetime: row[4] ?? '',
    workoutType: (row[5] ?? 'solo') as WorkoutType,
    status: (row[6] ?? 'scheduled') as SessionStatus,
    deducted: hasDeductedCol ? (row[7] ?? '').toLowerCase() === 'true' : false,
    createdAt: hasDeductedCol ? (row[8] ?? '') : (row[7] ?? ''),
    updatedAt: hasDeductedCol ? (row[9] ?? '') : (row[8] ?? ''),
    reassigned: hasReassignedCol ? (row[10] ?? '').toLowerCase() === 'true' : false,
    runningGroupId: hasGroupCol ? (row[11] ?? '') : '',
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
    String(s.deducted ?? false),
    s.createdAt,
    s.updatedAt,
    String(s.reassigned ?? false),
    s.runningGroupId ?? '',
  ];
}

function enrichSessions(sessions: Session[]): Session[] {
  const scheduledStarts = new Set(
    sessions.filter((s) => s.status === 'scheduled').map((s) => s.startDatetime),
  );
  return sessions.map((s) => ({
    ...s,
    reassigned:
      s.reassigned ||
      (s.status === 'cancelled' && scheduledStarts.has(s.startDatetime)),
  }));
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  // [start, end)
  return aStart < bEnd && bStart < aEnd;
}

function assertIntervalHasNoScheduled(
  sessions: Session[],
  startIso: string,
  endIso: string,
  ignoreId?: string,
): void {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (end <= start) return;
  if (
    sessions.some((s) => {
      if (ignoreId && s.id === ignoreId) return false;
      if (s.status !== 'scheduled') return false;
      const sStart = new Date(s.startDatetime).getTime();
      const sEnd = new Date(s.endDatetime).getTime();
      return overlaps(start, end, sStart, sEnd);
    })
  ) {
    throw new Error('SLOT_OCCUPIED');
  }
}

function runningPeers(sessions: Session[], session: Session): Session[] {
  if (!session.runningGroupId) return [session];
  return sessions.filter(
    (s) =>
      s.runningGroupId === session.runningGroupId &&
      s.startDatetime === session.startDatetime,
  );
}

function slotBlocksNewBooking(sessions: Session[], startIso: string, endIso: string): void {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (end <= start) throw new Error('SLOT_OCCUPIED');

  for (const s of sessions) {
    const sStart = new Date(s.startDatetime).getTime();
    const sEnd = new Date(s.endDatetime).getTime();
    if (!overlaps(start, end, sStart, sEnd)) continue;

    if (s.status === 'scheduled') {
      throw new Error('SLOT_OCCUPIED');
    }

    // Внутри пересекающегося окна есть отменённая запись, которую нужно переназначить
    if (s.status === 'cancelled' && !s.reassigned) {
      throw new Error('SLOT_NEEDS_REASSIGN');
    }
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutes(isoStart: string, minutes: number): string {
  const d = new Date(isoStart);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function durationMinutes(type: WorkoutType): number {
  // Бег длится 90 минут, остальные — стандартный слот
  return type === 'running' ? 90 : config.slotDurationMinutes;
}

function generateShareToken(): string {
  return randomBytes(24).toString('hex');
}

function remainingField(type: WorkoutType): keyof Pick<
  Client,
  'soloRemaining' | 'splitRemaining' | 'onlineRemaining' | 'runningRemaining'
> {
  switch (type) {
    case 'solo':
      return 'soloRemaining';
    case 'split':
      return 'splitRemaining';
    case 'online':
      return 'onlineRemaining';
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
  // Очистить старые строки данных — иначе Google Sheets оставляет «хвост» после удаления
  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetName}!A2:Z`,
  });
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
  const daysOff = await ensureSheetWithHeaders(DAYS_OFF_SHEET, DAYS_OFF_HEADERS);

  if (clients === 'created') messages.push(`Создан лист ${CLIENTS_SHEET} с заголовками`);
  else if (clients === 'headers_written') messages.push(`Записаны заголовки на листе ${CLIENTS_SHEET}`);

  if (sessions === 'created') messages.push(`Создан лист ${SESSIONS_SHEET} с заголовками`);
  else if (sessions === 'headers_written') messages.push(`Записаны заголовки на листе ${SESSIONS_SHEET}`);

  if (daysOff === 'created') messages.push(`Создан лист ${DAYS_OFF_SHEET} с заголовками`);
  else if (daysOff === 'headers_written') messages.push(`Записаны заголовки на листе ${DAYS_OFF_SHEET}`);

  if (messages.length === 0) messages.push('Листы Clients, Sessions и DaysOff уже настроены');

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
  const sessions = enrichSessions(rows.filter((r) => r[0]).map(rowToSession));
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
  onlineRemaining?: number;
  runningRemaining?: number;
}): Promise<Client> {
  const clients = await getAllClientsRaw();
  const client: Client = {
    id: uuidv4(),
    name: data.name.trim(),
    surname: (data.surname ?? '').trim(),
    soloRemaining: data.soloRemaining ?? 0,
    splitRemaining: data.splitRemaining ?? 0,
    onlineRemaining: data.onlineRemaining ?? 0,
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
    onlineRemaining: number;
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
  if (patch.onlineRemaining !== undefined) c.onlineRemaining = Math.max(0, patch.onlineRemaining);
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

export function toDateKey(isoOrDate: string): string {
  return isoOrDate.slice(0, 10);
}

function rowToDayOff(row: string[]): DayOff {
  return {
    id: row[0] ?? '',
    date: row[1] ?? '',
    note: row[2] ?? '',
    createdAt: row[3] ?? '',
  };
}

function dayOffToRow(d: DayOff): string[] {
  return [d.id, d.date, d.note, d.createdAt];
}

async function getAllDaysOffRaw(): Promise<DayOff[]> {
  const cacheKey = 'daysoff:all';
  const cached = cacheGet<DayOff[]>(cacheKey);
  if (cached) return cached;

  const rows = await readSheet(DAYS_OFF_SHEET);
  const items = rows.filter((r) => r[0]).map(rowToDayOff);
  cacheSet(cacheKey, items, config.cacheTtlSeconds);
  return items;
}

async function saveDaysOff(items: DayOff[]): Promise<void> {
  await writeAllRows(DAYS_OFF_SHEET, DAYS_OFF_HEADERS, items.map(dayOffToRow));
  cacheInvalidate('daysoff');
}

export async function getDaysOffInRange(from: string, to: string): Promise<DayOff[]> {
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  const items = await getAllDaysOffRaw();
  return items.filter((d) => d.date >= fromKey && d.date <= toKey);
}

export async function isDateDayOff(dateKey: string): Promise<boolean> {
  const items = await getAllDaysOffRaw();
  return items.some((d) => d.date === dateKey);
}

export async function createDayOff(data: { date: string; note?: string }): Promise<DayOff> {
  const dateKey = toDateKey(data.date);
  const items = await getAllDaysOffRaw();
  if (items.some((d) => d.date === dateKey)) {
    throw new Error('DAY_OFF_EXISTS');
  }

  const dayOff: DayOff = {
    id: uuidv4(),
    date: dateKey,
    note: (data.note ?? '').trim(),
    createdAt: nowIso(),
  };
  items.push(dayOff);
  await saveDaysOff(items);
  return dayOff;
}

export async function deleteDayOff(id: string): Promise<boolean> {
  cacheInvalidate('daysoff');
  const items = await getAllDaysOffRaw();
  const idx = items.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  await saveDaysOff(items);
  return true;
}

function assertClientHasPackage(
  client: Client,
  workoutType: WorkoutType,
): void {
  const field = remainingField(workoutType);
  if (client[field] <= 0) throw new Error('INSUFFICIENT_BALANCE');
}

export async function createSessions(data: {
  clientIds: string[];
  start: string;
  workoutType: WorkoutType;
}): Promise<Session[]> {
  const ids = [...new Set(data.clientIds)];
  if (ids.length === 0) throw new Error('CLIENT_IDS_REQUIRED');
  if (data.workoutType !== 'running' && ids.length > 1) {
    throw new Error('SINGLE_CLIENT_ONLY');
  }

  if (await isDateDayOff(toDateKey(data.start))) {
    throw new Error('DAY_OFF');
  }

  const sessions = await getAllSessionsRaw();
  const end = addMinutes(data.start, durationMinutes(data.workoutType));
  slotBlocksNewBooking(sessions, data.start, end);

  const clients = await getAllClientsRaw();
  const ts = nowIso();
  const runningGroupId = data.workoutType === 'running' ? uuidv4() : '';
  const created: Session[] = [];

  for (const clientId of ids) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) throw new Error('CLIENT_NOT_FOUND');
    assertClientHasPackage(client, data.workoutType);

    created.push({
      id: uuidv4(),
      clientId: client.id,
      clientName: formatClientName(client),
      startDatetime: data.start,
      endDatetime: end,
      workoutType: data.workoutType,
      status: 'scheduled',
      deducted: false,
      reassigned: false,
      runningGroupId,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  sessions.push(...created);
  await saveSessions(sessions);
  return created;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const sessions = await getAllSessionsRaw();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function confirmSession(id: string): Promise<Session[]> {
  const sessions = await getAllSessionsRaw();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('SESSION_NOT_FOUND');

  const session = sessions[idx];

  let toConfirm: Session[];
  if (session.workoutType === 'running' && session.runningGroupId) {
    toConfirm = runningPeers(sessions, session).filter((s) => s.status === 'scheduled');
    if (toConfirm.length === 0) {
      throw new Error('SESSION_CANCELLED');
    }
  } else {
    if (session.status === 'cancelled') throw new Error('SESSION_CANCELLED');
    if (session.status === 'completed') return [session];
    toConfirm = session.status === 'scheduled' ? [session] : [];
  }

  if (toConfirm.length === 0) {
    return [session];
  }

  const clients = await getAllClientsRaw();
  const ts = nowIso();
  const field = remainingField(session.workoutType);

  for (const s of toConfirm) {
    const clientIdx = clients.findIndex((c) => c.id === s.clientId);
    if (clientIdx === -1) throw new Error('CLIENT_NOT_FOUND');
    const client = clients[clientIdx];
    if (client[field] <= 0) throw new Error('INSUFFICIENT_BALANCE');
    client[field] -= 1;
    clients[clientIdx] = client;

    const sIdx = sessions.findIndex((x) => x.id === s.id);
    if (sIdx === -1) continue;
    sessions[sIdx].status = 'completed';
    sessions[sIdx].deducted = false;
    sessions[sIdx].updatedAt = ts;
  }

  await saveClients(clients);
  await saveSessions(sessions);
  return toConfirm.map((s) => sessions.find((x) => x.id === s.id)!);
}

function isClientHistory(s: Session, clientId: string): boolean {
  return (
    s.clientId === clientId &&
    (s.status === 'completed' || s.status === 'cancelled')
  );
}

function sessionToHistoryItem(s: Session): CompletedHistoryItem {
  let historyStatus: CompletedHistoryItem['historyStatus'];
  if (s.status === 'completed') {
    historyStatus = 'completed';
  } else if (s.deducted) {
    historyStatus = 'cancelled_deducted';
  } else {
    historyStatus = 'cancelled_free';
  }
  return {
    id: s.id,
    date: s.startDatetime,
    workoutType: s.workoutType,
    historyStatus,
  };
}

export async function cancelSession(
  id: string,
  deduct: boolean,
): Promise<{ session: Session; groupFullyCancelled: boolean }> {
  const sessions = await getAllSessionsRaw();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('SESSION_NOT_FOUND');

  const session = sessions[idx];
  if (session.status === 'completed') throw new Error('SESSION_ALREADY_COMPLETED');
  if (session.status === 'cancelled') {
    const peers = runningPeers(sessions, session);
    const groupFullyCancelled = !peers.some((p) => p.status === 'scheduled');
    return { session, groupFullyCancelled };
  }

  if (deduct) {
    const clients = await getAllClientsRaw();
    const clientIdx = clients.findIndex((c) => c.id === session.clientId);
    if (clientIdx === -1) throw new Error('CLIENT_NOT_FOUND');

    const client = clients[clientIdx];
    const field = remainingField(session.workoutType);
    if (client[field] <= 0) throw new Error('INSUFFICIENT_BALANCE');

    client[field] -= 1;
    clients[clientIdx] = client;
    await saveClients(clients);
    session.deducted = true;
  } else {
    session.deducted = false;
  }

  session.status = 'cancelled';
  session.updatedAt = nowIso();
  sessions[idx] = session;
  await saveSessions(sessions);

  const peers = runningPeers(sessions, session);
  const groupFullyCancelled = !peers.some((p) => p.status === 'scheduled');
  return { session, groupFullyCancelled };
}

export async function reassignSession(
  id: string,
  data: { clientId: string; workoutType: WorkoutType },
): Promise<Session> {
  const sessions = await getAllSessionsRaw();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('SESSION_NOT_FOUND');

  const oldSession = sessions[idx];
  if (oldSession.status !== 'cancelled') throw new Error('SESSION_NOT_CANCELLED');
  if (oldSession.reassigned) throw new Error('SESSION_ALREADY_REASSIGNED');

  assertIntervalHasNoScheduled(sessions, oldSession.startDatetime, oldSession.endDatetime, oldSession.id);

  const client = await getClientById(data.clientId);
  if (!client) throw new Error('CLIENT_NOT_FOUND');

  assertClientHasPackage(client, data.workoutType);

  // Старую отменённую запись не трогаем — она остаётся в истории первого клиента
  const ts = nowIso();
  oldSession.reassigned = true;
  oldSession.updatedAt = ts;
  sessions[idx] = oldSession;
  const newSession: Session = {
    id: uuidv4(),
    clientId: client.id,
    clientName: formatClientName(client),
    startDatetime: oldSession.startDatetime,
    // Переназначение не меняет длительность слота — берём ровно как было в исходной записи
    endDatetime: oldSession.endDatetime,
    workoutType: data.workoutType,
    status: 'scheduled',
    deducted: false,
    reassigned: false,
    runningGroupId: '',
    createdAt: ts,
    updatedAt: ts,
  };
  sessions.push(newSession);
  await saveSessions(sessions);
  return newSession;
}

export type DeleteSessionScope = 'one' | 'running_group';

export async function deleteSession(
  id: string,
  scope: DeleteSessionScope = 'one',
): Promise<{ deleted: number }> {
  const sessions = await getAllSessionsRaw();
  const session = sessions.find((s) => s.id === id);
  if (!session) throw new Error('SESSION_NOT_FOUND');

  let next: Session[];
  if (
    scope === 'running_group' &&
    session.workoutType === 'running' &&
    session.runningGroupId
  ) {
    next = sessions.filter(
      (s) =>
        !(
          s.runningGroupId === session.runningGroupId &&
          s.startDatetime === session.startDatetime
        ),
    );
  } else {
    next = sessions.filter((s) => s.id !== id);
  }

  const deleted = sessions.length - next.length;
  if (deleted === 0) throw new Error('SESSION_NOT_FOUND');
  await saveSessions(next);
  return { deleted };
}

export async function deleteClient(id: string): Promise<{ deletedSessions: number }> {
  const clients = await getAllClientsRaw();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('CLIENT_NOT_FOUND');

  clients.splice(idx, 1);
  await saveClients(clients);

  const sessions = await getAllSessionsRaw();
  const nextSessions = sessions.filter((s) => s.clientId !== id);
  const deletedSessions = sessions.length - nextSessions.length;
  await saveSessions(nextSessions);

  return { deletedSessions };
}

export async function addClientPackages(
  id: string,
  data: { addSolo?: number; addSplit?: number; addOnline?: number; addRunning?: number },
): Promise<Client | null> {
  const clients = await getAllClientsRaw();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const c = clients[idx];
  if (data.addSolo) c.soloRemaining += Math.max(0, data.addSolo);
  if (data.addSplit) c.splitRemaining += Math.max(0, data.addSplit);
  if (data.addOnline) c.onlineRemaining += Math.max(0, data.addOnline);
  if (data.addRunning) c.runningRemaining += Math.max(0, data.addRunning);

  clients[idx] = c;
  await saveClients(clients);
  return c;
}

export async function getClientWithHistory(id: string): Promise<{
  client: Client;
  history: CompletedHistoryItem[];
} | null> {
  const client = await getClientById(id);
  if (!client) return null;

  const sessions = await getAllSessionsRaw();
  const history = sessions
    .filter((s) => isClientHistory(s, id))
    .map(sessionToHistoryItem)
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
    .filter((s) => s.status === 'completed' || s.status === 'cancelled')
    .map(sessionToHistoryItem)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    name: client.name,
    surname: client.surname,
    soloRemaining: client.soloRemaining,
    splitRemaining: client.splitRemaining,
    onlineRemaining: client.onlineRemaining,
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
