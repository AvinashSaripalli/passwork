import { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeAddPasswordModal,
  createPassword,
} from '../../features/vault/vaultSlice';
import TagInput from '../common/TagInput';
import { encryptTextWithAesKey, wrapItemKey, decryptPrivateKey } from '../../utils/crypto';
import { getWrapRecipients, wrapItemKeysForUsers } from '../../utils/keyWrapping';
import { getPasswordStrength } from '../../utils/passwordStrength';
import { isPasswordAtRisk } from '../../utils/passwordRisk';
import api from '../../services/api';
import {
  setSessionRsaPrivateKey,
  setSessionRsaPublicKey,
} from '../../features/auth/authSlice';

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

function AddPasswordModal() {
  const dispatch = useDispatch();

  const {
    isAddPasswordModalOpen,
    selectedVault,
    selectedFolderId,
    actionLoading,
    folders,
  } = useSelector((state) => state.vault);

  const { user, sessionMasterPassword, sessionRsaPublicKey, sessionRsaPrivateKey } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    encryptedPassword: '',
    encryptedNote: '',
    confirmPassword: '',
    url: '',
    tags: [],
    isSensitive: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!isAddPasswordModalOpen) return null;

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const resetForm = () => {
    setFormData({
      name: '',
      login: '',
      encryptedPassword: '',
      encryptedNote: '',
      confirmPassword: '',
      url: '',
      tags: [],
      isSensitive: false,
    });

    setShowPassword(false);
    setShowConfirmPassword(false);
    setLocalError('');
  };

  const handleClose = () => {
    resetForm();
    dispatch(closeAddPasswordModal());
  };

  const handleChange = (e) => {
    setLocalError('');

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    if (!selectedVault?.id) return 'Vault is required';
    if (!selectedFolderId) return 'Please select a folder first';
    if (!formData.name.trim()) return 'Password name is required';
    if (!formData.login.trim()) return 'Login / Email is required';
    if (!formData.encryptedPassword) return 'Password is required';

    if (formData.encryptedPassword.length < 6) {
      return 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) return 'Confirm password is required';

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

    const payload = {
      name: formData.name.trim(),
      login: formData.login.trim(),
      password: formData.encryptedPassword,
      note: formData.encryptedNote || '',
      url: formData.url.trim(),
      vaultId: selectedVault?.id,
      folderId: selectedFolderId,
      tags: formData.tags,
      isSensitive: formData.isSensitive,
    };

    await handleAdminVerified(payload);
  };

  const handleAdminVerified = async (payload) => {
    try {
      if (!payload) return;

      let rsaPrivateKey = sessionRsaPrivateKey;
      let rsaPublicKey = sessionRsaPublicKey;

      // Self-heal: if session keys were lost (refresh, race), recover them
      // from the server-stored keypair using the session master password.
      if ((!rsaPrivateKey || !rsaPublicKey) && user?.id && sessionMasterPassword) {
        try {
          const kpRes = await api.get('/keypair');
          if (kpRes.data?.encryptedPrivateKey) {
            rsaPrivateKey = await decryptPrivateKey(
              kpRes.data.encryptedPrivateKey,
              sessionMasterPassword,
              kpRes.data.salt
            );
            dispatch(setSessionRsaPrivateKey(rsaPrivateKey));
            if (kpRes.data.publicKey) {
              rsaPublicKey = kpRes.data.publicKey;
              dispatch(setSessionRsaPublicKey(rsaPublicKey));
            }
          }
        } catch (err) {
          console.error('Key recovery failed:', err);
        }
      }

      if (!user?.id || !rsaPrivateKey || !rsaPublicKey) {
        setLocalError(
          'Encryption keys are not ready. Please lock the vault and re-enter your master password, then try again.'
        );
        return;
      }

      const { encryptedData: encryptedPassword, aesKeyJwk } = await encryptTextWithAesKey(
        payload.password
      );

      const { encryptedData: encryptedNote } = payload.note
        ? await encryptTextWithAesKey(payload.note)
        : { encryptedData: '' };

      const wrappedKeys = {};
      if (aesKeyJwk) {
        // Wrap for every authorized user: folder members, admins and
        // department members — so anyone with access can decrypt.
        const recipientIds = await getWrapRecipients(
          payload.folderId,
          user.id,
          selectedFolder?.permissions || []
        );

        const wrapped = await wrapItemKeysForUsers(aesKeyJwk, recipientIds);
        Object.assign(wrappedKeys, wrapped);

        // Always guarantee the creator can decrypt their own item.
        if (!wrappedKeys[user.id] && sessionRsaPublicKey) {
          try {
            wrappedKeys[user.id] = await wrapItemKey(aesKeyJwk, sessionRsaPublicKey);
          } catch {
            // skip
          }
        }
      }

      const strength = getPasswordStrength(payload.password);

      const result = await dispatch(
        createPassword({
          name: payload.name,
          login: payload.login,
          encryptedPassword,
          encryptedNote,
          wrappedKeys: Object.keys(wrappedKeys).length > 0 ? wrappedKeys : null,
          url: payload.url,
          vaultId: payload.vaultId,
          folderId: payload.folderId,
          tags: payload.tags,
          isSensitive: payload.isSensitive,
          strengthScore:
            strength?.label === 'Strong'
              ? 90
              : strength?.label === 'Medium'
                ? 70
                : 40,
          isWeak: strength?.label === 'Weak',
          isOld: false,
          isAtRisk: isPasswordAtRisk(payload.password),
        })
      );

      if (createPassword.fulfilled.match(result)) {
        resetForm();
      } else {
        setLocalError(result.payload || 'Failed to create password');
      }
    } catch (err) {
      console.error('Add password failed:', err);
      setLocalError(
        err?.response?.data?.message ||
          err?.message ||
          'Encryption failed. Please try again.'
      );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Add Password
              </h2>
              <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
                Add password to {selectedFolder?.name || 'selected folder'}
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
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 sm:col-span-2"
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
                {actionLoading ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default AddPasswordModal;