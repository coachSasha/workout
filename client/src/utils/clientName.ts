export function formatClientName(client: {
  name: string;
  surname?: string;
}): string {
  return [client.name, client.surname].filter(Boolean).join(' ').trim();
}
