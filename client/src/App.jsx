import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './components/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import ScannerPage from './pages/ScannerPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--teal)]" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="scanner" element={<ScannerPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}
