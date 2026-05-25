import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
} from '../api/baseApi';
import { formatClientName } from '../utils/clientName';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Page,
  Card,
  Table,
  TableWrap,
  Button,
  Field,
  Label,
  Input,
  InlineInput,
  MobileCard,
  MobileCardRow,
  PageTitle,
} from '../components/ui';
import styled from 'styled-components';
import type { Client } from '../types';

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

const BalanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

export function LkPage() {
  const isMobile = useIsMobile();
  const { data: clients = [], isLoading } = useGetClientsQuery();
  const [createClient, { isLoading: creating }] = useCreateClientMutation();
  const [updateClient] = useUpdateClientMutation();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    surname: '',
    soloRemaining: 0,
    splitRemaining: 0,
    runningRemaining: 0,
  });

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
      runningRemaining: form.runningRemaining,
    }).unwrap();
    setForm({
      name: '',
      surname: '',
      soloRemaining: 0,
      splitRemaining: 0,
      runningRemaining: 0,
    });
  };

  const patchBalance = async (
    client: Client,
    field: 'soloRemaining' | 'splitRemaining' | 'runningRemaining',
    value: number,
  ) => {
    const n = Math.max(0, parseInt(String(value), 10) || 0);
    await updateClient({ id: client.id, [field]: n }).unwrap();
  };

  return (
    <Page>
      <PageTitle>Личный кабинет</PageTitle>
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
              <ClientMobileCard key={c.id} client={c} onPatch={patchBalance} />
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
                    <th>Бег</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <ClientRow key={c.id} client={c} onPatch={patchBalance} />
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
              <Label>Соло</Label>
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
              <Label>Сплит</Label>
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
              <Label>Бег</Label>
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
    </Page>
  );
}

function ClientRow({
  client,
  onPatch,
}: {
  client: Client;
  onPatch: (
    c: Client,
    field: 'soloRemaining' | 'splitRemaining' | 'runningRemaining',
    v: number,
  ) => Promise<void>;
}) {
  const [solo, setSolo] = useState(client.soloRemaining);
  const [split, setSplit] = useState(client.splitRemaining);
  const [running, setRunning] = useState(client.runningRemaining);

  useEffect(() => {
    setSolo(client.soloRemaining);
    setSplit(client.splitRemaining);
    setRunning(client.runningRemaining);
  }, [client.soloRemaining, client.splitRemaining, client.runningRemaining]);

  return (
    <tr>
      <td>{client.name}</td>
      <td>{client.surname || '—'}</td>
      <td>
        <Link to={`/lk/clients/${client.id}`}>Открыть</Link>
      </td>
      <td>
        <InlineInput
          type="number"
          min={0}
          value={solo}
          onChange={(e) => setSolo(Number(e.target.value))}
          onBlur={() => onPatch(client, 'soloRemaining', solo)}
        />
      </td>
      <td>
        <InlineInput
          type="number"
          min={0}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          onBlur={() => onPatch(client, 'splitRemaining', split)}
        />
      </td>
      <td>
        <InlineInput
          type="number"
          min={0}
          value={running}
          onChange={(e) => setRunning(Number(e.target.value))}
          onBlur={() => onPatch(client, 'runningRemaining', running)}
        />
      </td>
    </tr>
  );
}

function ClientMobileCard({
  client,
  onPatch,
}: {
  client: Client;
  onPatch: (
    c: Client,
    field: 'soloRemaining' | 'splitRemaining' | 'runningRemaining',
    v: number,
  ) => Promise<void>;
}) {
  const [solo, setSolo] = useState(client.soloRemaining);
  const [split, setSplit] = useState(client.splitRemaining);
  const [running, setRunning] = useState(client.runningRemaining);

  useEffect(() => {
    setSolo(client.soloRemaining);
    setSplit(client.splitRemaining);
    setRunning(client.runningRemaining);
  }, [client.soloRemaining, client.splitRemaining, client.runningRemaining]);

  return (
    <MobileCard>
      <MobileCardRow>
        <strong>{formatClientName(client)}</strong>
        <Link to={`/lk/clients/${client.id}`}>Карточка</Link>
      </MobileCardRow>
      <BalanceGrid>
        <label>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Соло</span>
          <InlineInput
            type="number"
            min={0}
            value={solo}
            style={{ width: '100%', marginTop: 4 }}
            onChange={(e) => setSolo(Number(e.target.value))}
            onBlur={() => onPatch(client, 'soloRemaining', solo)}
          />
        </label>
        <label>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Сплит</span>
          <InlineInput
            type="number"
            min={0}
            value={split}
            style={{ width: '100%', marginTop: 4 }}
            onChange={(e) => setSplit(Number(e.target.value))}
            onBlur={() => onPatch(client, 'splitRemaining', split)}
          />
        </label>
        <label>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Бег</span>
          <InlineInput
            type="number"
            min={0}
            value={running}
            style={{ width: '100%', marginTop: 4 }}
            onChange={(e) => setRunning(Number(e.target.value))}
            onBlur={() => onPatch(client, 'runningRemaining', running)}
          />
        </label>
      </BalanceGrid>
    </MobileCard>
  );
}
