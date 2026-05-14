import { useEffect, useState } from 'react';
import { Share2, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

function SharePasswordModal({
  open,
  password,
  loading,
  error,
  onClose,
  onSubmit,
}) {
  const { user } = useSelector((state) => state.auth);

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      try {
        setFetchingUsers(true);
        setLocalError('');

        const response = await api.get('/users/shareable');

        setUsers(response.data || []);
      } catch (err) {
        setLocalError(
          err.response?.data?.message || 'Failed to fetch users'
        );
      } finally {
        setFetchingUsers(false);
      }
    };

    fetchUsers();
  }, [open]);

  const handleClose = () => {
    setSelectedUserId('');
    setLocalError('');
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedUserId) {
      setLocalError('Please select a user');
      return;
    }

    onSubmit(selectedUserId);
    setSelectedUserId('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-slate-900">
            Share Password
          </h2>

          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 mb-4">
          <p className="text-xs text-slate-500">Password</p>

          <p className="font-semibold text-slate-900 mt-1">
            {password?.name}
          </p>

          <p className="text-sm text-slate-500 mt-1">
            {password?.login}
          </p>
        </div>

        {(localError || error) && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{localError || error}</p>
          </div>
        )}

        <div>
          <label className="text-sm text-slate-600 mb-1 block">
            Select user
          </label>

          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
          >
            <option value="">
              {fetchingUsers ? 'Loading users...' : 'Choose user'}
            </option>

            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || fetchingUsers}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
          >
            <Share2 size={16} />
            {loading ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SharePasswordModal;