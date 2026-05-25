import type { Client, WorkoutType } from '../types';

export function hasAnyPackage(client: Client): boolean {
  return (
    client.soloRemaining > 0 ||
    client.splitRemaining > 0 ||
    client.runningRemaining > 0
  );
}

export function balanceFor(client: Client, type: WorkoutType): number {
  switch (type) {
    case 'solo':
      return client.soloRemaining;
    case 'split':
      return client.splitRemaining;
    case 'running':
      return client.runningRemaining;
  }
}

export function availableWorkoutTypes(client: Client): WorkoutType[] {
  const types: WorkoutType[] = [];
  if (client.soloRemaining > 0) types.push('solo');
  if (client.splitRemaining > 0) types.push('split');
  if (client.runningRemaining > 0) types.push('running');
  return types;
}
