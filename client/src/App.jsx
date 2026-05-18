import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SetMasterPasswordPage from './pages/auth/SetMasterPasswordPage';
import EnterMasterPasswordPage from './pages/auth/EnterMasterPasswordPage';
import VaultPage from './pages/vaults/VaultPage';
import ProtectedRoute from './routes/ProtectedRoute';
import MasterProtectedRoute from './routes/MasterProtectedRoute';
import ActivityLogPage from './pages/activity/ActivityLogPage';
import LoginActivityPage from './pages/activity/LoginActivityPage';
import TeamManagementPage from './pages/team/TeamManagementPage';
import EditUserPage from './pages/team/EditUserPage';
import InviteUserPage from './pages/team/InviteUserPage';
import MyVaultPage from './pages/vaults/MyVaultPage';
import SharedWithMePage from './pages/shared/SharedWithMePage';
import NotificationsPage from './pages/notifications/NotificationsPage';

function App() {
  return (
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
        path="/notifications"
        element={
          <MasterProtectedRoute>
            <NotificationsPage />
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
        path="/login-activity"
        element={
          <MasterProtectedRoute>
            <LoginActivityPage />
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

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;