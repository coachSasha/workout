import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useGetClientQuery, useShareLinkMutation } from '../api/baseApi';
import { formatClientName } from '../utils/clientName';
import { WORKOUT_LABELS } from '../utils/workoutLabels';
import { historyStatusLabel } from '../utils/historyStatus';
import { Page, Card, Table, TableWrap, Button, PageTitle } from '../components/ui';
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
  padding: 1rem 1.25rem;
  border-radius: ${({ theme }) => theme.radius};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-align: center;
`;

export function ClientCardPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useGetClientQuery(id!, { skip: !id });
  const [shareLink, { isLoading: linking }] = useShareLinkMutation();
  const [copied, setCopied] = useState('');

  if (isLoading || !data) {
    return (
      <Page>
        <p>Загрузка…</p>
      </Page>
    );
  }

  const { client, history } = data;

  const handleCopyLink = async () => {
    const res = await shareLink(client.id).unwrap();
    await navigator.clipboard.writeText(res.url);
    setCopied('Ссылка скопирована');
    setTimeout(() => setCopied(''), 3000);
  };

  return (
    <Page>
      <p>
        <Link to="/lk">← К списку клиентов</Link>
      </p>
      <PageTitle>{formatClientName(client)}</PageTitle>

      <Card>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Остатки пакетов</h2>
        <Balances>
          <BalanceItem>
            <div style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>Соло</div>
            <strong style={{ fontSize: '1.5rem' }}>{client.soloRemaining}</strong>
          </BalanceItem>
          <BalanceItem>
            <div style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>Сплит</div>
            <strong style={{ fontSize: '1.5rem' }}>{client.splitRemaining}</strong>
          </BalanceItem>
          <BalanceItem>
            <div style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>Бег</div>
            <strong style={{ fontSize: '1.5rem' }}>{client.runningRemaining}</strong>
          </BalanceItem>
        </Balances>

        <Button onClick={handleCopyLink} disabled={linking} $block>
          Скопировать ссылку для клиента
        </Button>
        {copied && (
          <p style={{ color: theme.colors.success, margin: '0.75rem 0 0' }}>{copied}</p>
        )}
        {client.shareToken && (
          <p
            style={{
              fontSize: '0.8rem',
              color: theme.colors.textMuted,
              wordBreak: 'break-all',
              marginTop: '0.5rem',
            }}
          >
            /c/{client.shareToken}
          </p>
        )}

        <h2 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1rem' }}>
          История тренировок
        </h2>
        {history.length === 0 ? (
          <p style={{ color: theme.colors.textMuted }}>Пока нет записей в истории.</p>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      {format(new Date(h.date), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </td>
                    <td>{WORKOUT_LABELS[h.workoutType]}</td>
                    <td>{historyStatusLabel(h.historyStatus)}</td>
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
