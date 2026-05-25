import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLoginMutation } from '../api/baseApi';
import { Page, Card, Field, Label, Input, Button, ErrorText } from '../components/ui';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ password }).unwrap();
      navigate(from, { replace: true });
    } catch {
      setError('Неверный пароль');
    }
  };

  return (
    <Page>
      <Card style={{ maxWidth: 400, margin: '2rem auto' }}>
        <h1 style={{ margin: '0 0 1rem' }}>Вход тренера</h1>
        <form onSubmit={handleSubmit}>
          <Field>
            <Label>Пароль</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: '0.5rem' }}>
            Войти
          </Button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/">На главную</Link>
        </p>
      </Card>
    </Page>
  );
}
