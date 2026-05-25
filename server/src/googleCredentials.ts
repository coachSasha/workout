import { createPrivateKey } from 'crypto';

export interface GoogleServiceAccountCreds {
  email: string;
  privateKey: string;
}

/** PEM для OpenSSL 3 / Node на Render */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim().replace(/^\uFEFF/, '');
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Весь JSON service account в одной переменной
  if (key.startsWith('{')) {
    try {
      const json = JSON.parse(key) as { private_key?: string };
      if (json.private_key) {
        key = json.private_key;
      }
    } catch {
      /* не JSON — продолжаем как PEM */
    }
  }

  key = key.replace(/\r/g, '');
  while (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  if (!key.includes('\n') && key.includes('-----BEGIN')) {
    key = key
      .replace(/-----BEGIN ([A-Z ]+)-----/, '-----BEGIN $1-----\n')
      .replace(/-----END ([A-Z ]+)-----/, '\n-----END $1-----');
  }

  return key.trim();
}

function assertPrivateKeyParsable(key: string): void {
  try {
    createPrivateKey(key);
  } catch {
    throw new Error('INVALID_GOOGLE_PRIVATE_KEY_FORMAT');
  }
}

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

export function loadGoogleCredentials(): GoogleServiceAccountCreds {
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    const json = JSON.parse(jsonEnv) as {
      client_email?: string;
      private_key?: string;
    };
    if (!json.client_email || !json.private_key) {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key',
      );
    }
    const privateKey = normalizePrivateKey(json.private_key);
    assertPrivateKeyParsable(privateKey);
    return { email: json.client_email, privateKey };
  }

  const email = requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = normalizePrivateKey(requiredEnv('GOOGLE_PRIVATE_KEY'));
  assertPrivateKeyParsable(privateKey);
  return { email, privateKey };
}
