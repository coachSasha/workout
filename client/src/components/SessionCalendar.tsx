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
import { hasAnyPackage, availableWorkoutTypes } from '../utils/packages';
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
`;

export type CalendarResource =
  | { kind: 'session'; session: Session }
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
  const s = resource.session;
  const base =
    s.workoutType === 'solo'
      ? theme.colors.solo
      : s.workoutType === 'split'
        ? theme.colors.split
        : theme.colors.running;
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
    clientId: string;
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
  const [workoutType, setWorkoutType] = useState<WorkoutType>('solo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const activeClientId = reassignMode ? clientId : clientId;
  const workoutOptions = useMemo(() => {
    const c = clients.find((x) => x.id === activeClientId);
    if (!c) return [];
    const available = availableWorkoutTypes(c);
    return WORKOUT_OPTIONS.filter((o) => available.includes(o.value));
  }, [clients, activeClientId]);

  useEffect(() => {
    if (workoutOptions.length > 0 && !workoutOptions.some((o) => o.value === workoutType)) {
      setWorkoutType(workoutOptions[0].value);
    }
  }, [workoutOptions, workoutType]);

  const openAssignModal = (slot: Date, forReassign?: Session) => {
    setCreateSlot(slot);
    setReassignMode(forReassign ?? null);
    const list = eligibleClients;
    const first = list[0];
    setClientId(first?.id ?? '');
    if (first) {
      const types = availableWorkoutTypes(first);
      setWorkoutType(types[0] ?? 'solo');
    }
    setError('');
    setSelected(null);
  };

  const events: CalendarEvent[] = useMemo(() => {
    const sessionEvents: CalendarEvent[] = sessions.map((s) => {
      const status =
        s.status === 'cancelled'
          ? s.deducted
            ? ' · отменено, списано'
            : ' · отменено'
          : '';
      return {
        id: s.id,
        title: `${s.clientName || 'Занято'} · ${WORKOUT_LABELS[s.workoutType]}${status}`,
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
          event.resource.kind === 'session' &&
          event.resource.session.status === 'cancelled'
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
    const pendingCancel = atSlot.find((s) => s.status === 'cancelled' && !s.reassigned);
    if (pendingCancel) {
      setError('Сначала переназначьте отменённую запись (клик по серой полосе в календаре)');
      setSelected({ kind: 'session', session: pendingCancel });
      return;
    }
    openAssignModal(slot.start);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelected(event.resource);
    setCreateSlot(null);
    setReassignMode(null);
    setError('');
  };

  const handleClientChange = (id: string) => {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) {
      const types = availableWorkoutTypes(c);
      if (types.length) setWorkoutType(types[0]);
    }
  };

  const handleSaveAssign = async () => {
    if (!clientId || !workoutOptions.length) return;
    setLoading(true);
    setError('');
    try {
      if (reassignMode) {
        await onReassign(reassignMode.id, { clientId, workoutType });
      } else if (createSlot) {
        await onCreate({
          clientId,
          start: createSlot.toISOString(),
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

  const handleConfirm = async () => {
    if (!selected || selected.kind !== 'session') return;
    setLoading(true);
    setError('');
    try {
      await onConfirm(selected.session.id);
      setSelected(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка подтверждения');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (deduct: boolean) => {
    if (!selected || selected.kind !== 'session') return;
    setLoading(true);
    setError('');
    try {
      await onCancel(selected.session.id, deduct);
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
          localizer={localizer}
          culture="ru"
          events={events}
          view={view}
          onView={setView}
          date={date}
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
            agenda: 'Повестка',
            noEventsInRange: 'Нет записей',
          }}
          step={60}
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
                  <Label>Клиент</Label>
                  <Select
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                  >
                    {eligibleClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {formatClientName(c)} (С:{c.soloRemaining} П:{c.splitRemaining}{' '}
                        Б:{c.runningRemaining})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <Label>Тип тренировки</Label>
                  <Select
                    value={workoutType}
                    onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
                    disabled={workoutOptions.length === 0}
                  >
                    {workoutOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
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
                  loading || !clientId || !workoutOptions.length
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
                  <Button $variant="success" onClick={handleConfirm} disabled={loading} $block>
                    Подтвердить (списать)
                  </Button>
                  <Button
                    $variant="danger"
                    onClick={() => handleCancel(true)}
                    disabled={loading}
                    $block
                  >
                    Отменить со списанием
                  </Button>
                  <Button
                    $variant="secondary"
                    onClick={() => handleCancel(false)}
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
              <Button $variant="ghost" onClick={() => setSelected(null)} $block>
                Закрыть
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

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
