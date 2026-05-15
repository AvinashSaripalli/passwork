import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

function VerifyAdminMasterPasswordModal({ open, onClose, onVerified }) {
  const { token } = useSelector((state) => state.auth);

  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleClose = () => {
    setMasterPassword('');
    setShowPassword(false);
    setError('');
    onClose();
  };

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
      setShowPassword(false);
      handleClose();

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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-2 text-slate-900">
          Verify Administrator Password
        </h2>

        <p className="text-slate-500 mb-5 text-sm">
          Enter administrator master password to continue.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Administrator master password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 pr-11 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
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