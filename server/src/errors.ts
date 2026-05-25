export function mapApiError(err: unknown): {
  status: number;
  message: string;
  code: string;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  switch (msg) {
    case 'INSUFFICIENT_BALANCE':
      return { status: 400, message: 'Недостаточно тренировок в пакете', code: msg };
    case 'SESSION_NOT_FOUND':
      return { status: 404, message: 'Запись не найдена', code: msg };
    case 'SESSION_CANCELLED':
      return { status: 400, message: 'Запись отменена', code: msg };
    case 'SESSION_ALREADY_COMPLETED':
      return { status: 400, message: 'Тренировка уже проведена', code: msg };
    case 'CLIENT_NOT_FOUND':
      return { status: 404, message: 'Клиент не найден', code: msg };
    case 'DAY_OFF':
      return { status: 400, message: 'В этот день выходной', code: msg };
    case 'SESSION_NOT_CANCELLED':
      return { status: 400, message: 'Запись не отменена', code: msg };
    case 'SESSION_ALREADY_REASSIGNED':
      return {
        status: 400,
        message: 'На этот слот уже назначен другой клиент',
        code: msg,
      };
    case 'SLOT_OCCUPIED':
      return { status: 400, message: 'На это время уже есть запись', code: msg };
    case 'SLOT_NEEDS_REASSIGN':
      return {
        status: 400,
        message: 'Сначала переназначьте отменённую запись через карточку в календаре',
        code: msg,
      };
    case 'DAY_OFF_EXISTS':
      return { status: 400, message: 'На этот день выходной уже отмечен', code: msg };
    case 'CLIENT_IDS_REQUIRED':
      return { status: 400, message: 'Выберите хотя бы одного клиента', code: msg };
    case 'SINGLE_CLIENT_ONLY':
      return {
        status: 400,
        message: 'Для соло и сплит можно выбрать только одного клиента',
        code: msg,
      };
    case 'INVALID_GOOGLE_PRIVATE_KEY_FORMAT':
      return {
        status: 503,
        message:
          'Неверный формат GOOGLE_PRIVATE_KEY. На Render удобнее задать GOOGLE_SERVICE_ACCOUNT_JSON — весь JSON ключа одной строкой.',
        code: msg,
      };
  }

  if (
    lower.includes('err_ossl_unsupported') ||
    lower.includes('decoder routines') ||
    lower.includes('invalid_grant') ||
    lower.includes('jwt') ||
    lower.includes('private key') ||
    lower.includes('decoder') ||
    lower.includes('no key or keyfile')
  ) {
    return {
      status: 503,
      message:
        'Ошибка ключа Google. На Render задайте GOOGLE_SERVICE_ACCOUNT_JSON (весь JSON из Google Cloud) или исправьте GOOGLE_PRIVATE_KEY — только поле private_key, с \\n или реальными переносами.',
      code: 'GOOGLE_AUTH_ERROR',
    };
  }

  if (lower.includes('requested entity was not found') || lower.includes('not found')) {
    return {
      status: 503,
      message: 'Таблица не найдена. Проверьте SPREADSHEET_ID и доступ service account (Редактор).',
      code: 'SPREADSHEET_NOT_FOUND',
    };
  }

  if (lower.includes('permission') || lower.includes('forbidden') || lower.includes('403')) {
    return {
      status: 503,
      message:
        'Нет доступа к Google Таблице. Добавьте email service account как редактора.',
      code: 'GOOGLE_PERMISSION',
    };
  }

  return { status: 500, message: 'Внутренняя ошибка', code: 'INTERNAL' };
}
