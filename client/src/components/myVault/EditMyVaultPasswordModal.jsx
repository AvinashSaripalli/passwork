import { useEffect, useState } from 'react';
import { KeyRound, X } from 'lucide-react';

function EditMyVaultPasswordModal({ open, password, folders, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    folderId: '',
    name: '',
    login: '',
    encryptedPassword: '',
    url: '',
    encryptedNote: '',
    tags: '',
  });

  useEffect(() => {
    if (password) {
      setFormData({
        folderId: password.folderId || '',
        name: password.name || '',
        login: password.login || '',
        encryptedPassword: password.encryptedPassword || '',
        url: password.url || '',
        encryptedNote: password.encryptedNote || '',
        tags: password.tags?.map((item) => item.tag?.name).join(', ') || '',
      });
    }
  }, [password]);

  if (!open) return null;

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.login || !formData.encryptedPassword) return;

    onSubmit({
      ...formData,
      tags: formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-2xl font-bold text-slate-900">Edit Password</h2>

          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <select
            value={formData.folderId}
            onChange={(e) => updateField('folderId', e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-4">
            <input
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Name"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />

            <input
              value={formData.login}
              onChange={(e) => updateField('login', e.target.value)}
              placeholder="Login"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />

            <input
              type="password"
              value={formData.encryptedPassword}
              onChange={(e) => updateField('encryptedPassword', e.target.value)}
              placeholder="Password"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />

            <input
              value={formData.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="URL"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none"
            />
          </div>

          <input
            value={formData.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            placeholder="Tags"
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
            <button onClick={onClose} className="px-7 py-3 rounded-xl border">
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="px-7 py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-2"
            >
              <KeyRound size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditMyVaultPasswordModal;