import { useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

function VerifyAdminMasterPasswordModal({ open, onClose, onVerified }) {
  const { token } = useSelector((state) => state.auth);
  const [masterPassword, setMasterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      await api.post(
        '/auth/verify-admin-master-password',
        { masterPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMasterPassword('');
      onClose();
      if (onVerified) onVerified();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid administrator master password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-2">
          Verify Administrator Password
        </h2>
        <p className="text-slate-500 mb-6">
          Enter administrator master password to continue.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Administrator master password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none"
            required
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VerifyAdminMasterPasswordModal;