import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useGetPublicClientQuery } from '../api/baseApi';
import { formatClientName } from '../utils/clientName';
import { WORKOUT_LABELS } from '../utils/workoutLabels';
import { Page, Card, Table, TableWrap, PageTitle } from '../components/ui';
import styled from 'styled-components';
import { theme } from '../theme';

const Balances = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const BalanceItem = styled.div`
  background: ${({ theme }) => theme.colors.bg};
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-align: center;
`;

export function PublicClientPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { data, isLoading, isError } = useGetPublicClientQuery(shareToken!, {
    skip: !shareToken,
  });

  if (isLoading) {
    return (
      <Page>
        <p>Загрузка…</p>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Card>
          <PageTitle>Ссылка недействительна</PageTitle>
          <p style={{ color: theme.colors.textMuted }}>
            Обратитесь к тренеру за новой ссылкой.
          </p>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageTitle>Привет, {formatClientName(data)}!</PageTitle>

      <Card>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Осталось тренировок</h2>
        <Balances>
          <BalanceItem>
            <div style={{ color: theme.colors.textMuted }}>Соло</div>
            <strong style={{ fontSize: '1.4rem' }}>{data.soloRemaining}</strong>
          </BalanceItem>
          <BalanceItem>
            <div style={{ color: theme.colors.textMuted }}>Сплит</div>
            <strong style={{ fontSize: '1.4rem' }}>{data.splitRemaining}</strong>
          </BalanceItem>
          <BalanceItem>
            <div style={{ color: theme.colors.textMuted }}>Бег</div>
            <strong style={{ fontSize: '1.4rem' }}>{data.runningRemaining}</strong>
          </BalanceItem>
        </Balances>

        <h2 style={{ margin: '1.25rem 0 0.75rem', fontSize: '1rem' }}>Ближайшие записи</h2>
        {data.upcoming.length === 0 ? (
          <p style={{ color: theme.colors.textMuted }}>Нет запланированных тренировок.</p>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип</th>
                </tr>
              </thead>
              <tbody>
                {data.upcoming.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {format(new Date(s.startDatetime), 'd MMMM yyyy, HH:mm', {
                        locale: ru,
                      })}
                    </td>
                    <td>{WORKOUT_LABELS[s.workoutType]}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        <h2 style={{ margin: '1.25rem 0 0.75rem', fontSize: '1rem' }}>Прошедшие</h2>
        {data.history.length === 0 ? (
          <p style={{ color: theme.colors.textMuted }}>История пуста.</p>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      {format(new Date(h.date), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </td>
                    <td>{WORKOUT_LABELS[h.workoutType]}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </Page>
  );
}
