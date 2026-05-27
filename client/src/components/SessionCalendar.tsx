import { useMemo, useState, useCallback, useEffect } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Calendar, dateFnsLocalizer, type View, type SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styled from 'styled-components';
import type { Session, WorkoutType, Client, DayOff } from '../types';
import { formatClientName } from '../utils/clientName';
import { WORKOUT_LABELS, WORKOUT_OPTIONS, statusLabel } from '../utils/workoutLabels';
import { hasAnyPackage, clientsWithBalance, balanceFor } from '../utils/packages';
import {
  calendarSessionGroups,
  groupTitle,
  groupStatusLabel,
  isRunningGroup,
  shortClientName,
} from '../utils/sessionGroups';
import {
  ModalOverlay,
  ModalBox,
  ModalTitle,
  ModalActions,
  Button,
  Field,
  Label,
  Select,
  Input,
  ErrorText,
  ToolbarRow,
} from './ui';
import { MultiSelect } from './MultiSelect';
import { SingleSelect } from './SingleSelect';
import { ConfirmModal } from './ConfirmModal';
import { theme } from '../theme';

const locales = { ru };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const CalendarShell = styled.div<{ $hasAllDay: boolean }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  height: ${({ $hasAllDay }) => ($hasAllDay ? '700px' : '640px')};
  margin-top: 0.5rem;

  @media (max-width: 768px) {
    height: ${({ $hasAllDay }) =>
      $hasAllDay ? 'min(580px, calc(100vh - 220px))' : 'min(540px, calc(100vh - 240px))'};
    min-height: 380px;
  }
`;

const ToolbarSlot = styled.div`
  flex-shrink: 0;
