import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Copy,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { decryptText, isEncryptedFormat } from '../../utils/crypto';
import { showToast } from '../../utils/toast';
import { secureCopyText } from '../../utils/clipboard';
import DecryptDialog from '../common/DecryptDialog';
import VerifyMasterPasswordModal from '../security/VerifyMasterPasswordModal';

function MyVaultPasswordWorkspace({
  loading,
  passwords,
  selectedPasswordId,
  onSelectPassword,
  onSharePassword,
  onEditPassword,
  onDeletePassword,
  onManageShares,
}) {
  const { user, sessionMasterPassword } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState(null);
  const [showDecryptDialog, setShowDecryptDialog] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [search, setSearch] = useState('');

  const filteredPasswords = passwords.filter((item) => {
    const value = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(value) ||
      item.login?.toLowerCase().includes(value)
    );
  });

  const selectedPassword =
    filteredPasswords.find((item) => item.id === selectedPasswordId) ||
    filteredPasswords[0];

  const copyText = (value) => {
    secureCopyText(value, 'Copied to clipboard');
  };

  const revealDecrypted = (decrypted) => {
    setDecryptedPassword(decrypted);
    setShowPassword(true);
  };

  const handleDecryptPassword = async (masterPassword) => {
    try {
      setDecrypting(true);
      setDecryptError('');

      const decrypted = await decryptText(
        selectedPassword.encryptedPassword,
        masterPassword,
        user?.encryptionSalt
      );

      revealDecrypted(decrypted);
      setShowDecryptDialog(false);

      if (pendingAction === 'copy') {
        copyText(decrypted);
      }

      setPendingAction(null);
    } catch {
      setDecryptError('Wrong master password');
      throw new Error('Wrong master password');
    } finally {
      setDecrypting(false);
    }
  };

  const handleVerified = async (masterPassword) => {
    try {
      const decrypted = await decryptText(
        selectedPassword.encryptedPassword,
        masterPassword,
        user?.encryptionSalt
      );

      revealDecrypted(decrypted);

      if (pendingAction === 'copy') {
        copyText(decrypted);
      }
    } catch {
      showToast('Failed to decrypt. Wrong master password.', 'error');
    } finally {
      setPendingAction(null);
      setVerifyOpen(false);
    }
  };

  const handleEyeClick = () => {
    if (!selectedPassword) return;

    if (showPassword) {
      setShowPassword(false);
      return;
    }

    if (selectedPassword.isSensitive) {
      setPendingAction('reveal');
      setVerifyOpen(true);
      return;
    }

    if (isEncryptedFormat(selectedPassword.encryptedPassword)) {
      if (decryptedPassword) {
        setShowPassword(true);
      } else if (sessionMasterPassword) {
        setDecrypting(true);
        decryptText(
          selectedPassword.encryptedPassword,
          sessionMasterPassword,
          user?.encryptionSalt
        )
          .then((decrypted) => revealDecrypted(decrypted))
          .catch(() => setShowDecryptDialog(true))
          .finally(() => setDecrypting(false));
      } else {
        setShowDecryptDialog(true);
      }
    } else {
      setShowPassword(true);
    }
  };

  const handleCopyPassword = async () => {
    if (!selectedPassword) return;

    if (selectedPassword.isSensitive) {
      setPendingAction('copy');
      setVerifyOpen(true);
      return;
    }

    if (decryptedPassword) {
      copyText(decryptedPassword);
      return;
    }

    if (isEncryptedFormat(selectedPassword.encryptedPassword)) {
      if (sessionMasterPassword) {
        try {
          const decrypted = await decryptText(
            selectedPassword.encryptedPassword,
            sessionMasterPassword,
            user?.encryptionSalt
          );
          setDecryptedPassword(decrypted);
          copyText(decrypted);
        } catch {
          setPendingAction('copy');
          setShowDecryptDialog(true);
        }
      } else {
        setPendingAction('copy');
        setShowDecryptDialog(true);
      }
    } else {
      copyText(selectedPassword.encryptedPassword);
    }
  };

  useEffect(() => {
    setShowPassword(false);
    setDecryptedPassword(null);
    setShowDecryptDialog(false);
    setDecryptError('');
    setVerifyOpen(false);
    setPendingAction(null);
  }, [selectedPassword?.id]);

  const displayValue = decryptedPassword || selectedPassword?.encryptedPassword;

  return (
    <>
      <DecryptDialog
        open={showDecryptDialog}
        onDecrypt={handleDecryptPassword}
        onClose={() => {
          setShowDecryptDialog(false);
          setDecryptError('');
          setPendingAction(null);
        }}
        error={decryptError}
        decrypting={decrypting}
      />
      <VerifyMasterPasswordModal
        open={verifyOpen}
        onClose={() => {
          setVerifyOpen(false);
          setPendingAction(null);
        }}
        onVerified={handleVerified}
        samples={passwords.map((item) => item.encryptedPassword)}
      />
      <div className="bg-white rounded-2xl border border-slate-200 min-h-[600px] overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        {loading ? (
          <div className="p-6 text-slate-500 dark:text-slate-400">Loading...</div>
        ) : passwords.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
            No passwords found
          </div>
        ) : (
          <div className="grid grid-cols-[320px_1fr] min-h-[600px]">

            {/* Left Side */}
            <div className="border-r border-slate-200 p-5 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search passwords..."
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none bg-white mb-5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
              />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Passwords</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">{filteredPasswords.length}</span>
              </div>

              <div className="space-y-2">
                {filteredPasswords.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowPassword(false);
                      onSelectPassword(item.id);
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      selectedPassword?.id === item.id
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                        : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
                  >
                    <h3 className="font-semibold text-slate-900 truncate flex items-center gap-1.5 dark:text-slate-100">
                      {item.name}
                      {item.isSensitive && (
                        <Lock size={12} className="text-emerald-600 shrink-0 dark:text-emerald-400" />
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 truncate mt-1 dark:text-slate-400">{item.login}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side */}
            <div className="p-8">
              {!selectedPassword ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                  Select a password
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {selectedPassword.name}
                        </h1>
                        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium dark:bg-indigo-900/20 dark:text-indigo-400">
                          Personal Vault
                        </span>
                        {selectedPassword.isSensitive && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium dark:bg-emerald-900/20 dark:text-emerald-400">
                            <Lock size={12} />
                            Secure
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-2 text-sm dark:text-slate-400">Personal password details</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditPassword(selectedPassword)}
                        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                      >
                        <Edit2 size={17} />
                      </button>
                      <button
                        onClick={() => onDeletePassword(selectedPassword)}
                        className="w-10 h-10 rounded-full border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-6 bg-white dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {selectedPassword.login}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Account details</p>
                    </div>

                    <div className="space-y-0">
                      <DetailRow
                        label="Login"
                        value={selectedPassword.login}
                        onCopy={() => copyText(selectedPassword.login)}
                      />

                      {/* Password */}
                      <div className="border-b border-slate-200 py-5 dark:border-slate-700">
                        <div className="grid grid-cols-[140px_1fr_80px] items-center">
                          <p className="text-slate-500 dark:text-slate-400">Password</p>
                          <p className="text-slate-900 truncate dark:text-slate-100">
                            {showPassword ? displayValue : '••••••••••••'}
                          </p>
                          <div className="flex justify-end items-center gap-3">
                            <button
                              onClick={handleEyeClick}
                              className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button
                              onClick={handleCopyPassword}
                              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                              <Copy size={17} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <DetailRow
                        label="URL"
                        value={selectedPassword.url || 'No URL'}
                        link
                        onCopy={() => copyText(selectedPassword.url)}
                      />

                      <div className="border-b border-slate-200 py-5 dark:border-slate-700">
                        <div className="grid grid-cols-[140px_1fr_40px] items-start">
                          <p className="text-slate-500 dark:text-slate-400">Tags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPassword?.tags?.length
                              ? selectedPassword.tags
                                  .map((item) => item.tag?.name)
                                  .filter(Boolean)
                                  .map((name) => (
                                    <span
                                      key={name}
                                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium dark:bg-indigo-900/20 dark:text-indigo-400"
                                    >
                                      {name}
                                    </span>
                                  ))
                              : <span className="text-slate-900 dark:text-slate-100">No tags</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-7">
                      <button
                        onClick={() => onSharePassword(selectedPassword)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-800"
                      >
                        <Share2 size={16} />
                        Share Password
                      </button>
                      <button
                        onClick={() => onManageShares(selectedPassword)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        <Users size={16} />
                        Manage Access
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value, onCopy, link }) {
  const isUrl = link && value && value !== 'No URL';
  return (
    <div className="grid grid-cols-[140px_1fr_40px] items-center border-b border-slate-200 py-5 dark:border-slate-700 last:border-b-0">
      <p className="text-slate-500 dark:text-slate-400">{label}</p>
      {isUrl ? (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer"
          className="truncate text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-400"
        >
          {value}
        </a>
      ) : (
        <p className={`truncate ${link ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
      )}
      {onCopy ? (
        <button onClick={onCopy} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
          {link ? <ExternalLink size={17} /> : <Copy size={17} />}
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

export default MyVaultPasswordWorkspace;