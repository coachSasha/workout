import { google } from 'googleapis';
import { config } from '../src/config.js';

const auth = new google.auth.JWT({
  email: config.googleEmail,
  key: config.googlePrivateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: config.spreadsheetId });
console.log('Tabs:', meta.data.sheets?.map((s) => s.properties?.title));

for (const t of ['Clients', 'Sessions']) {
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${t}!A1:I1`,
  });
  console.log(`${t} row1:`, r.data.values?.[0] ?? '(empty)');
}