`;

const ParticipantRow = styled.div`
  padding: 0.65rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const CalendarBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  width: 100%;

  .rbc-calendar {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .rbc-time-view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .rbc-time-header {
    flex-shrink: 0;
  }

  .rbc-time-header-content > .rbc-row.rbc-row-gutter {
    max-height: 40px;
  }

  .rbc-allday-cell {
    max-height: 40px !important;
    overflow: hidden !important;
  }

  .rbc-row-content .rbc-row:not(:last-child) {
    max-height: 22px;
    overflow: hidden;
  }

  .rbc-time-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    touch-action: manipulation;
    -webkit-overflow-scrolling: touch;
  }

  .rbc-time-slot,
  .rbc-day-slot,
  .rbc-timeslot-group {
    touch-action: manipulation;
  }

  /* Клики по пустому слоту проходят сквозь слой событий (важно на мобильных) */
  .rbc-events-container {
    pointer-events: none;
  }

  .rbc-event,
  .rbc-background-event {
    pointer-events: auto;
  }

  /* Гость: нельзя кликать по занятым ячейкам/событиям */
  .guest-calendar .rbc-event,
  .guest-calendar .rbc-background-event {
    pointer-events: none !important;
    cursor: default !important;
  }

  @media (max-width: 768px) {
    .rbc-timeslot-group {
      min-height: 52px;
    }
  }

  .rbc-time-view,
  .rbc-month-view {
    max-width: 100%;
    border-radius: ${({ theme }) => theme.radiusLg};
  }

  .rbc-toolbar {
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .rbc-toolbar-label {
    font-size: 0.95rem;
  }

  /* Подсветка: любой день-выходной красим целиком */
  .dayoff-day {
    background-color: ${({ theme }) => theme.colors.danger}1a !important;
  }

  .rbc-time-view .rbc-day-slot.dayoff-day {
    background-color: ${({ theme }) => theme.colors.danger}1a !important;
  }

  .rbc-time-view .rbc-day-slot.dayoff-day .rbc-time-slot {
    background-color: transparent !important;
  }
`;

export type CalendarResource =
  | { kind: 'session'; session: Session }
  | { kind: 'runningGroup'; members: Session[] }
  | { kind: 'dayoff'; dayOff: DayOff };

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: CalendarResource;
}

function eventColor(resource: CalendarResource): string {
  if (resource.kind === 'dayoff') return theme.colors.dayOff;
  const s = resource.kind === 'session' ? resource.session : resource.members[0];
  const base =
    s.workoutType === 'solo'
      ? theme.colors.solo
      : s.workoutType === 'split'
        ? theme.colors.split
        : s.workoutType === 'online'
          ? theme.colors.online
          : theme.colors.running;
  if (resource.kind === 'runningGroup') {
    if (resource.members.every((m) => m.status === 'cancelled')) return theme.colors.textMuted;
    if (resource.members.every((m) => m.status === 'completed')) return theme.colors.success;
    return base;
  }
  if (s.status === 'cancelled') return theme.colors.textMuted;
  if (s.status === 'completed') return theme.colors.success;
  return base;
}

function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function sessionAtSlot(sessions: Session[], slotStart: Date): Session[] {
  const t = slotStart.getTime();
  return sessions.filter((s) => new Date(s.startDatetime).getTime() === t);
}

interface Props {
  sessions: Session[];
  daysOff: DayOff[];
  clients: Client[];
  isTrainer: boolean;
  onDateChange?: (date: Date) => void;
  onCreate: (data: {
    clientIds: string[];
    start: string;
    workoutType: WorkoutType;
  }) => Promise<void>;
  onConfirm: (id: string) => Promise<void>;
  onCancel: (id: string, deduct: boolean) => Promise<void>;
  onReassign: (
    sessionId: string,
    data: { clientId: string; workoutType: WorkoutType },
  ) => Promise<void>;
  onAddDayOff: (data: { date: string; note?: string }) => Promise<void>;
  onRemoveDayOff: (id: string) => Promise<void>;
  onDeleteSession: (id: string, scope: 'one' | 'running_group') => Promise<void>;
}

export function SessionCalendar({
  sessions,
  daysOff,
  clients,
  isTrainer,
  onDateChange,
  onCreate,
  onConfirm,
  onCancel,
  onReassign,
  onAddDayOff,
  onRemoveDayOff,
  onDeleteSession,
}: Props) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>(isMobile ? 'day' : 'week');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    setView(isMobile ? 'day' : 'week');
  }, [isMobile]);

  const dayOffSet = useMemo(() => new Set(daysOff.map((d) => d.date)), [daysOff]);
  const hasAllDay = daysOff.length > 0;

  const eligibleClients = useMemo(
    () => clients.filter(hasAnyPackage),
    [clients],
  );

  const [createSlot, setCreateSlot] = useState<Date | null>(null);
  const [reassignMode, setReassignMode] = useState<Session | null>(null);
  const [selected, setSelected] = useState<CalendarResource | null>(null);
  const [dayOffModal, setDayOffModal] = useState(false);
  const [dayOffDate, setDayOffDate] = useState('');
  const [dayOffNote, setDayOffNote] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [workoutType, setWorkoutType] = useState<WorkoutType | ''>('');
  const [runningTime, setRunningTime] = useState<'09:30' | '19:30'>('09:30');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    sessionId: string;
    scope: 'one' | 'running_group';
    message: string;
  } | null>(null);

  const workoutTypesAvailable = useMemo(() => {
    const types: WorkoutType[] = [];
    if (eligibleClients.some((c) => c.soloRemaining > 0)) types.push('solo');
    if (eligibleClients.some((c) => c.splitRemaining > 0)) types.push('split');
    if (eligibleClients.some((c) => c.onlineRemaining > 0)) types.push('online');
    if (eligibleClients.some((c) => c.runningRemaining > 0)) types.push('running');
    return WORKOUT_OPTIONS.filter((o) => types.includes(o.value));
  }, [eligibleClients]);

  const clientsForType = useMemo(() => {
    if (!workoutType) return [];
    return clientsWithBalance(eligibleClients, workoutType);
  }, [eligibleClients, workoutType]);

  const openAssignModal = (slot: Date, forReassign?: Session) => {
    setCreateSlot(slot);
    setReassignMode(forReassign ?? null);
    if (forReassign) {
      setWorkoutType(forReassign.workoutType);
      setClientId('');
      setClientIds([]);
    } else {
      setWorkoutType('');
      setClientId('');
      setClientIds([]);
    }
    setRunningTime('09:30');
    setError('');
    setSelected(null);
  };

  const events: CalendarEvent[] = useMemo(() => {
    const sessionEvents: CalendarEvent[] = calendarSessionGroups(sessions).map((members) => {
      const primary = members[0];
      if (isRunningGroup(primary)) {
        return {
          id: `rg-${primary.runningGroupId}`,
          title: groupTitle(members, isTrainer),
          start: new Date(primary.startDatetime),
          end: new Date(primary.endDatetime),
          resource: { kind: 'runningGroup' as const, members },
        };
      }
      const s = primary;
      const status =
        s.status === 'cancelled'
          ? s.deducted
            ? ' · отменено, списано'
            : ' · отменено'
          : '';
      return {
        id: s.id,
        title: `${shortClientName(s.clientName || 'Занято') || 'Занято'} · ${WORKOUT_LABELS[s.workoutType]}${status}`,
        start: new Date(s.startDatetime),
        end: new Date(s.endDatetime),
        resource: { kind: 'session' as const, session: s },
      };
    });

    const offEvents: CalendarEvent[] = daysOff.map((d) => {
      const day = parseISO(d.date);
      return {
        id: `dayoff-${d.id}`,
        title: d.note ? `Выходной` : 'Выходной',
        start: startOfDay(day),
        end: endOfDay(day),
        allDay: true,
        resource: { kind: 'dayoff' as const, dayOff: d },
      };
    });

    return [...offEvents, ...sessionEvents];
  }, [sessions, daysOff]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const color = eventColor(event.resource);
    const isDayOff = event.resource.kind === 'dayoff';
    return {
      style: {
        backgroundColor: color,
        border: 'none',
        opacity:
          (event.resource.kind === 'session' &&
            event.resource.session.status === 'cancelled') ||
          (event.resource.kind === 'runningGroup' &&
            event.resource.members.every((m) => m.status === 'cancelled'))
            ? 0.55
            : 1,
        backgroundImage: isDayOff
          ? 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255,255,255,.3) 3px, rgba(255,255,255,.3) 6px)'
          : undefined,
        fontSize: isDayOff ? '0.75rem' : undefined,
      },
    };
  }, []);

  const openDayOffModal = (forDate?: Date) => {
    const d = forDate ?? date;
    setDayOffDate(toDateKey(d));
    setDayOffNote('');
    setError('');
    setDayOffModal(true);
    setCreateSlot(null);
    setReassignMode(null);
    setSelected(null);
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    if (!isTrainer) return;
    if (dayOffSet.has(toDateKey(slot.start))) {
      setError('В этот день выходной');
      const off = daysOff.find((d) => d.date === toDateKey(slot.start));
      if (off) setSelected({ kind: 'dayoff', dayOff: off });
      return;
    }
    const atSlot = sessionAtSlot(sessions, slot.start);
    if (atSlot.some((s) => s.status === 'scheduled')) {
      setError('На это время уже есть запись');
      return;
    }
    const soloPending = atSlot.find(
      (s) => s.workoutType !== 'running' && s.status === 'cancelled' && !s.reassigned,
    );
    if (soloPending) {
      setError('Сначала переназначьте отменённую запись (клик по серой полосе в календаре)');
      setSelected({ kind: 'session', session: soloPending });
      return;
    }
    const runningGroupIds = [
      ...new Set(
        atSlot
          .filter((s) => s.workoutType === 'running' && s.runningGroupId)
          .map((s) => s.runningGroupId),
      ),
    ];
    for (const gid of runningGroupIds) {
      const group = atSlot.filter((s) => s.runningGroupId === gid);
      const allCancelled = group.every((s) => s.status === 'cancelled');
      const needsReassign = group.some((s) => !s.reassigned);
      if (allCancelled && needsReassign) {
        setError('Сначала переназначьте отменённую групповую запись');
        setSelected({ kind: 'runningGroup', members: group });
        return;
      }
    }
    openAssignModal(slot.start);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (!isTrainer) return;
    setSelected(event.resource);
    setCreateSlot(null);
    setReassignMode(null);
    setError('');
  };

  const handleWorkoutTypeChange = (type: WorkoutType) => {
    setWorkoutType(type);
    setClientId('');
    setClientIds([]);
    if (type === 'running') setRunningTime('09:30');
  };

  const runningStartForDate = (base: Date, time: '09:30' | '19:30'): Date => {
    const d = new Date(base);
    if (time === '09:30') {
      d.setHours(9, 30, 0, 0);
    } else {
      d.setHours(19, 30, 0, 0);
    }
    return d;
  };

  const durationMinutesFor = (type: WorkoutType): number => {
    return type === 'running' ? 90 : 60;
  };

  const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean => {
    return aStart < bEnd && bStart < aEnd;
  };

  const handleSaveAssign = async () => {
    if (!workoutType) return;
    const ids =
      workoutType === 'running' ? clientIds : clientId ? [clientId] : [];
    if (!ids.length) return;
    setLoading(true);
    setError('');
    try {
      if (reassignMode) {
        await onReassign(reassignMode.id, { clientId: ids[0], workoutType });
      } else if (createSlot) {
        const startDate =
          workoutType === 'running'
            ? runningStartForDate(createSlot, runningTime)
            : createSlot;
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + durationMinutesFor(workoutType));

        const startMs = startDate.getTime();
        const endMs = endDate.getTime();

        const blocking = sessions.find((s) => {
          const sStart = new Date(s.startDatetime).getTime();
          const sEnd = new Date(s.endDatetime).getTime();
          if (!overlaps(startMs, endMs, sStart, sEnd)) return false;
          if (s.status === 'scheduled') return true;
          if (s.status === 'cancelled' && !s.reassigned) return true;
          return false;
        });

        if (blocking) {
          if (blocking.status === 'cancelled' && !blocking.reassigned) {
            setError('Сначала переназначьте отменённую запись, которая пересекается по времени');
          } else {
            setError('Это время пересекается с уже существующей записью');
          }
          return;
        }

        await onCreate({
          clientIds: ids,
          start: startDate.toISOString(),
          workoutType,
        });
      }
      setCreateSlot(null);
      setReassignMode(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const closeAssignModal = () => {
    setCreateSlot(null);
    setReassignMode(null);
    setError('');
  };

  const handleConfirm = async (sessionId: string) => {
    setLoading(true);
    setError('');
    try {
      await onConfirm(sessionId);
      setSelected(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка подтверждения');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (sessionId: string, deduct: boolean) => {
    setLoading(true);
    setError('');
    try {
      await onCancel(sessionId, deduct);
      setSelected(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка отмены');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDayOff = async () => {
    if (!dayOffDate) return;
    const start = startOfDay(parseISO(dayOffDate)).getTime();
    const end = endOfDay(parseISO(dayOffDate)).getTime();
    const hasScheduled = sessions.some((s) => {
      if (s.status !== 'scheduled') return false;
      const t = new Date(s.startDatetime).getTime();
      return t >= start && t <= end;
    });
    if (hasScheduled) {
      setError('На этот день уже есть запланированные тренировки');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAddDayOff({ date: dayOffDate, note: dayOffNote || undefined });
      setDayOffModal(false);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Не удалось добавить выходной');
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteSession = (
    sessionId: string,
    scope: 'one' | 'running_group',
    message: string,
  ) => {
    setDeleteConfirm({ sessionId, scope, message });
  };

  const confirmDeleteSession = async () => {
    if (!deleteConfirm) return;
    const { sessionId, scope } = deleteConfirm;
    setLoading(true);
    setError('');
    try {
      await onDeleteSession(sessionId, scope);
      setDeleteConfirm(null);
      setSelected(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Не удалось удалить');
      setDeleteConfirm(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDayOff = async () => {
    if (!selected || selected.kind !== 'dayoff') return;
    const removedId = selected.dayOff.id;
    setLoading(true);
    setError('');
    try {
      await onRemoveDayOff(removedId);
      setSelected(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const showAssignModal = (createSlot || reassignMode) && isTrainer;

  return (
    <CalendarShell $hasAllDay={hasAllDay}>
      {isTrainer && (
        <ToolbarSlot>
          <ToolbarRow>
            <Button $variant="secondary" type="button" onClick={() => openDayOffModal()}>
              + Выходной
            </Button>
          </ToolbarRow>
        </ToolbarSlot>
      )}

      <CalendarBody>
        <Calendar
          className={!isTrainer ? 'guest-calendar' : undefined}
          localizer={localizer}
          culture="ru"
          events={events}
          view={view}
          onView={setView}
          views={{ week: true, day: true, month: true }}
          date={date}
            dayPropGetter={(d) =>
              dayOffSet.has(toDateKey(d)) ? { className: 'dayoff-day' } : {}
            }
            slotPropGetter={(d) =>
              dayOffSet.has(toDateKey(d)) ? { className: 'dayoff-day' } : {}
            }
          onNavigate={(d) => {
            setDate(d);
            onDateChange?.(d);
          }}
          selectable={isTrainer}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          messages={{
            next: 'Вперёд',
            previous: 'Назад',
            today: 'Сегодня',
            month: 'Месяц',
            week: 'Неделя',
            day: 'День',
            noEventsInRange: 'Нет записей',
          }}
          step={30}
          timeslots={1}
          min={new Date(1970, 0, 1, 6, 0)}
          max={new Date(1970, 0, 1, 22, 0)}
          defaultView="week"
        />
      </CalendarBody>

      {dayOffModal && isTrainer && (
        <ModalOverlay onClick={() => setDayOffModal(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Выходной на день</ModalTitle>
            <Field>
              <Label>Дата</Label>
              <Input
                type="date"
                value={dayOffDate}
                onChange={(e) => setDayOffDate(e.target.value)}
              />
            </Field>
            <Field>
              <Label>Заметка (необязательно)</Label>
              <Input
                value={dayOffNote}
                onChange={(e) => setDayOffNote(e.target.value)}
                placeholder="Отпуск, праздник…"
              />
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <ModalActions>
              <Button $variant="ghost" onClick={() => setDayOffModal(false)} $block>
                Отмена
              </Button>
              <Button onClick={handleAddDayOff} disabled={loading || !dayOffDate} $block>
                Сохранить
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      {showAssignModal && (
        <ModalOverlay onClick={closeAssignModal}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {reassignMode ? 'Назначить другого клиента' : 'Новая запись'}
            </ModalTitle>
            <p style={{ margin: '0 0 1rem', color: theme.colors.textMuted }}>
              {format(
                new Date(reassignMode?.startDatetime ?? createSlot!.toISOString()),
                'd MMMM yyyy, HH:mm',
                { locale: ru },
              )}
            </p>
            {eligibleClients.length === 0 ? (
              <p style={{ color: theme.colors.textMuted }}>
                Нет клиентов с купленными тренировками.
              </p>
            ) : (
              <>
                <Field>
                  <Label>Тип тренировки</Label>
                  <Select
                    value={workoutType}
                    onChange={(e) =>
                      handleWorkoutTypeChange(e.target.value as WorkoutType)
                    }
                    disabled={reassignMode !== null}
                  >
                    <option value="">— выберите тип —</option>
                    {workoutTypesAvailable.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {workoutType === 'running' && reassignMode === null && (
                  <Field>
                    <Label>Время бега</Label>
                    <Select
                      value={runningTime}
                      onChange={(e) => setRunningTime(e.target.value as '09:30' | '19:30')}
                    >
                      <option value="09:30">09:30</option>
                      <option value="19:30">19:30</option>
                    </Select>
                  </Field>
                )}
                <Field>
                  <Label>
                    {workoutType === 'running' ? 'Клиенты' : 'Клиент'}
                  </Label>
                  {!workoutType ? (
                    <Select disabled value="">
                      <option value="">Сначала выберите тип тренировки</option>
                    </Select>
                  ) : workoutType === 'running' ? (
                    <MultiSelect
                      value={clientIds}
                      onChange={setClientIds}
                      disabled={clientsForType.length === 0}
                      placeholder="— выберите клиентов —"
                      options={clientsForType.map((c) => ({
                        value: c.id,
                        label: `${formatClientName(c)} (бег: ${c.runningRemaining})`,
                      }))}
                    />
                  ) : (
                    <SingleSelect
                      value={clientId}
                      onChange={setClientId}
                      disabled={clientsForType.length === 0}
                      placeholder="— выберите клиента —"
                      options={clientsForType.map((c) => ({
                        value: c.id,
                        label: `${formatClientName(c)} (остаток: ${workoutType ? balanceFor(c, workoutType) : 0})`,
                      }))}
                    />
                  )}
                </Field>
              </>
            )}
            {error && <ErrorText>{error}</ErrorText>}
            <ModalActions>
              <Button $variant="ghost" onClick={closeAssignModal} $block>
                Закрыть
              </Button>
              <Button
                onClick={handleSaveAssign}
                disabled={
                  loading ||
                  !workoutType ||
                  (workoutType === 'running'
                    ? clientIds.length === 0
                    : !clientId)
                }
                $block
              >
                Сохранить
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      {selected?.kind === 'session' && (
        <ModalOverlay onClick={() => setSelected(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {selected.session.clientName} — {WORKOUT_LABELS[selected.session.workoutType]}
            </ModalTitle>
            <p style={{ margin: 0, color: theme.colors.textMuted }}>
              {format(new Date(selected.session.startDatetime), 'd MMMM yyyy, HH:mm', {
                locale: ru,
              })}
              <br />
              {statusLabel(selected.session.status, selected.session.deducted)}
            </p>
            {error && <ErrorText>{error}</ErrorText>}
            <ModalActions $stacked>
              {isTrainer && selected.session.status === 'scheduled' && (
                <>
                  <Button
                    $variant="success"
                    onClick={() => handleConfirm(selected.session.id)}
                    disabled={loading}
                    $block
                  >
                    Подтвердить (списать)
                  </Button>
                  <Button
                    $variant="danger"
                    onClick={() => handleCancel(selected.session.id, true)}
                    disabled={loading}
                    $block
                  >
                    Отменить со списанием
                  </Button>
                  <Button
                    $variant="secondary"
                    onClick={() => handleCancel(selected.session.id, false)}
                    disabled={loading}
                    $block
                  >
                    Отменить без списания
                  </Button>
                </>
              )}
              {isTrainer &&
                selected.session.status === 'cancelled' &&
                !selected.session.reassigned && (
                  <Button
                    onClick={() =>
                      openAssignModal(
                        new Date(selected.session.startDatetime),
                        selected.session,
                      )
                    }
                    $block
                  >
                    Назначить другого клиента
                  </Button>
                )}
              {isTrainer &&
                selected.session.status === 'cancelled' &&
                selected.session.reassigned && (
                  <p style={{ margin: 0, color: theme.colors.textMuted, fontSize: '0.9rem' }}>
                    На этот слот уже назначен другой клиент.
                  </p>
                )}
              {isTrainer && (
                <Button
                  $variant="danger"
                  onClick={() =>
                    requestDeleteSession(
                      selected.session.id,
                      'one',
                      'Запись будет удалена безвозвратно. Остатки пакетов не изменятся.',
                    )
                  }
                  disabled={loading}
                  $block
                >
                  Удалить запись
                </Button>
              )}
              <Button $variant="ghost" onClick={() => setSelected(null)} $block>
                Закрыть
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      {selected?.kind === 'runningGroup' && (
        <ModalOverlay onClick={() => setSelected(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Бег — группа</ModalTitle>
            <p style={{ margin: 0, color: theme.colors.textMuted }}>
              {format(new Date(selected.members[0].startDatetime), 'd MMMM yyyy, HH:mm', {
                locale: ru,
              })}
              <br />
              {groupStatusLabel(selected.members)}
            </p>
            {selected.members.map((m) => (
              <ParticipantRow key={m.id}>
                <strong>{m.clientName}</strong>
                <br />
                <span style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>
                  {statusLabel(m.status, m.deducted)}
                </span>
                {isTrainer && (
                  <ModalActions $stacked style={{ marginTop: '0.5rem' }}>
                    {m.status === 'scheduled' && (
                      <>
                        <Button
                          $variant="danger"
                          onClick={() => handleCancel(m.id, true)}
                          disabled={loading}
                          $block
                        >
                          {m.clientName}: отменить со списанием
                        </Button>
                        <Button
                          $variant="secondary"
                          onClick={() => handleCancel(m.id, false)}
                          disabled={loading}
                          $block
                        >
                          {m.clientName}: отменить без списания
                        </Button>
                      </>
                    )}
                    <Button
                      $variant="ghost"
                      onClick={() =>
                        requestDeleteSession(
                          m.id,
                          'one',
                          `Запись ${m.clientName} будет удалена безвозвратно.`,
                        )
                      }
                      disabled={loading}
                      $block
                    >
                      Удалить {m.clientName} из слота
                    </Button>
                  </ModalActions>
                )}
              </ParticipantRow>
            ))}
            {error && <ErrorText>{error}</ErrorText>}
            <ModalActions $stacked>
              {isTrainer &&
                selected.members.some((m) => m.status === 'scheduled') && (
                  <Button
                    $variant="success"
                    onClick={() =>
                      handleConfirm(
                        selected.members.find((m) => m.status === 'scheduled')?.id ??
                          selected.members[0].id,
                      )
                    }
                    disabled={loading}
                    $block
                  >
                    Подтвердить всех пришедших (списать с каждого)
                  </Button>
                )}
              {isTrainer &&
                selected.members.every((m) => m.status === 'cancelled') &&
                selected.members.some((m) => !m.reassigned) && (
                  <Button
                    onClick={() =>
                      openAssignModal(
                        new Date(selected.members[0].startDatetime),
                        selected.members[0],
                      )
                    }
                    $block
                  >
                    Назначить на слот заново
                  </Button>
                )}
              {isTrainer && (
                <Button
                  $variant="danger"
                  onClick={() =>
                    requestDeleteSession(
                      selected.members[0].id,
                      'running_group',
                      'Будут удалены все участники групповой записи безвозвратно.',
                    )
                  }
                  disabled={loading}
                  $block
                >
                  Удалить всю запись (всех участников)
                </Button>
              )}
              <Button $variant="ghost" onClick={() => setSelected(null)} $block>
                Закрыть
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      <ConfirmModal
        open={deleteConfirm !== null}
        title="Удалить запись?"
        danger
        loading={loading}
        confirmLabel="Удалить"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteSession}
      >
        {deleteConfirm && (
          <p style={{ margin: 0, color: theme.colors.textMuted }}>{deleteConfirm.message}</p>
        )}
      </ConfirmModal>

      {selected?.kind === 'dayoff' && isTrainer && (
        <ModalOverlay onClick={() => setSelected(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Выходной</ModalTitle>
            <p style={{ margin: 0, color: theme.colors.textMuted }}>
              {format(parseISO(selected.dayOff.date), 'd MMMM yyyy', { locale: ru })}
              {selected.dayOff.note && (
                <>
                  <br />
                  {selected.dayOff.note}
                </>
              )}
            </p>
            {error && <ErrorText>{error}</ErrorText>}
            <ModalActions>
              <Button $variant="danger" onClick={handleRemoveDayOff} disabled={loading} $block>
                Убрать выходной
              </Button>
              <Button $variant="ghost" onClick={() => setSelected(null)} $block>
                Закрыть
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </CalendarShell>
  );
}
