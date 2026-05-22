import {
  Copy,
  ExternalLink,
  Lock,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { decryptText, isEncryptedFormat } from '../../utils/crypto';
import DecryptDialog from '../../components/common/DecryptDialog';

function ViewSharedPasswordModal({
  open,
  item,
  onClose,
}) {
  const { user, loginPassword } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState(null);

  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verifyAction, setVerifyAction] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  if (!open || !item) return null;

  const password = item.password;
  const isEncrypted = isEncryptedFormat(password?.encryptedPassword);
  const displayPassword = isEncrypted ? decryptedPassword : password?.encryptedPassword;

  const handleDecrypt = async () => {
    if (!masterPassword) {
      setDecryptError('Owner master password is required');
      return;
    }

    try {
      setDecrypting(true);
      setDecryptError('');

      const ownerSalt = password?.vault?.owner?.encryptionSalt;
      if (!ownerSalt) {
        setDecryptError('Owner encryption salt not available');
        return;
      }

      const decrypted = await decryptText(
        password.encryptedPassword,
        masterPassword,
        ownerSalt
      );

      setDecryptedPassword(decrypted);
      setShowPassword(true);
      setMasterPassword('');
    } catch (err) {
      setDecryptError(
        err instanceof SyntaxError
          ? 'Invalid encrypted data format (was this password encrypted?)'
          : 'Wrong master password'
      );
    } finally {
      setDecrypting(false);
    }
  };

  const handleVerifyAction = async (enteredPassword) => {
    try {
      setVerifying(true);
      setVerifyError('');

      await decryptText(
        password.encryptedPassword,
        enteredPassword,
        user?.encryptionSalt
      );

      setShowVerifyDialog(false);
      setVerifyAction(null);

      if (verifyAction === 'eye') {
        setShowPassword(!showPassword);
      } else if (verifyAction === 'copy') {
        navigator.clipboard.writeText(displayPassword);
      }
    } catch {
      setVerifyError('Wrong password');
      throw new Error('Wrong password');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  const handleClose = () => {
    setShowPassword(false);
    setDecryptedPassword(null);
    setMasterPassword('');
    setDecryptError('');
    setShowVerifyDialog(false);
    setVerifyAction(null);
    setVerifyError('');
    onClose();
  };

  const handleEyeClick = () => {
    if (!decryptedPassword) return;
    if (!loginPassword) {
      setShowVerifyDialog(true);
      setVerifyAction('eye');
      return;
    }
    setShowPassword(!showPassword);
  };

  const handleCopyClick = () => {
    if (!decryptedPassword) return;
    if (!loginPassword) {
      setShowVerifyDialog(true);
      setVerifyAction('copy');
      return;
    }
    navigator.clipboard.writeText(displayPassword);
  };

  return (
    <>
      <DecryptDialog
        open={showVerifyDialog}
        onDecrypt={handleVerifyAction}
        onClose={() => {
          setShowVerifyDialog(false);
          setVerifyAction(null);
          setVerifyError('');
        }}
        error={verifyError}
        decrypting={verifying}
      />

      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Website / Service Name
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  {password?.name}
                </h2>
              </div>

              <p className="text-sm text-slate-500">
                Shared password details
              </p>
            </div>

            <button
              onClick={handleClose}
              className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
            >
              <X
                size={20}
                className="text-slate-500"
              />
            </button>
          </div>

          {/* Shared Info */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-5 text-sm text-slate-600">
            <p>
              Shared by:{' '}
              <span className="font-semibold text-slate-900">
                {item.sharedBy?.fullName}
              </span>
            </p>

            <p className="mt-1">
              Vault:{' '}
              <span className="font-semibold text-slate-900">
                {password?.vault?.name || '-'}
              </span>
            </p>

            <p className="mt-1">
              Folder:{' '}
              <span className="font-semibold text-slate-900">
                {password?.folder?.name || '-'}
              </span>
            </p>

            <p className="mt-1">
              Owner:{' '}
              <span className="font-semibold text-slate-900">
                {password?.vault?.owner?.fullName || 'Unknown'}
              </span>
            </p>
          </div>

          {/* Decrypt prompt (only for encrypted passwords) */}
          {isEncrypted && !decryptedPassword && (
            <div className="rounded-xl border border-slate-200 p-5 mb-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Enter the owner's master password to decrypt &amp; view
              </p>
              <p className="text-xs text-slate-500">
                Owner: {password?.vault?.owner?.fullName || 'Unknown'}
              </p>

              {decryptError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{decryptError}</p>
                </div>
              )}

              <div className="relative">
                <input
                  type={showMasterPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => { setMasterPassword(e.target.value); setDecryptError(''); }}
                  placeholder="Owner's login password"
                  className="w-full border border-slate-300 rounded-lg px-4 pr-11 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showMasterPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <button
                onClick={handleDecrypt}
                disabled={decrypting}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {decrypting ? (
                  <><Lock size={16} className="animate-spin" /> Decrypting...</>
                ) : (
                  <><Lock size={16} /> Decrypt</>
                )}
              </button>
            </div>
          )}

          {/* Details */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">

            <DetailRow
              label="Login"
              value={password?.login}
              onCopy={() =>
                handleCopy(password?.login)
              }
            />

            {/* Password Row with Eye Icon */}
            <div className="grid grid-cols-[110px_1fr_70px] items-center border-b border-slate-200 px-4 py-4">
              <p className="text-sm text-slate-500">
                Password
              </p>

              <p className="text-sm text-slate-900 break-all">
                {showPassword
                  ? (displayPassword || '••••••••••••')
                  : '••••••••••••'}
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleEyeClick}
                  className="text-slate-500 hover:text-slate-900"
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>

                <button
                  onClick={handleCopyClick}
                  className="text-slate-500 hover:text-slate-900"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <DetailRow
              label="URL"
              value={
                password?.url || 'No URL'
              }
              link
              onCopy={() =>
                handleCopy(password?.url)
              }
            />

            <DetailRow
              label="Note"
              value={
                password?.encryptedNote ||
                'No note'
              }
            />

            <DetailRow
              label="Tags"
              value={
                password?.tags?.length
                  ? password.tags
                      .map(
                        (item) =>
                          item.tag?.name
                      )
                      .filter(Boolean)
                      .join(', ')
                  : 'No tags'
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
  link,
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_40px] items-center border-b border-slate-200 px-4 py-4 last:border-b-0">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`text-sm break-all ${
          link
            ? 'text-blue-600'
            : 'text-slate-900'
        }`}
      >
        {value}
      </p>

      {onCopy ? (
        <button
          onClick={onCopy}
          className="text-slate-500 hover:text-slate-900 flex justify-end"
        >
          {link ? (
            <ExternalLink size={16} />
          ) : (
            <Copy size={16} />
          )}
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

export default ViewSharedPasswordModal;