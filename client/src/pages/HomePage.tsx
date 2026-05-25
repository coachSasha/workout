import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import type { RootState } from '../store';
import {
  useGetSessionsQuery,
  useGetClientsQuery,
  useCreateSessionMutation,
  useConfirmSessionMutation,
  useCancelSessionMutation,
} from '../api/baseApi';
import { SessionCalendar } from '../components/SessionCalendar';
import { Page, Card, PageTitle } from '../components/ui';
import styled from 'styled-components';

const Hint = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  margin: 0;
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

  const { data: sessions = [], isLoading } = useGetSessionsQuery({ from, to });
  const { data: clients = [] } = useGetClientsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createSession] = useCreateSessionMutation();
  const [confirmSession] = useConfirmSessionMutation();
  const [cancelSession] = useCancelSessionMutation();

  return (
    <Page>
      <Card>
        <PageTitle style={{ marginBottom: '0.5rem' }}>Календарь</PageTitle>
        <Hint>
          {isAuthenticated
            ? 'Выберите свободный слот для записи или кликните по записи для подтверждения / отмены.'
            : 'Войдите как тренер, чтобы назначать клиентов на время.'}
        </Hint>
        {isLoading ? (
          <p>Загрузка календаря…</p>
        ) : (
          <SessionCalendar
            sessions={sessions}
            clients={clients}
            isTrainer={isAuthenticated}
            onDateChange={setRangeDate}
            onCreate={async (data) => {
              await createSession(data).unwrap();
            }}
            onConfirm={async (id) => {
              await confirmSession(id).unwrap();
            }}
            onCancel={async (id) => {
              await cancelSession(id).unwrap();
            }}
          />
        )}
      </Card>
    </Page>
  );
}
