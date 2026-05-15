import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';

function EditMyVaultPasswordModal({
  open,
  password,
  folders,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({
    folderId: '',
    name: '',
    login: '',
    encryptedPassword: '',
    url: '',
    encryptedNote: '',
    tags: '',
  });

  const [showPassword, setShowPassword] = useState(false);

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

      setShowPassword(false);
    }
  }, [password]);

  if (!open) return null;

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClose = () => {
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.login || !formData.encryptedPassword) {
      return;
    }

    onSubmit({
      ...formData,
      tags: formData.tags
        ? formData.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    });

    setShowPassword(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Edit Password
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Update password details in Personal Vault
            </p>
          </div>

          <button
            onClick={handleClose}
            className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <select
            value={formData.folderId}
            onChange={(e) => updateField('folderId', e.target.value)}
            className={inputClass}
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
              className={inputClass}
            />

            <input
              value={formData.login}
              onChange={(e) => updateField('login', e.target.value)}
              placeholder="Login"
              className={inputClass}
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.encryptedPassword}
                onChange={(e) =>
                  updateField('encryptedPassword', e.target.value)
                }
                placeholder="Password"
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <input
              value={formData.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="URL"
              className={inputClass}
            />
          </div>

          <input
            value={formData.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            placeholder="Tags"
            className={inputClass}
          />

          <textarea
            rows={2}
            value={formData.encryptedNote}
            onChange={(e) => updateField('encryptedNote', e.target.value)}
            placeholder="Note"
            className={`${inputClass} resize-none`}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700"
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