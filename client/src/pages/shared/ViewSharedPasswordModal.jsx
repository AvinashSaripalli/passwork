import {
  Copy,
  ExternalLink,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';

function ViewSharedPasswordModal({
  open,
  item,
  onClose,
}) {
  const [showPassword, setShowPassword] =
    useState(false);

  if (!open || !item) return null;

  const password = item.password;

  const handleCopy = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  return (
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
            onClick={onClose}
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
        </div>

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
                ? password?.encryptedPassword
                : '••••••••••••'}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="text-slate-500 hover:text-slate-900"
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>

              <button
                onClick={() =>
                  handleCopy(
                    password?.encryptedPassword
                  )
                }
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