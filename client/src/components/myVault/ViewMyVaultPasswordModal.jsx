import { X, Eye, EyeOff, Copy, Lock } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { decryptText, isEncryptedFormat } from '../../utils/crypto';
import DecryptDialog from '../common/DecryptDialog';

function ViewMyVaultPasswordModal({ open, password, onClose }) {
  const { user } = useSelector((state) => state.auth);

  const [showDecrypt, setShowDecrypt] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [decryptedPassword, setDecryptedPassword] = useState(null);
  const [decryptedNote, setDecryptedNote] = useState(null);
  const [showDecrypted, setShowDecrypted] = useState(false);

  if (!open || !password) return null;

  const isEncrypted = isEncryptedFormat(password.encryptedPassword);
  const needsDecrypt = isEncrypted && !decryptedPassword;
  const displayPassword = isEncrypted ? decryptedPassword : password.encryptedPassword;
  const displayNote = (isEncrypted && isEncryptedFormat(password.encryptedNote))
    ? decryptedNote
    : password.encryptedNote;

  const handleDecrypt = async (masterPassword) => {
    try {
      setDecrypting(true);
      setDecryptError('');

      const decrypted = await decryptText(
        password.encryptedPassword,
        masterPassword,
        user?.encryptionSalt
      );

      let noteText = null;
      if (password.encryptedNote && isEncryptedFormat(password.encryptedNote)) {
        noteText = await decryptText(
          password.encryptedNote,
          masterPassword,
          user?.encryptionSalt
        );
      }

      setDecryptedPassword(decrypted);
      setDecryptedNote(noteText);
      setShowDecrypted(true);
      setShowDecrypt(false);
    } catch {
      setDecryptError('Wrong master password');
      throw new Error('Wrong master password');
    } finally {
      setDecrypting(false);
    }
  };

  const handleCopy = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  const handleClose = () => {
    setShowDecrypt(false);
    setDecryptError('');
    setDecryptedPassword(null);
    setDecryptedNote(null);
    setShowDecrypted(false);
    onClose();
  };

  return (
    <>
      <DecryptDialog
        open={needsDecrypt && showDecrypt}
        onDecrypt={handleDecrypt}
        onClose={() => {
          setShowDecrypt(false);
          setDecryptError('');
          if (!decryptedPassword) onClose();
        }}
        error={decryptError}
        decrypting={decrypting}
      />

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
              <button onClick={() => handleCopy(password.login)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
                <Copy size={16} />
              </button>
            </div>

            {needsDecrypt ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                <p className="text-sm font-medium text-amber-800 mb-3">This password is encrypted</p>
                <button
                  onClick={() => setShowDecrypt(true)}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                >
                  <Lock size={16} className="inline mr-2" />Enter Master Password
                </button>
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
                    <button onClick={() => setShowDecrypted(!showDecrypted)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
                      {showDecrypted ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => handleCopy(displayPassword)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
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
                  <p className="font-medium text-slate-900 mt-1 break-all">{displayNote || 'No note'}</p>
                </div>
              </>
            )}
          </div>

          <button onClick={handleClose} className="w-full mt-5 bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700">
            <Eye size={16} className="inline mr-2" />Done
          </button>
        </div>
      </div>
    </>
  );
}

export default ViewMyVaultPasswordModal;