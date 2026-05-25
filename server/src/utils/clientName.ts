import type { Client } from '../types.js';

export function formatClientName(client: Pick<Client, 'name' | 'surname'>): string {
  return [client.name, client.surname].filter(Boolean).join(' ').trim();
}
