import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import type { RootState } from '../store';
import {
  useGetSessionsQuery,
  useGetClientsQuery,
  useGetDaysOffQuery,
  useCreateSessionMutation,
  useConfirmSessionMutation,
  useCancelSessionMutation,
  useReassignSessionMutation,
  useCreateDayOffMutation,
  useDeleteDayOffMutation,
} from '../api/baseApi';
import { SessionCalendar } from '../components/SessionCalendar';
import { Page, Card, PageTitle } from '../components/ui';
import styled from 'styled-components';

const Hint = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
  line-height: 1.5;
`;

export function HomePage() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [rangeDate, setRangeDate] = useState(new Date());

  const from = useMemo(
    () => startOfMonth(subMonths(rangeDate, 1)).toISOString(),
    [rangeDate],
  );
  const to = useMemo(
    () => endOfMonth(addMonths(rangeDate, 1)).toISOString(),
    [rangeDate],
  );

  const { data: sessions = [], isLoading: sessionsLoading } = useGetSessionsQuery({
    from,
    to,
  });
  const { data: daysOff = [], isLoading: daysOffLoading } = useGetDaysOffQuery({ from, to });
  const { data: clients = [] } = useGetClientsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createSession] = useCreateSessionMutation();
  const [confirmSession] = useConfirmSessionMutation();
  const [cancelSession] = useCancelSessionMutation();
  const [reassignSession] = useReassignSessionMutation();
  const [createDayOff] = useCreateDayOffMutation();
  const [deleteDayOff] = useDeleteDayOffMutation();

  const isLoading = sessionsLoading || daysOffLoading;

  return (
    <Page>
      <Card $overflowHidden>
        <PageTitle style={{ marginBottom: '0.35rem' }}>Календарь</PageTitle>
        <Hint>
          {isAuthenticated
            ? 'Свободный слот — запись клиента. Кнопка «Выходной» — день без тренировок. Серые полосы — выходные.'
            : 'Просмотр записей и выходных. Войдите как тренер, чтобы назначать клиентов.'}
        </Hint>
        {isLoading ? (
          <p>Загрузка календаря…</p>
        ) : (
          <SessionCalendar
            sessions={sessions}
            daysOff={daysOff}
            clients={clients}
            isTrainer={isAuthenticated}
            onDateChange={setRangeDate}
            onCreate={async (data) => {
              await createSession({
                clientIds: data.clientIds,
                start: data.start,
                workoutType: data.workoutType,
              }).unwrap();
            }}
            onConfirm={async (id) => {
              await confirmSession(id).unwrap();
            }}
            onCancel={async (id, deduct) => {
              await cancelSession({ id, deduct }).unwrap();
            }}
            onReassign={async (sessionId, data) => {
              await reassignSession({ id: sessionId, ...data }).unwrap();
            }}
            onAddDayOff={async (data) => {
              await createDayOff(data).unwrap();
            }}
            onRemoveDayOff={async (id) => {
              await deleteDayOff(id).unwrap();
            }}
          />
        )}
      </Card>
    </Page>
  );
}
