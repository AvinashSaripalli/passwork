import { useState } from 'react';
import { KeyRound, Lock, X, Eye, EyeOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import TagInput from '../common/TagInput';
import { encryptText } from '../../utils/crypto';
import { getPasswordStrength } from '../../utils/passwordStrength';
import { isPasswordAtRisk } from '../../utils/passwordRisk';

const initialForm = {
  folderId: '',
  name: '',
  login: '',
  encryptedPassword: '',
  url: '',
  encryptedNote: '',
  tags: [],
};

function AddMyVaultPasswordModal({
  open,
  folders,
  selectedFolder,
  onClose,
  onSubmit,
}) {
  const { user, sessionMasterPassword } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [masterError, setMasterError] = useState('');

  if (!open) return null;

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition';

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setFormData(initialForm);
    setShowPassword(false);
    setMasterError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (
      !formData.folderId ||
      !formData.name ||
      !formData.login ||
      !formData.encryptedPassword
    ) {
      return;
    }

    if (!sessionMasterPassword) {
      setMasterError('Session expired. Please re-enter your master password.');
      return;
    }

    try {
      setEncrypting(true);
      setMasterError('');

      const encryptedPassword = await encryptText(
        formData.encryptedPassword,
        sessionMasterPassword,
        user?.encryptionSalt
      );

      const encryptedNote = formData.encryptedNote
        ? await encryptText(formData.encryptedNote, sessionMasterPassword, user?.encryptionSalt)
        : '';

      const strength = getPasswordStrength(formData.encryptedPassword);

      const payload = {
        ...formData,
        encryptedPassword,
        encryptedNote,
        strengthScore: strength?.label === 'Strong' ? 90 : strength?.label === 'Medium' ? 70 : 40,
        isWeak: strength?.label === 'Weak',
        isOld: false,
        isAtRisk: isPasswordAtRisk(formData.encryptedPassword),
      };

      onSubmit(payload);
      setFormData(initialForm);
      setShowPassword(false);
      setMasterError('');
    } catch {
      setMasterError('Encryption failed. Please re-enter your master password.');
    } finally {
      setEncrypting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Add Password</h2>
            <p className="text-sm text-slate-500 mt-1">Create a new password in Personal Vault</p>
          </div>
          <button
            onClick={handleClose}
            className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={19} className="text-slate-500" />
          </button>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-4">
          <p className="text-xs text-slate-500">Selected Folder</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {selectedFolder?.name || 'Select Folder'}
          </p>
        </div>

        <div className="space-y-4">
          <select
            value={formData.folderId}
            onChange={(e) => updateField('folderId', e.target.value)}
            className={inputClass}
          >
            <option value="">Select Folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Name"
              className={inputClass}
            />

            <input
              type="text"
              value={formData.login}
              onChange={(e) => updateField('login', e.target.value)}
              placeholder="Login / Email"
              className={inputClass}
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.encryptedPassword}
                onChange={(e) => updateField('encryptedPassword', e.target.value)}
                placeholder="Password"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <input
              type="text"
              value={formData.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="URL"
              className={inputClass}
            />
          </div>

          <TagInput
            tags={formData.tags}
            setTags={(newTags) => updateField('tags', newTags)}
          />

          <textarea
            rows={2}
            value={formData.encryptedNote}
            onChange={(e) => updateField('encryptedNote', e.target.value)}
            placeholder="Note"
            className={`${inputClass} resize-none`}
          />

          {masterError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{masterError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={encrypting}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
            >
              {encrypting ? (
                <><Lock size={16} className="animate-spin" /> Encrypting...</>
              ) : (
                <><KeyRound size={16} /> Save Password</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddMyVaultPasswordModal;