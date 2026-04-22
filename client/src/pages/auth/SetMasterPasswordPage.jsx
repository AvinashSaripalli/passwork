import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearError,
  setMasterPassword,
  setMasterVerified,
} from '../../features/auth/authSlice';

function SetMasterPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, loading, error, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    masterPassword: '',
    confirmMasterPassword: '',
    hint: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.hasMasterPassword || user?.masterPasswordHint) {
      navigate('/enter-master-password');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.masterPassword !== formData.confirmMasterPassword) {
      alert('Master passwords do not match');
      return;
    }

    const result = await dispatch(
      setMasterPassword({
        masterPassword: formData.masterPassword,
        hint: formData.hint,
      })
    );

    if (setMasterPassword.fulfilled.match(result)) {
      dispatch(setMasterVerified(true));
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Set Master Password</h1>
        <p className="text-slate-500 mb-6">
          This protects your vault access and sensitive actions.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            name="masterPassword"
            placeholder="Master password"
            value={formData.masterPassword}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none"
            required
          />

          <input
            type="password"
            name="confirmMasterPassword"
            placeholder="Confirm master password"
            value={formData.confirmMasterPassword}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none"
            required
          />

          <input
            type="text"
            name="hint"
            placeholder="Hint (optional)"
            value={formData.hint}
            onChange={handleChange}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
          >
            {loading ? 'Saving...' : 'Save Master Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetMasterPasswordPage;