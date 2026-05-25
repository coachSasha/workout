import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useGetMeQuery } from '../api/baseApi';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const checked = useSelector((s: RootState) => s.auth.checked);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  useGetMeQuery(undefined, { skip: checked && isAuthenticated });

  if (!checked) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
