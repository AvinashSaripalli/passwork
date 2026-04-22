import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { setMasterVerified } from '../../features/auth/authSlice';

function EnterMasterPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { token, isAuthenticated, user, loading } = useSelector(
    (state) => state.auth
  );

  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setVerifying(true);
      setError('');

      await api.post(
        '/auth/verify-master-password',
        { masterPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      dispatch(setMasterVerified(true));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid master password');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Enter Master Password</h1>
        <p className="text-slate-500 mb-6">
          Welcome {user?.fullName ? `, ${user.fullName}` : ''}. Enter your master password to continue.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Master password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none"
            required
          />

          <button
            type="submit"
            disabled={verifying || loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
          >
            {verifying ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EnterMasterPasswordPage;