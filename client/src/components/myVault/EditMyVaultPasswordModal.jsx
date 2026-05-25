import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { decryptText, encryptText } from '../../utils/crypto';
import { getPasswordStrength } from '../../utils/passwordStrength';
import { isPasswordOld, isPasswordAtRisk } from '../../utils/passwordRisk';

function EditMyVaultPasswordModal({
  open,
  password,
  folders,
  onClose,
  onSubmit,
}) {
  const { user, sessionMasterPassword } = useSelector((state) => state.auth);

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
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  useEffect(() => {
    if (password && sessionMasterPassword) {
      const initForm = async () => {
        setDecrypting(true);
        setDecryptError('');

        try {
          const plainPassword = await decryptText(
            password.encryptedPassword,
            sessionMasterPassword,
            user?.encryptionSalt
          );

          const plainNote = password.encryptedNote
            ? await decryptText(
                password.encryptedNote,
                sessionMasterPassword,
                user?.encryptionSalt
              )
            : '';

          setFormData({
            folderId: password.folderId || '',
            name: password.name || '',
            login: password.login || '',
            encryptedPassword: plainPassword,
            url: password.url || '',
            encryptedNote: plainNote,
            tags: password.tags?.map((item) => item.tag?.name).join(', ') || '',
          });
        } catch {
          setDecryptError('Failed to decrypt password. Your session may have expired.');
        } finally {
          setDecrypting(false);
        }
      };

      initForm();

      setShowPassword(false);
    }
  }, [password, sessionMasterPassword, user?.encryptionSalt]);

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

  const handleSubmit = async () => {
    if (!formData.name || !formData.login || !formData.encryptedPassword) {
      return;
    }

    if (!sessionMasterPassword) {
      setDecryptError('Session expired. Please re-enter your master password.');
      return;
    }

    try {
      const encryptedPassword = await encryptText(
        formData.encryptedPassword,
        sessionMasterPassword,
        user?.encryptionSalt
      );

      const encryptedNote = formData.encryptedNote
        ? await encryptText(
            formData.encryptedNote,
            sessionMasterPassword,
            user?.encryptionSalt
          )
        : '';

      const strength = getPasswordStrength(formData.encryptedPassword);

      onSubmit({
        ...formData,
        encryptedPassword,
        encryptedNote,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        strengthScore: strength?.label === 'Strong' ? 90 : strength?.label === 'Medium' ? 70 : 40,
        isWeak: strength?.label === 'Weak',
        isOld: isPasswordOld(password.lastUpdatedAt, password.createdAt),
        isAtRisk: isPasswordAtRisk(formData.encryptedPassword),
      });

      setShowPassword(false);
    } catch {
      setDecryptError('Encryption failed. Please try again.');
    }
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

        {decrypting && (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <p className="text-sm text-indigo-600">Decrypting password…</p>
          </div>
        )}

        {decryptError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{decryptError}</p>
          </div>
        )}

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
              disabled={decrypting}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {decrypting ? <>&#9889; Processing…</> : <><KeyRound size={16} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditMyVaultPasswordModal;