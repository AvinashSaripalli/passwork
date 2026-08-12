import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeEditPasswordModal,
  updatePassword,
} from '../../features/vault/vaultSlice';
import VerifyAdminMasterPasswordModal from '../security/VerifyAdminMasterPasswordModal';
import TagInput from '../common/TagInput';
import { encryptText } from '../../utils/crypto';
import { getPasswordStrength } from '../../utils/passwordStrength';
import { isPasswordOld, isPasswordAtRisk } from '../../utils/passwordRisk';
import {
  clearCompanyPasswordEditCache,
  getCompanyPasswordEditCache,
} from '../../utils/companyPasswordEditCache';

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

  const { user, sessionMasterPassword } = useSelector((state) => state.auth);

  const isAdminUser = user?.role === 'ADMIN';

  const selectedPassword = passwords.find(
    (item) => item.id === selectedPasswordId
  );

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    encryptedPassword: '',
    encryptedNote: '',
    confirmPassword: '',
    url: '',
    folderId: '',
    tags: [],
    isSensitive: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const currentFolder = folders.find((f) => f.id === formData.folderId);

  useEffect(() => {
    if (selectedPassword) {
      const cached = getCompanyPasswordEditCache(selectedPassword.id);

      setFormData({
        name: selectedPassword.name || '',
        login: selectedPassword.login || '',
        encryptedPassword: cached?.password || '',
        encryptedNote: cached?.note || '',
        confirmPassword: cached?.password || '',
        url: selectedPassword.url || '',
        folderId: selectedPassword.folderId || '',
        tags:
          selectedPassword.tags
            ?.map((item) => item.tag?.name)
            .filter(Boolean) || [],
        isSensitive: selectedPassword.isSensitive || false,
      });

      setLocalError('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setPendingPayload(null);
    }
  }, [selectedPassword, isEditPasswordModalOpen]);

  if (!isEditPasswordModalOpen || !selectedPassword) return null;

  const handleClose = () => {
    clearCompanyPasswordEditCache(selectedPassword.id);
    setLocalError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPendingPayload(null);
    dispatch(closeEditPasswordModal());
  };

  const handleChange = (e) => {
    setLocalError('');

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Website / Service Name is required';
    if (!formData.login.trim()) return 'Login is required';
    if (!formData.folderId) return 'Folder is required';
    if (!formData.encryptedPassword) return 'Password is required';

    if (formData.encryptedPassword.length < 6) {
      return 'Password must be at least 6 characters';
    }

    if (formData.encryptedPassword !== formData.confirmPassword) {
      return 'Password and confirm password do not match';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setPendingPayload({
      name: formData.name.trim(),
      login: formData.login.trim(),
      password: formData.encryptedPassword,
      note: formData.encryptedNote || '',
      url: formData.url.trim(),
      folderId: formData.folderId,
      tags: formData.tags,
      isSensitive: formData.isSensitive,
    });

    if (isAdminUser && sessionMasterPassword) {
      await handleAdminVerified(sessionMasterPassword);
      return;
    }

    setVerifyOpen(true);
  };

  const handleAdminVerified = async (adminMasterPassword) => {
    try {
      if (!pendingPayload) return;

      const creatorSalt = selectedPassword?.createdBy?.encryptionSalt || user?.encryptionSalt;

      const encryptedPassword = await encryptText(
        pendingPayload.password,
        adminMasterPassword,
        creatorSalt
      );

      const encryptedNote = pendingPayload.note
        ? await encryptText(
            pendingPayload.note,
            adminMasterPassword,
            creatorSalt
          )
        : '';

      const strength = getPasswordStrength(pendingPayload.password);

      const payload = {
        name: pendingPayload.name,
        login: pendingPayload.login,
        encryptedPassword,
        encryptedNote,
        url: pendingPayload.url,
        folderId: pendingPayload.folderId,
        tags: pendingPayload.tags,
        isSensitive: pendingPayload.isSensitive,
        strengthScore:
          strength?.label === 'Strong'
            ? 90
            : strength?.label === 'Medium'
              ? 70
              : 40,
        isWeak: strength?.label === 'Weak',
        isOld: isPasswordOld(selectedPassword.lastUpdatedAt, selectedPassword.createdAt),
        isAtRisk: isPasswordAtRisk(pendingPayload.password),
      };

      const result = await dispatch(
        updatePassword({
          passwordId: selectedPassword.id,
          payload,
        })
      );

      if (updatePassword.fulfilled.match(result)) {
        clearCompanyPasswordEditCache(selectedPassword.id);
        setVerifyOpen(false);
        setPendingPayload(null);
        dispatch(closeEditPasswordModal());
      } else {
        setLocalError(result.payload || 'Failed to update password');
        setVerifyOpen(false);
      }
    } catch {
      setLocalError('Encryption failed. Please try again.');
      setVerifyOpen(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Edit Password
              </h2>
              <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
                Update password details in {currentFolder?.name || 'folder'}
              </p>
            </div>

            <button onClick={handleClose} className="text-slate-500 dark:text-slate-400">
              <X size={22} />
            </button>
          </div>

          {localError && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {localError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                name="name"
                type="text"
                placeholder="Website / Service name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                required
              />

              <input
                name="login"
                type="text"
                placeholder="Login / Email"
                value={formData.login}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                required
              />

              <select
                name="folderId"
                value={formData.folderId}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                required
              >
                <option value="">Select folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>

              <div className="relative">
                <input
                  name="encryptedPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.encryptedPassword}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-xl px-4 pr-12 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-xl px-4 pr-12 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <input
                name="url"
                type="text"
                placeholder="URL"
                value={formData.url}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
              />

              <textarea
                name="encryptedNote"
                placeholder="Note"
                value={formData.encryptedNote}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 min-h-[90px] sm:col-span-2"
              />

              <div className="sm:col-span-2">
                <TagInput
                  tags={formData.tags}
                  setTags={(newTags) => setFormData((prev) => ({ ...prev, tags: newTags }))}
                  suggestions={SUGGESTED_TAGS}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-slate-300 px-4 py-3 dark:border-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={formData.isSensitive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isSensitive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Secure — always ask master password before revealing this password
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <VerifyAdminMasterPasswordModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={handleAdminVerified}
      />
    </>
  );
}

export default EditPasswordModal;