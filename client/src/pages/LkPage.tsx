import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetClientsQuery,
  useCreateClientMutation,
  useAddPackagesMutation,
} from '../api/baseApi';
import { formatClientName } from '../utils/clientName';
import { useIsMobile } from '../hooks/useIsMobile';
import { WORKOUT_LABELS } from '../utils/workoutLabels';
import type { Client, WorkoutType } from '../types';
import {
  Page,
  Card,
  Table,
  TableWrap,
  Button,
  Field,
  Label,
  Input,
  MobileCard,
  MobileCardRow,
  PageTitle,
  ModalOverlay,
  ModalBox,
  ModalTitle,
  ModalActions,
  ErrorText,
} from '../components/ui';
import styled from 'styled-components';
import { theme } from '../theme';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const FormCard = styled(Card)`
  @media (max-width: 900px) {
    order: -1;
  }
`;

const SearchRow = styled.div`
  margin-bottom: 1rem;
`;

const PackageBtn = styled.button`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.5rem;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceHover};
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }

  span.count {
    font-weight: 700;
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.text};
  }

  span.label {
    font-size: 0.65rem;
    color: ${({ theme }) => theme.colors.textMuted};
    text-transform: uppercase;
  }
`;

const BalanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

type PackageField = 'addSolo' | 'addSplit' | 'addOnline' | 'addRunning';

const PACKAGE_META: Record<
  PackageField,
  { label: string; type: WorkoutType; field: PackageField }
> = {
  addSolo: { label: WORKOUT_LABELS.solo, type: 'solo', field: 'addSolo' },
  addSplit: { label: WORKOUT_LABELS.split, type: 'split', field: 'addSplit' },
  addOnline: { label: WORKOUT_LABELS.online, type: 'online', field: 'addOnline' },
  addRunning: { label: WORKOUT_LABELS.running, type: 'running', field: 'addRunning' },
};

function packageCount(client: Client, field: PackageField): number {
  switch (field) {
    case 'addSolo':
      return client.soloRemaining;
    case 'addSplit':
      return client.splitRemaining;
    case 'addOnline':
      return client.onlineRemaining;
    case 'addRunning':
      return client.runningRemaining;
  }
}

