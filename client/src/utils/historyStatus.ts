import type { HistoryStatus } from '../types';

export const HISTORY_STATUS_LABELS: Record<HistoryStatus, string> = {
  completed: 'Проведена',
  cancelled_deducted: 'Отменена со списанием',
  cancelled_free: 'Отменена без списания',
};

export function historyStatusLabel(status: HistoryStatus): string {
  return HISTORY_STATUS_LABELS[status];
}
