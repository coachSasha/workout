import type { WorkoutType } from '../types';

export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  solo: 'Соло',
  split: 'Сплит',
  running: 'Бег',
};

export const WORKOUT_OPTIONS: { value: WorkoutType; label: string }[] = [
  { value: 'solo', label: WORKOUT_LABELS.solo },
  { value: 'split', label: WORKOUT_LABELS.split },
  { value: 'running', label: WORKOUT_LABELS.running },
];

export function statusLabel(status: string, deducted?: boolean): string {
  switch (status) {
    case 'scheduled':
      return 'Запланировано';
    case 'completed':
      return 'Проведено';
    case 'cancelled':
      return deducted ? 'Отменено (списано)' : 'Отменено';
    default:
      return status;
  }
}
