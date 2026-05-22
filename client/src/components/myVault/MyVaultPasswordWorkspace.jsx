import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Copy,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { decryptText, isEncryptedFormat } from '../../utils/crypto';
import DecryptDialog from '../common/DecryptDialog';

function MyVaultPasswordWorkspace({
  loading,
  passwords,
  selectedPasswordId,
  onSelectPassword,
  onViewPassword,
  onSharePassword,
  onEditPassword,
  onDeletePassword,
  onManageShares,
}) {
  const { user } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] =
    useState(false);
  const [decryptedPassword, setDecryptedPassword] =
    useState(null);

  const [showDecryptDialog, setShowDecryptDialog] =
    useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  const [search, setSearch] =
    useState('');

  const filteredPasswords =
    passwords.filter((item) => {
      const value =
        search.toLowerCase();

      return (
        item.name
          ?.toLowerCase()
          .includes(value) ||
        item.login
          ?.toLowerCase()
          .includes(value)
      );
    });

  const selectedPassword =
    filteredPasswords.find(
      (item) =>
        item.id ===
        selectedPasswordId
    ) || filteredPasswords[0];

  const copyText = (value) => {
    if (!value) return;

    navigator.clipboard.writeText(
      value
    );
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

      setDecryptedPassword(decrypted);
      setShowPassword(true);
      setShowDecryptDialog(false);
    } catch {
      setDecryptError('Wrong master password');
      throw new Error('Wrong master password');
    } finally {
      setDecrypting(false);
    }
  };

  const handleEyeClick = () => {
    if (!selectedPassword) return;

    if (showPassword) {
      setShowPassword(false);
      return;
    }

    if (isEncryptedFormat(selectedPassword.encryptedPassword)) {
      if (decryptedPassword) {
        setShowPassword(true);
      } else {
        setShowDecryptDialog(true);
      }
    } else {
      setShowPassword(true);
    }
  };

  useEffect(() => {
    setShowPassword(false);
    setDecryptedPassword(null);
    setShowDecryptDialog(false);
    setDecryptError('');
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
        }}
        error={decryptError}
        decrypting={decrypting}
      />
      <div className="bg-white rounded-2xl border border-slate-200 min-h-[600px] overflow-hidden">
      {loading ? (
        <div className="p-6 text-slate-500">
          Loading...
        </div>
      ) : passwords.length ===
        0 ? (
        <div className="h-full flex items-center justify-center text-slate-400">
          No passwords found
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] min-h-[600px]">

          {/* Left Side */}
          <div className="border-r border-slate-200 p-5 bg-slate-50/50">
            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search passwords..."
              className="
                w-full
                border border-slate-300
                rounded-lg
                px-4 py-2.5
                text-sm
                outline-none
                bg-white
                mb-5
                focus:border-indigo-500
                focus:ring-2
                focus:ring-indigo-100
              "
            />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Passwords
              </h2>

              <span className="text-sm text-slate-500">
                {
                  filteredPasswords.length
                }
              </span>
            </div>

            <div className="space-y-2">
              {filteredPasswords.map(
                (item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowPassword(
                        false
                      );

                      onSelectPassword(
                        item.id
                      );
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      selectedPassword?.id ===
                      item.id
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <h3 className="font-semibold text-slate-900 truncate">
                      {item.name}
                    </h3>

                    <p className="text-sm text-slate-500 truncate mt-1">
                      {item.login}
                    </p>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="p-8">
            {!selectedPassword ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                Select a password
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold text-slate-900">
                        {
                          selectedPassword.name
                        }
                      </h1>

                      <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
                        Personal
                        Vault
                      </span>
                    </div>

                    <p className="text-slate-500 mt-2 text-sm">
                      Personal
                      password
                      details
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onViewPassword(
                          selectedPassword
                        )
                      }
                      className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                    >
                      <Eye
                        size={17}
                      />
                    </button>

                    <button
                      onClick={() =>
                        onEditPassword(
                          selectedPassword
                        )
                      }
                      className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                    >
                      <Edit2
                        size={17}
                      />
                    </button>

                    <button
                      onClick={() =>
                        onDeletePassword(
                          selectedPassword
                        )
                      }
                      className="w-10 h-10 rounded-full border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50"
                    >
                      <Trash2
                        size={17}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-6 bg-white">

                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {
                        selectedPassword.login
                      }
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Account
                      details
                    </p>
                  </div>

                  <div className="space-y-0">

                    <DetailRow
                      label="Login"
                      value={
                        selectedPassword.login
                      }
                      onCopy={() =>
                        copyText(
                          selectedPassword.login
                        )
                      }
                    />

                    {/* Password */}
                    <div className="border-b border-slate-200 py-5">
                      <div className="grid grid-cols-[140px_1fr_80px] items-center">
                        <p className="text-slate-500">
                          Password
                        </p>

                        <p className="text-slate-900 truncate">
                          {showPassword
                            ? displayValue
                            : '••••••••••••'}
                        </p>

                        <div className="flex justify-end items-center gap-3">
                          <button
                            onClick={handleEyeClick}
                            className="text-slate-500 hover:text-indigo-600"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>

                          <button
                            onClick={() =>
                              copyText(displayValue)
                            }
                            className="text-slate-500 hover:text-slate-900"
                          >
                            <Copy size={17} />
                          </button>
                        </div>
                      </div>

                    </div>

                    <DetailRow
                      label="URL"
                      value={
                        selectedPassword.url ||
                        'No URL'
                      }
                      link
                      onCopy={() =>
                        copyText(
                          selectedPassword.url
                        )
                      }
                    />

                    <DetailRow
                      label="Tags"
                      value={
                        selectedPassword
                          ?.tags
                          ?.length
                          ? selectedPassword.tags
                              .map(
                                (
                                  item
                                ) =>
                                  item
                                    .tag
                                    ?.name
                              )
                              .filter(
                                Boolean
                              )
                              .join(
                                ', '
                              )
                          : 'No tags'
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 mt-7">
                    <button
                      onClick={() =>
                        onSharePassword(
                          selectedPassword
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100"
                    >
                      <Share2
                        size={16}
                      />
                      Share
                      Password
                    </button>

                    <button
                      onClick={() =>
                        onManageShares(
                          selectedPassword
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                    >
                      <Users
                        size={16}
                      />
                      Manage
                      Access
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

function DetailRow({
  label,
  value,
  onCopy,
  link,
}) {
  return (
    <div className="grid grid-cols-[140px_1fr_40px] items-center border-b border-slate-200 py-5 last:border-b-0">
      <p className="text-slate-500">
        {label}
      </p>

      <p
        className={`truncate ${
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
          className="text-slate-500 hover:text-slate-900"
        >
          {link ? (
            <ExternalLink
              size={17}
            />
          ) : (
            <Copy
              size={17}
            />
          )}
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

export default MyVaultPasswordWorkspace;