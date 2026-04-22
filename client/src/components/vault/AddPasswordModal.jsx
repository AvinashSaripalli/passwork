import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeAddPasswordModal,
  createPassword,
} from '../../features/vault/vaultSlice';

function AddPasswordModal() {
  const dispatch = useDispatch();
const { isAddPasswordModalOpen, selectedVault, selectedFolderId, actionLoading, folders, } =
  useSelector((state) => state.vault);

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    encryptedPassword: '',
    url: '',
    tags: '',
  });
  if (!isAddPasswordModalOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await dispatch(
createPassword({
  name: formData.name,
  login: formData.login,
  encryptedPassword: formData.encryptedPassword,
  url: formData.url,
  vaultId: selectedVault?.id,
  folderId: selectedFolderId || null,
  tags: formData.tags
    ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [],
})
    );

    if (createPassword.fulfilled.match(result)) {
      setFormData({
        name: '',
        login: '',
        encryptedPassword: '',
        url: '',
        tags: '',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Add Password</h2>
          <button
            onClick={() => dispatch(closeAddPasswordModal())}
            className="text-slate-500 text-xl"
          >
            ×
          </button>
        </div>

        {selectedFolder && (
  <p className="text-sm text-slate-500 mb-4">
    New password will be created inside folder:
    <span className="font-medium text-slate-700 ml-1">
      {selectedFolder.name}
    </span>
  </p>
)}

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
            placeholder="Login / Email"
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

          <input
            type="text"
            name="tags"
            placeholder="Tags comma separated"
            value={formData.tags}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl px-4 py-3 outline-none col-span-2"
          />

          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => dispatch(closeAddPasswordModal())}
              className="px-5 py-3 rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium"
            >
              {actionLoading ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPasswordModal;