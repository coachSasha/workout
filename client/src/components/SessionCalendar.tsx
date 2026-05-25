import { useMemo, useState, useCallback, useEffect } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { Calendar, dateFnsLocalizer, type View, type SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styled from 'styled-components';
import type { Session, WorkoutType, Client } from '../types';
import { formatClientName } from '../utils/clientName';
import { WORKOUT_LABELS, WORKOUT_OPTIONS, statusLabel } from '../utils/workoutLabels';
import {
  ModalOverlay,
  ModalBox,
  ModalTitle,
  ModalActions,
  Button,
  Field,
  Label,
  Select,
  ErrorText,
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

const CalendarWrap = styled.div`
  height: 620px;
  margin-top: 1rem;

  @media (max-width: 768px) {
    height: calc(100vh - 220px);
    min-height: 420px;
  }

  .rbc-toolbar {
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .rbc-toolbar-label {
    font-size: 0.95rem;
  }
`;

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Session;
}

function eventColor(type: WorkoutType, status: string): string {
  const base =
    type === 'solo'
      ? theme.colors.solo
      : type === 'split'
        ? theme.colors.split
        : theme.colors.running;
  if (status === 'cancelled') return theme.colors.textMuted;
  if (status === 'completed') return theme.colors.success;
  return base;
}

interface Props {
  sessions: Session[];
  clients: Client[];
  isTrainer: boolean;
  onDateChange?: (date: Date) => void;
  onCreate: (data: {
    clientId: string;
    start: string;
    workoutType: WorkoutType;
  }) => Promise<void>;
  onConfirm: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

export function SessionCalendar({
  sessions,
  clients,
  isTrainer,
  onDateChange,
  onCreate,
  onConfirm,
  onCancel,
}: Props) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>(isMobile ? 'day' : 'week');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    setView(isMobile ? 'day' : 'week');
  }, [isMobile]);
  const [createSlot, setCreateSlot] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [clientId, setClientId] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('solo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const events: CalendarEvent[] = useMemo(
    () =>
      sessions.map((s) => ({
        id: s.id,
        title: `${s.clientName || 'Занято'} · ${WORKOUT_LABELS[s.workoutType]}`,
        start: new Date(s.startDatetime),
        end: new Date(s.endDatetime),
        resource: s,
      })),
    [sessions],
  );

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const s = event.resource;
    return {
      style: {
        backgroundColor: eventColor(s.workoutType, s.status),
        border: 'none',
        opacity: s.status === 'cancelled' ? 0.5 : 1,
      },
    };
  }, []);

  const handleSelectSlot = (slot: SlotInfo) => {
    if (!isTrainer) return;
    setCreateSlot(slot.start);
    setClientId(clients[0]?.id ?? '');
    setWorkoutType('solo');
    setError('');
    setSelected(null);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelected(event.resource);
    setCreateSlot(null);
    setError('');
  };

  const handleCreate = async () => {
    if (!createSlot || !clientId) return;
    setLoading(true);
    setError('');
    try {
      await onCreate({
        clientId,
        start: createSlot.toISOString(),
        workoutType,
      });
      setCreateSlot(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await onConfirm(selected.id);
      setSelected(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка подтверждения');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await onCancel(selected.id);
      setSelected(null);
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? 'Ошибка отмены');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalendarWrap>
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

      {createSlot && isTrainer && (
        <ModalOverlay onClick={() => setCreateSlot(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Новая запись</ModalTitle>
            <p style={{ margin: '0 0 1rem', color: theme.colors.textMuted }}>
              {format(createSlot, 'd MMMM yyyy, HH:mm', { locale: ru })}
            </p>
            <Field>
              <Label>Клиент</Label>
              <Select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatClientName(c)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Тип тренировки</Label>
              <Select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
              >
                {WORKOUT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <ModalActions>
              <Button $variant="ghost" onClick={() => setCreateSlot(null)} $block>
                Закрыть
              </Button>
              <Button onClick={handleCreate} disabled={loading || !clientId} $block>
                Сохранить
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      {selected && (
        <ModalOverlay onClick={() => setSelected(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              {selected.clientName} — {WORKOUT_LABELS[selected.workoutType]}
            </ModalTitle>
            <p style={{ margin: 0, color: theme.colors.textMuted }}>
              {format(new Date(selected.startDatetime), 'd MMMM yyyy, HH:mm', {
                locale: ru,
              })}
              <br />
              {statusLabel(selected.status)}
            </p>
            {error && <ErrorText>{error}</ErrorText>}
            <ModalActions>
              {isTrainer && selected.status === 'scheduled' && (
                <>
                  <Button
                    $variant="success"
                    onClick={handleConfirm}
                    disabled={loading}
                    $block
                  >
                    Подтвердить
                  </Button>
                  <Button
                    $variant="danger"
                    onClick={handleCancelSession}
                    disabled={loading}
                    $block
                  >
                    Отменить
                  </Button>
                </>
              )}
              <Button $variant="ghost" onClick={() => setSelected(null)} $block>
                Закрыть
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </CalendarWrap>
  );
}
