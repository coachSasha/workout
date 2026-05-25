import type { Session } from '../types';

export function runningGroupPeers(sessions: Session[], session: Session): Session[] {
  if (!session.runningGroupId) return [session];
  return sessions.filter(
    (s) =>
      s.runningGroupId === session.runningGroupId &&
      s.startDatetime === session.startDatetime,
  );
}

export function isRunningGroup(session: Session): boolean {
  return session.workoutType === 'running' && !!session.runningGroupId;
}

/** Одна карточка в календаре на групповой бег */
export function calendarSessionGroups(sessions: Session[]): Session[][] {
  const used = new Set<string>();
  const groups: Session[][] = [];

  for (const s of sessions) {
    if (used.has(s.id)) continue;
    if (isRunningGroup(s)) {
      const peers = runningGroupPeers(sessions, s);
      peers.forEach((p) => used.add(p.id));
      groups.push(peers);
    } else {
      used.add(s.id);
      groups.push([s]);
    }
  }
  return groups;
}

export function groupTitle(members: Session[], isTrainer: boolean): string {
  const active = members.filter((m) => m.status === 'scheduled');
  const names = (active.length ? active : members)
    .map((m) => (isTrainer ? m.clientName : 'Участник'))
    .join(', ');
  const cancelled = members.filter((m) => m.status === 'cancelled').length;
  const suffix =
    members[0].status === 'cancelled' && members.every((m) => m.status === 'cancelled')
      ? ' · отменено'
      : cancelled > 0
        ? ` · ${cancelled} отмен.`
        : '';
  return `${names} · Бег${suffix}`;
}

export function groupStatusLabel(members: Session[]): string {
  const scheduled = members.filter((m) => m.status === 'scheduled').length;
  const completed = members.filter((m) => m.status === 'completed').length;
  const cancelled = members.filter((m) => m.status === 'cancelled').length;
  if (completed === members.length) return 'Проведена (все)';
  if (scheduled > 0) {
    return `Запланирована · ${scheduled} из ${members.length} придут`;
  }
  if (cancelled === members.length) return 'Отменена (все)';
  return `Частично отменена · ${scheduled} придут`;
}
