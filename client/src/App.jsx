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
import TeamManagementPage from './pages/team/TeamManagementPage';
import AddUserPage from './pages/team/AddUserPage';
import EditUserPage from './pages/team/EditUserPage';

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
        path="/vaults/:id"
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
        path="/team-management"
        element={
          <MasterProtectedRoute>
            <TeamManagementPage />
          </MasterProtectedRoute>
        }
      />

      <Route
        path="/team-management/add"
        element={
          <MasterProtectedRoute>
            <AddUserPage />
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