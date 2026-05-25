export type WorkoutType = 'solo' | 'split' | 'running';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

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
  createdAt: string;
  updatedAt: string;
}

export interface CompletedHistoryItem {
  id: string;
  date: string;
  workoutType: WorkoutType;
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
