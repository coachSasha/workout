import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  useGetClientQuery,
  useShareLinkMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} from '../api/baseApi';
import { formatClientName } from '../utils/clientName';
import { WORKOUT_LABELS } from '../utils/workoutLabels';
import { historyStatusLabel } from '../utils/historyStatus';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Page,
  Card,
  Table,
  TableWrap,
  Button,
  PageTitle,
  ModalOverlay,
  ModalBox,
  ModalTitle,
  ModalActions,
  Field,
  Label,
  Input,
  ErrorText,
} from '../components/ui';
import styled from 'styled-components';
import { theme } from '../theme';

const Balances = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;

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

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
`;

const ManageActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
  padding: 0.65rem 0 0;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
  margin-top: 0.35rem;
`;

export function ClientCardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useGetClientQuery(id!, { skip: !id });
  const [shareLink, { isLoading: linking }] = useShareLinkMutation();
  const [updateClient, { isLoading: saving }] = useUpdateClientMutation();
  const [deleteClient, { isLoading: deleting }] = useDeleteClientMutation();
  const [copied, setCopied] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [balancesOpen, setBalancesOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [balances, setBalances] = useState({
    soloRemaining: 0,
    splitRemaining: 0,
    runningRemaining: 0,
  });

  const client = data?.client;

  useEffect(() => {
    if (client) {
      setBalances({
        soloRemaining: client.soloRemaining,
        splitRemaining: client.splitRemaining,
        runningRemaining: client.runningRemaining,
      });
    }
  }, [client]);

  if (isLoading || !data || !client) {
    return (
      <Page>
        <p>Загрузка…</p>
      </Page>
    );
  }

  const { history } = data;

  const openBalancesModal = () => {
    setBalances({
      soloRemaining: client.soloRemaining,
      splitRemaining: client.splitRemaining,
      runningRemaining: client.runningRemaining,
    });
    setEditError('');
    setBalancesOpen(true);
    setManageOpen(false);
  };

  const handleCopyLink = async () => {
    const res = await shareLink(client.id).unwrap();
    await navigator.clipboard.writeText(res.url);
    setCopied('Ссылка скопирована');
    setTimeout(() => setCopied(''), 3000);
  };

  const handleSaveBalances = async () => {
    setEditError('');
    try {
      await updateClient({
        id: client.id,
        soloRemaining: balances.soloRemaining,
        splitRemaining: balances.splitRemaining,
        runningRemaining: balances.runningRemaining,
      }).unwrap();
      setBalancesOpen(false);
    } catch {
      setEditError('Не удалось сохранить остатки');
    }
  };

  const handleDeleteClient = async () => {
    setDeleteError('');
    try {
      await deleteClient(client.id).unwrap();
      setDeleteConfirmOpen(false);
      navigate('/lk');
    } catch {
      setDeleteError('Не удалось удалить клиента');
    }
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

        <ActionRow>
          <Button
            $variant="secondary"
            type="button"
            onClick={() => setManageOpen((v) => !v)}
          >
            {manageOpen ? 'Скрыть' : 'Редактировать'}
          </Button>
          <Button onClick={handleCopyLink} disabled={linking} type="button">
            Ссылка для клиента
          </Button>
          {manageOpen && (
            <ManageActions>
              <Button $variant="secondary" type="button" onClick={openBalancesModal}>
                Изменить
              </Button>
              <Button
                $variant="danger"
                type="button"
                onClick={() => {
                  setDeleteError('');
                  setDeleteConfirmOpen(true);
                }}
              >
                Удалить
              </Button>
            </ManageActions>
          )}
        </ActionRow>

        {copied && (
          <p style={{ color: theme.colors.success, margin: '0 0 0.75rem' }}>{copied}</p>
        )}
        {client.shareToken && (
          <p
            style={{
              fontSize: '0.8rem',
              color: theme.colors.textMuted,
              wordBreak: 'break-all',
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

      {balancesOpen && (
        <ModalOverlay onClick={() => setBalancesOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Остатки — {formatClientName(client)}</ModalTitle>
            <p style={{ margin: '0 0 1rem', color: theme.colors.textMuted, fontSize: '0.9rem' }}>
              Укажите точное число тренировок в пакете (не «добавить», а заменить значение).
            </p>
            <Field>
              <Label>Соло</Label>
              <Input
                type="number"
                min={0}
                value={balances.soloRemaining}
                onChange={(e) =>
                  setBalances({ ...balances, soloRemaining: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              <Label>Сплит</Label>
              <Input
                type="number"
                min={0}
                value={balances.splitRemaining}
                onChange={(e) =>
                  setBalances({ ...balances, splitRemaining: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              <Label>Бег</Label>
              <Input
                type="number"
                min={0}
                value={balances.runningRemaining}
                onChange={(e) =>
                  setBalances({ ...balances, runningRemaining: Number(e.target.value) })
                }
              />
            </Field>
            {editError && <ErrorText>{editError}</ErrorText>}
            <ModalActions>
              <Button $variant="ghost" onClick={() => setBalancesOpen(false)} $block>
                Отмена
              </Button>
              <Button onClick={handleSaveBalances} disabled={saving} $block>
                Сохранить
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Удалить клиента?"
        danger
        loading={deleting}
        error={deleteError}
        confirmLabel="Удалить"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteClient}
      >
        <p style={{ margin: 0, color: theme.colors.textMuted }}>
          Клиент <strong>{formatClientName(client)}</strong> и все его тренировки (запланированные
          и из истории) будут удалены безвозвратно. Остатки пакетов не восстанавливаются.
        </p>
      </ConfirmModal>
    </Page>
  );
}
