import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, Copy } from 'lucide-react';
import { useSelector } from 'react-redux';
import { decryptText, isEncryptedFormat } from '../../utils/crypto';

function ViewMyVaultPasswordModal({ open, password, onClose }) {
  const { user, sessionMasterPassword } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decryptedPassword, setDecryptedPassword] = useState(null);
  const [decryptedNote, setDecryptedNote] = useState(null);
  const [showDecrypted, setShowDecrypted] = useState(false);

  useEffect(() => {
    if (open && password) {
      setLoading(true);
      setError('');
      setShowDecrypted(false);
      setDecryptedPassword(null);
      setDecryptedNote(null);

      if (!isEncryptedFormat(password.encryptedPassword)) {
        setDecryptedPassword(password.encryptedPassword);
        setDecryptedNote(password.encryptedNote || null);
        setLoading(false);
        return;
      }

      if (!sessionMasterPassword) {
        setError('Session expired. Please re-enter your master password.');
        setLoading(false);
        return;
      }

      (async () => {
        try {
          const decrypted = await decryptText(
            password.encryptedPassword,
            sessionMasterPassword,
            user?.encryptionSalt
          );

          let noteText = null;
          if (password.encryptedNote && isEncryptedFormat(password.encryptedNote)) {
            noteText = await decryptText(
              password.encryptedNote,
              sessionMasterPassword,
              user?.encryptionSalt
            );
          }

          setDecryptedPassword(decrypted);
          setDecryptedNote(noteText);
        } catch {
          setError('Failed to decrypt. Wrong master password.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open, password, sessionMasterPassword, user?.encryptionSalt]);

  const handleCopy = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  const handleClose = () => {
    setDecryptedPassword(null);
    setDecryptedNote(null);
    setShowDecrypted(false);
    setError('');
    onClose();
  };

  if (!open || !password) return null;

  const displayPassword = decryptedPassword || '••••••••••••';
  const displayNote = decryptedNote ?? (password.encryptedNote || 'No note');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-slate-900">View Password</h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Name</p>
            <p className="font-semibold text-slate-900 mt-1">{password.name}</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Login</p>
              <p className="font-medium text-slate-900 mt-1">{password.login}</p>
            </div>
            <button
              onClick={() => handleCopy(password.login)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              <Copy size={16} />
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-500">Decrypting...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500">Password</p>
                  <p className="font-medium text-slate-900 mt-1 break-all">
                    {showDecrypted ? displayPassword : '••••••••••••'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button
                    onClick={() => setShowDecrypted(!showDecrypted)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                  >
                    {showDecrypted ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => decryptedPassword && handleCopy(displayPassword)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">URL</p>
                <p className="font-medium text-blue-600 mt-1">{password.url || 'No URL'}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Note</p>
                <p className="font-medium text-slate-900 mt-1 break-all">{displayNote}</p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleClose}
          className="w-full mt-5 bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default ViewMyVaultPasswordModal;