import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function MasterProtectedRoute({ children }) {
  const { isAuthenticated, token, isMasterVerified, user } = useSelector(
    (state) => state.auth
  );

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.hasMasterPassword && !user?.masterPasswordHint) {
    return <Navigate to="/set-master-password" replace />;
  }

  if (!isMasterVerified) {
    return <Navigate to="/enter-master-password" replace />;
  }

  return children;
}

export default MasterProtectedRoute;