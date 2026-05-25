import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useGetMeQuery, useLogoutMutation } from '../api/baseApi';
import { HeaderBar, Logo, NavActions, Button } from './ui';

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const checked = useSelector((s: RootState) => s.auth.checked);
  useGetMeQuery(undefined, { skip: checked });
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    await logout().unwrap();
    navigate('/');
  };

  return (
    <>
      <HeaderBar>
        <Link to="/">
          <Logo>Календарь тренера</Logo>
        </Link>
        <NavActions>
          {isAuthenticated ? (
            <>
              <Link to="/lk" style={{ textDecoration: 'none' }}>
                <Button $variant="ghost" type="button">
                  ЛК
                </Button>
              </Link>
              <Button $variant="ghost" onClick={handleLogout}>
                Выйти
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button>Войти</Button>
            </Link>
          )}
        </NavActions>
      </HeaderBar>
      {children}
    </>
  );
}