export function LkPage() {
  const isMobile = useIsMobile();
  const { data: clients = [], isLoading } = useGetClientsQuery();
  const [createClient, { isLoading: creating }] = useCreateClientMutation();
  const [addPackages] = useAddPackagesMutation();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    surname: '',
    soloRemaining: 0,
    splitRemaining: 0,
    onlineRemaining: 0,
    runningRemaining: 0,
  });

  const [packageModal, setPackageModal] = useState<{
    client: Client;
    field: PackageField;
  } | null>(null);
  const [addCount, setAddCount] = useState(1);
  const [modalError, setModalError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => formatClientName(c).toLowerCase().includes(q));
  }, [clients, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await createClient({
      name: form.name.trim(),
      surname: form.surname.trim() || undefined,
      soloRemaining: form.soloRemaining,
      splitRemaining: form.splitRemaining,
      onlineRemaining: form.onlineRemaining,
      runningRemaining: form.runningRemaining,
    }).unwrap();
    setForm({
      name: '',
      surname: '',
      soloRemaining: 0,
      splitRemaining: 0,
      onlineRemaining: 0,
      runningRemaining: 0,
    });
  };

  const openPackageModal = (client: Client, field: PackageField) => {
    setPackageModal({ client, field });
    setAddCount(1);
    setModalError('');
  };

  const handleAddPackages = async () => {
    if (!packageModal) return;
    const n = Math.max(1, parseInt(String(addCount), 10) || 1);
    try {
      await addPackages({
        id: packageModal.client.id,
        [packageModal.field]: n,
      }).unwrap();
      setPackageModal(null);
    } catch {
      setModalError('Не удалось добавить тренировки');
    }
  };

  const PackageCell = ({
    client,
    field,
    count,
  }: {
    client: Client;
    field: PackageField;
    count: number;
  }) => (
    <PackageBtn type="button" onClick={() => openPackageModal(client, field)}>
      <span className="count">{count}</span>
      <span className="label">{PACKAGE_META[field].label}</span>
    </PackageBtn>
  );

  return (
    <Page>
      <PageTitle>Личный кабинет</PageTitle>
      <p style={{ margin: '0 0 1rem', color: theme.colors.textMuted, fontSize: '0.9rem' }}>
        Нажмите на число в колонке пакета, чтобы добавить тренировки. Изменить остаток вручную
        или удалить клиента — в карточке клиента. Списание — только через календарь.
      </p>
      <Grid>
        <Card>
          <SearchRow>
            <Input
              placeholder="Поиск по имени или фамилии…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SearchRow>
          {isLoading ? (
            <p>Загрузка…</p>
          ) : isMobile ? (
            filtered.map((c) => (
              <MobileCard key={c.id}>
                <MobileCardRow>
                  <strong>{formatClientName(c)}</strong>
                  <Link to={`/lk/clients/${c.id}`}>Карточка</Link>
                </MobileCardRow>
                <BalanceGrid>
                  <PackageCell client={c} field="addSolo" count={c.soloRemaining} />
                  <PackageCell client={c} field="addSplit" count={c.splitRemaining} />
                  <PackageCell client={c} field="addOnline" count={c.onlineRemaining} />
                  <PackageCell client={c} field="addRunning" count={c.runningRemaining} />
                </BalanceGrid>
              </MobileCard>
            ))
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Фамилия</th>
                    <th>Карточка</th>
                    <th>Соло</th>
                    <th>Сплит</th>
                    <th>Онлайн</th>
                    <th>Бег</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.surname || '—'}</td>
                      <td>
                        <Link to={`/lk/clients/${c.id}`}>Открыть</Link>
                      </td>
                      <td>
                        <PackageCell client={c} field="addSolo" count={c.soloRemaining} />
                      </td>
                      <td>
                        <PackageCell client={c} field="addSplit" count={c.splitRemaining} />
                      </td>
                      <td>
                        <PackageCell client={c} field="addOnline" count={c.onlineRemaining} />
                      </td>
                      <td>
                        <PackageCell client={c} field="addRunning" count={c.runningRemaining} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <FormCard>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Новый клиент</h2>
          <form onSubmit={handleCreate}>
            <Field>
              <Label>Имя *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field>
              <Label>Фамилия</Label>
              <Input
                value={form.surname}
                onChange={(e) => setForm({ ...form, surname: e.target.value })}
              />
            </Field>
            <Field>
              <Label>Соло (начально)</Label>
              <Input
                type="number"
                min={0}
                value={form.soloRemaining}
                onChange={(e) =>
                  setForm({ ...form, soloRemaining: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              <Label>Сплит (начально)</Label>
              <Input
                type="number"
                min={0}
                value={form.splitRemaining}
                onChange={(e) =>
                  setForm({ ...form, splitRemaining: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              <Label>Онлайн (начально)</Label>
              <Input
                type="number"
                min={0}
                value={form.onlineRemaining}
                onChange={(e) =>
                  setForm({ ...form, onlineRemaining: Number(e.target.value) })
                }
              />
            </Field>
            <Field>
              <Label>Бег (начально)</Label>
              <Input
                type="number"
                min={0}
                value={form.runningRemaining}
                onChange={(e) =>
                  setForm({ ...form, runningRemaining: Number(e.target.value) })
                }
              />
            </Field>
            <Button type="submit" disabled={creating} $block>
              Создать
            </Button>
          </form>
        </FormCard>
      </Grid>

      {packageModal && (
        <ModalOverlay onClick={() => setPackageModal(null)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              Добавить {PACKAGE_META[packageModal.field].label} —{' '}
              {formatClientName(packageModal.client)}
            </ModalTitle>
            <p style={{ margin: '0 0 1rem', color: theme.colors.textMuted }}>
              Сейчас в пакете:{' '}
              {packageCount(packageModal.client, packageModal.field)}
            </p>
            <Field>
              <Label>Сколько добавить</Label>
              <Input
                type="number"
                min={1}
                value={addCount}
                onChange={(e) => setAddCount(Number(e.target.value))}
              />
            </Field>
            {modalError && <ErrorText>{modalError}</ErrorText>}
            <ModalActions>
              <Button $variant="ghost" onClick={() => setPackageModal(null)} $block>
                Отмена
              </Button>
              <Button onClick={handleAddPackages} $block>
                Добавить
              </Button>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
    </Page>
  );
}
