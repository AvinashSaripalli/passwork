import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { dismissSessionWarning, fetchMe } from './features/auth/authSlice';
import useInactivityLogout, { touchActivity } from './hooks/useInactivityLogout';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useLockVault from './hooks/useLockVault';
import SessionWarningModal from './components/security/SessionWarningModal';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SetMasterPasswordPage from './pages/auth/SetMasterPasswordPage';
import EnterMasterPasswordPage from './pages/auth/EnterMasterPasswordPage';
import VaultPage from './pages/vaults/VaultPage';
import ProtectedRoute from './routes/ProtectedRoute';
import MasterProtectedRoute from './routes/MasterProtectedRoute';
import ActivityLogPage from './pages/activity/ActivityLogPage';
import TeamManagementPage from './pages/team/TeamManagementPage';
import DepartmentsPage from './pages/team/DepartmentsPage';
import EditUserPage from './pages/team/EditUserPage';
import InviteUserPage from './pages/team/InviteUserPage';
import MyVaultPage from './pages/vaults/MyVaultPage';
import SharedWithMePage from './pages/shared/SharedWithMePage';
import ProfilePage from './pages/profile/ProfilePage';
import StatusBar from './components/common/StatusBar';

function App() {
  const dispatch = useDispatch();
  const { token, userLoaded, sessionWarningOpen, sessionWarningSeconds } = useSelector(
    (state) => state.auth
  );
  const { mode } = useSelector((state) => state.theme);
  const [initDone, setInitDone] = useState(false);
  const lockVault = useLockVault();

  useInactivityLogout();
  useKeyboardShortcuts();

  useEffect(() => {
    if (token && !userLoaded) {
      dispatch(fetchMe()).finally(() => setInitDone(true));
    } else {
      setInitDone(true);
    }
  }, []);

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  if (!initDone) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)] font-medium">Loading Vaultix...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StatusBar />
      <SessionWarningModal
        open={sessionWarningOpen}
        secondsLeft={sessionWarningSeconds}
        onExtend={() => {
          touchActivity();
          dispatch(dismissSessionWarning());
        }}
        onLock={() => lockVault()}
      />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/set-master-password"
        element={
          <ProtectedRoute>
            <SetMasterPasswordPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/enter-master-password"
        element={
          <ProtectedRoute>
            <EnterMasterPasswordPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <MasterProtectedRoute>
            <DashboardPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/my-vault"
        element={
          <MasterProtectedRoute>
            <MyVaultPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/shared-with-me"
        element={
          <MasterProtectedRoute>
            <SharedWithMePage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/vaults/:slug"
        element={
          <MasterProtectedRoute>
            <VaultPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/activity-log"
        element={
          <MasterProtectedRoute>
            <ActivityLogPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <MasterProtectedRoute>
            <ProfilePage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/team-management"
        element={
          <MasterProtectedRoute>
            <TeamManagementPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/team-management/invite"
        element={
          <MasterProtectedRoute>
            <InviteUserPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/team-management/edit/:id"
        element={
          <MasterProtectedRoute>
            <EditUserPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/departments"
        element={
          <MasterProtectedRoute>
            <DepartmentsPage />
          </MasterProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;