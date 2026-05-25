import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { LkPage } from './pages/LkPage';
import { ClientCardPage } from './pages/ClientCardPage';
import { PublicClientPage } from './pages/PublicClientPage';
import { useGetMeQuery } from './api/baseApi';
import { setChecked } from './store/authSlice';

function AuthBootstrap() {
  const dispatch = useDispatch();
  const { isLoading, isError, isSuccess } = useGetMeQuery();

  useEffect(() => {
    if (!isLoading && (isSuccess || isError)) {
      dispatch(setChecked(true));
    }
  }, [isLoading, isSuccess, isError, dispatch]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <Routes>
        <Route
          path="/c/:shareToken"
          element={<PublicClientPage />}
        />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/lk"
                  element={
                    <ProtectedRoute>
                      <LkPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lk/clients/:id"
                  element={
                    <ProtectedRoute>
                      <ClientCardPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
