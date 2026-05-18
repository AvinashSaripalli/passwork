import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeEditPasswordModal,
  updatePassword,
} from '../../features/vault/vaultSlice';

const SUGGESTED_TAGS = [
  'Production',
  'Testing',
  'Development',
  'Shared',
  'Private',
  'Critical',
  'Client',
  'Internal',
  'Cloud',
  'CRM',
  'Hosting',
  'Email',
  'Database',
  'Security',
  'Marketing',
  'Finance',
  'Support',
  'Temporary',
];

function EditPasswordModal() {
  const dispatch = useDispatch();

  const {
    isEditPasswordModalOpen,
    passwords,
    selectedPasswordId,
    actionLoading,
    folders,
  } = useSelector((state) => state.vault);

  const selectedPassword = passwords.find(
    (item) => item.id === selectedPasswordId
  );

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    encryptedPassword: '',
    confirmPassword: '',
    url: '',
    folderId: '',
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const currentFolder = folders.find((f) => f.id === formData.folderId);

  useEffect(() => {
    if (selectedPassword) {
      setFormData({
        name: selectedPassword.name || '',
        login: selectedPassword.login || '',
        encryptedPassword: selectedPassword.encryptedPassword || '',
        confirmPassword: selectedPassword.encryptedPassword || '',
        url: selectedPassword.url || '',
        folderId: selectedPassword.folderId || '',
        tags:
          selectedPassword.tags
            ?.map((item) => item.tag?.name)
            .filter(Boolean) || [],
      });

      setTagInput('');
      setLocalError('');
    }
  }, [selectedPassword]);

  if (!isEditPasswordModalOpen || !selectedPassword) return null;

  const handleClose = () => {
    setLocalError('');
    setTagInput('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    dispatch(closeEditPasswordModal());
  };

  const handleChange = (e) => {
    setLocalError('');

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const addTag = (value) => {
    const cleanTag = value.trim();

    if (!cleanTag) return;

    const exists = formData.tags.some(
      (tag) => tag.toLowerCase() === cleanTag.toLowerCase()
    );

    if (exists) {
      setTagInput('');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, cleanTag],
    }));

    setTagInput('');
  };

  const removeTag = (tagName) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagName),
    }));
  };

  const filteredSuggestions = SUGGESTED_TAGS.filter(
    (tag) =>
      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      !formData.tags.some(
        (selectedTag) => selectedTag.toLowerCase() === tag.toLowerCase()
      )
  ).slice(0, 6);

  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Website / Service Name is required';
    }

    if (!formData.login.trim()) {
      return 'Login is required';
    }

    if (!formData.encryptedPassword) {
      return 'Password is required';
    }

    if (formData.encryptedPassword.length < 6) {
      return 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      return 'Confirm password is required';
    }

    if (formData.encryptedPassword !== formData.confirmPassword) {
      return 'Password and confirm password do not match';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (tagInput.trim()) {
      addTag(tagInput);
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const result = await dispatch(
      updatePassword({
        passwordId: selectedPassword.id,
        payload: {
          name: formData.name.trim(),
          login: formData.login.trim(),
          encryptedPassword: formData.encryptedPassword,
          url: formData.url.trim(),
          folderId: formData.folderId || null,
          tags: formData.tags,
        },
      })
    );

    if (updatePassword.fulfilled.match(result)) {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Edit Password
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Update password details and tags
            </p>
          </div>

          <button
            onClick={handleClose}
            className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-500">
            Current folder:
            <span className="font-semibold text-slate-800 ml-1">
              {currentFolder?.name || 'No folder'}
            </span>
          </p>
        </div>

        {localError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{localError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Website / Service Name"
            value={formData.name}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />

          <input
            type="text"
            name="login"
            placeholder="Login"
            value={formData.login}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="encryptedPassword"
              placeholder="Password"
              value={formData.encryptedPassword}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 pr-11 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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

          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 pr-11 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <input
            type="text"
            name="url"
            placeholder="URL"
            value={formData.url}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <select
            name="folderId"
            value={formData.folderId}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">No folder</option>

            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <div className="col-span-2">
            <div className="border border-slate-300 rounded-lg px-3 py-2 min-h-[45px] flex flex-wrap items-center gap-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                >
                  {tag}

                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-indigo-500 hover:text-red-500"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  }

                  if (
                    e.key === 'Backspace' &&
                    !tagInput &&
                    formData.tags.length
                  ) {
                    removeTag(formData.tags[formData.tags.length - 1]);
                  }
                }}
                placeholder={
                  formData.tags.length
                    ? ''
                    : 'Add tags like Production, CRM, Critical'
                }
                className="flex-1 min-w-[180px] border-none outline-none text-sm"
              />
            </div>

            {tagInput && filteredSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {filteredSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(tag);
                    }}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <p className="mt-1 text-xs text-slate-400">
              Press Enter or comma to add tags.
            </p>
          </div>

          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
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