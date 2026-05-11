import { X, Eye, Copy } from 'lucide-react';

function ViewMyVaultPasswordModal({ open, password, onClose }) {
  if (!open || !password) return null;

  const handleCopy = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-slate-900">
            View Password
          </h2>

          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
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

          <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Password</p>
              <p className="font-medium text-slate-900 mt-1">
                {password.encryptedPassword}
              </p>
            </div>

            <button
              onClick={() => handleCopy(password.encryptedPassword)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              <Copy size={16} />
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">URL</p>
            <p className="font-medium text-blue-600 mt-1">
              {password.url || 'No URL'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Note</p>
            <p className="font-medium text-slate-900 mt-1">
              {password.encryptedNote || 'No note'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-indigo-600 text-white rounded-xl py-3 font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
        >
          <Eye size={16} />
          Done
        </button>
      </div>
    </div>
  );
}

export default ViewMyVaultPasswordModal;