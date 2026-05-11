import { Copy, ExternalLink, X } from 'lucide-react';

function ViewSharedPasswordModal({ open, item, onClose }) {
  if (!open || !item) return null;

  const password = item.password;

  const handleCopy = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {password?.name}
            </h2>
            <p className="text-sm text-slate-500">
              Shared password details
            </p>
          </div>

          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 mb-5 text-sm text-slate-600">
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

        <div className="rounded-2xl border border-slate-200 p-5">
          <DetailRow
            label="Login"
            value={password?.login}
            onCopy={() => handleCopy(password?.login)}
          />

          <DetailRow
            label="Password"
            value={password?.encryptedPassword}
            onCopy={() => handleCopy(password?.encryptedPassword)}
          />

          <DetailRow
            label="URL"
            value={password?.url || 'No URL'}
            link
            onCopy={() => handleCopy(password?.url)}
          />

          <DetailRow
            label="Note"
            value={password?.encryptedNote || 'No note'}
          />

          <DetailRow
            label="Tags"
            value={
              password?.tags?.length
                ? password.tags
                    .map((item) => item.tag?.name)
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

function DetailRow({ label, value, onCopy, link }) {
  return (
    <div className="grid grid-cols-[120px_1fr_40px] items-center border-b border-slate-200 py-4 last:border-b-0">
      <p className="text-sm text-slate-500">{label}</p>

      <p className={`${link ? 'text-blue-600' : 'text-slate-900'} text-sm break-all`}>
        {value}
      </p>

      {onCopy && (
        <button
          onClick={onCopy}
          className="text-slate-500 hover:text-slate-900"
        >
          {link ? <ExternalLink size={16} /> : <Copy size={16} />}
        </button>
      )}
    </div>
  );
}

export default ViewSharedPasswordModal;