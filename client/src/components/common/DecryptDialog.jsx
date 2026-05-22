import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { useState } from 'react';

function DecryptDialog({ open, onDecrypt, onClose, error, decrypting }) {
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);

  if (!open) return null;

  const handleSubmit = () => {
    if (!masterPassword) return;
    onDecrypt(masterPassword);
  };

  const handleCancel = () => {
    setMasterPassword('');
    setShowMasterPassword(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Lock size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Master Password Required</h2>
              <p className="text-sm text-slate-500">Enter your master password to decrypt</p>
            </div>
          </div>
          <button onClick={handleCancel} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="relative mb-4">
          <input
            type={showMasterPassword ? 'text' : 'password'}
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Master password"
            autoFocus
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

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={decrypting || !masterPassword}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {decrypting ? (
              <><Lock size={16} className="animate-spin" /> Decrypting...</>
            ) : (
              <><Lock size={16} /> Decrypt</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DecryptDialog;
