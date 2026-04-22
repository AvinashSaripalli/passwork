import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeEditPasswordModal,
  updatePassword,
} from '../../features/vault/vaultSlice';

function EditPasswordModal() {
  const dispatch = useDispatch();

  const {
    isEditPasswordModalOpen,
    passwords,
    selectedPasswordId,
    actionLoading,
    folders,
  } = useSelector((state) => state.vault);

  const selectedPassword = passwords.find((item) => item.id === selectedPasswordId);

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    encryptedPassword: '',
    url: '',
    folderId: '',
  });

  const currentFolder = folders.find((f) => f.id === formData.folderId);

  useEffect(() => {
    if (selectedPassword) {
      setFormData({
        name: selectedPassword.name || '',
        login: selectedPassword.login || '',
        encryptedPassword: selectedPassword.encryptedPassword || '',
        url: selectedPassword.url || '',
        folderId: selectedPassword.folderId || '',
      });
    }
  }, [selectedPassword]);

  if (!isEditPasswordModalOpen || !selectedPassword) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await dispatch(
      updatePassword({
        passwordId: selectedPassword.id,
        payload: {
          name: formData.name,
          login: formData.login,
          encryptedPassword: formData.encryptedPassword,
          url: formData.url,
          folderId: formData.folderId || null,
        },
      })
    );

    if (updatePassword.fulfilled.match(result)) {
      dispatch(closeEditPasswordModal());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Edit Password</h2>
          <button
            onClick={() => dispatch(closeEditPasswordModal())}
            className="text-slate-500 text-xl"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Current folder:
          <span className="font-medium text-slate-700 ml-1">
            {currentFolder?.name || 'No folder'}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl px-4 py-3 outline-none"
            required
          />

          <input
            type="text"
            name="login"
            placeholder="Login"
            value={formData.login}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl px-4 py-3 outline-none"
            required
          />

          <input
            type="text"
            name="encryptedPassword"
            placeholder="Password"
            value={formData.encryptedPassword}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl px-4 py-3 outline-none"
            required
          />

          <input
            type="text"
            name="url"
            placeholder="URL"
            value={formData.url}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl px-4 py-3 outline-none"
          />

          <select
            name="folderId"
            value={formData.folderId}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl px-4 py-3 outline-none"
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => dispatch(closeEditPasswordModal())}
              className="px-5 py-3 rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium"
            >
              {actionLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPasswordModal;