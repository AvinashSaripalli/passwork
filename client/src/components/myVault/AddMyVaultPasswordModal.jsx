import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

const initialForm = {
  folderId: '',
  name: '',
  login: '',
  encryptedPassword: '',
  url: '',
  encryptedNote: '',
  tags: '',
};

function AddMyVaultPasswordModal({
  open,
  folders,
  selectedFolder,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState(initialForm);

  if (!open) return null;

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClose = () => {
    setFormData(initialForm);
    onClose();
  };

  const handleSubmit = () => {
    if (
      !formData.folderId ||
      !formData.name ||
      !formData.login ||
      !formData.encryptedPassword
    ) {
      return;
    }

    const payload = {
      ...formData,
      tags: formData.tags
        ? formData.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };

    onSubmit(payload);

    setFormData(initialForm);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Add Password
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Create a new password in My Vault
            </p>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Selected folder:{' '}
          <span className="font-semibold text-slate-700">
            {selectedFolder?.name || 'Select Folder'}
          </span>
        </p>

        <div className="space-y-4">
          <select
            value={formData.folderId}
            onChange={(e) => updateField('folderId', e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
          >
            <option value="">Select Folder</option>

            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Name"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />

            <input
              type="text"
              value={formData.login}
              onChange={(e) => updateField('login', e.target.value)}
              placeholder="Login / Email"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />

            <input
              type="password"
              value={formData.encryptedPassword}
              onChange={(e) =>
                updateField('encryptedPassword', e.target.value)
              }
              placeholder="Password"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />

            <input
              type="text"
              value={formData.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="URL"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />
          </div>

          <input
            type="text"
            value={formData.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            placeholder="Tags, comma separated"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
          />

          <textarea
            rows={2}
            value={formData.encryptedNote}
            onChange={(e) => updateField('encryptedNote', e.target.value)}
            placeholder="Note"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none resize-none"
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={handleClose}
              className="px-7 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="px-7 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 flex items-center gap-2"
            >
              <KeyRound size={16} />
              Save Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddMyVaultPasswordModal;