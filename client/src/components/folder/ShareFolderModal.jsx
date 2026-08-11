import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { shareFolderAccess } from '../../features/vault/vaultSlice';

function ShareFolderModal({ open, onClose, folderId, vaultId }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { actionLoading } = useSelector((state) => state.vault);

  const [users, setUsers] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('READ_ONLY');
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      try {
        setFetchingUsers(true);
        setError('');

        const response = await api.get('/users/shareable');

        const filteredUsers = (response.data || []).filter(
          (item) => item.id !== user?.id
        );

        setUsers(filteredUsers);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch users');
      } finally {
        setFetchingUsers(false);
      }
    };

    fetchUsers();
  }, [open, user?.id]);

  const resetForm = () => {
    setUserEmail('');
    setAccessLevel('READ_ONLY');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRequestShare = (e) => {
    e.preventDefault();

    if (!folderId) return setError('Select a folder');
    if (!vaultId) return setError('Vault missing');
    if (!userEmail) return setError('Select a user');

    setError('');
    handleVerified();
  };

  const handleVerified = async () => {
    const result = await dispatch(
      shareFolderAccess({
        folderId,
        userEmail,
        accessLevel,
        vaultId,
      })
    );

    if (shareFolderAccess.fulfilled.match(result)) {
      handleClose();
    } else {
      setError(result.payload || 'Failed to share');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Share Folder</h2>
            <button onClick={handleClose} className="text-slate-400 dark:text-slate-500">
              <X size={20} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRequestShare} className="space-y-4">
            
            {/* User Select */}
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-300 mb-1 block">
                Select user
              </label>
              <select
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full border border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">
                  {fetchingUsers ? 'Loading...' : 'Choose user'}
                </option>
                {users.map((item) => (
                  <option key={item.id} value={item.email}>
                    {item.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Access Level */}
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-300 mb-1 block">
                Access level
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="w-full border border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="READ_ONLY">Read Only</option>
                <option value="EDIT_ONLY">Edit Only</option>
                <option value="FULL_ACCESS">Full Access</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm"
              >
                {actionLoading ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

export default ShareFolderModal;