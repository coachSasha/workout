export type WorkoutType = 'solo' | 'split' | 'running';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

/** true = отмена со списанием из пакета */

export interface Client {
  id: string;
  name: string;
  surname: string;
  soloRemaining: number;
  splitRemaining: number;
  runningRemaining: number;
  shareToken: string;
  createdAt: string;
}

export interface Session {
  id: string;
  clientId: string;
  clientName: string;
  startDatetime: string;
  endDatetime: string;
  workoutType: WorkoutType;
  status: SessionStatus;
  deducted: boolean;
  /** отменённая запись уже переназначена другому клиенту */
  reassigned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DayOff {
  id: string;
  date: string;
  note: string;
  createdAt: string;
}

export type HistoryStatus = 'completed' | 'cancelled_deducted' | 'cancelled_free';

export interface CompletedHistoryItem {
  id: string;
  date: string;
  workoutType: WorkoutType;
  historyStatus: HistoryStatus;
}

export interface PublicClientView {
  name: string;
  surname: string;
  soloRemaining: number;
  splitRemaining: number;
  runningRemaining: number;
  upcoming: Session[];
  history: CompletedHistoryItem[];
}
