import { Copy, ExternalLink, X, Eye, EyeOff, Globe, User, Folder, KeyRound } from 'lucide-react';
import { useState } from 'react';
import api from '../../services/api';

function ViewSharedPasswordModal({ open, item, decryptedData, onClose }) {
  const [showPw, setShowPw] = useState(false);

  if (!open || !item) return null;

  const password = item.password;
  const displayPassword = decryptedData?.password || password?.encryptedPassword;
  const displayNote = decryptedData?.note || password?.encryptedNote || 'No note';

  const handleCopy = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    api.post(`/passwords/${password.id}/copy-log`).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-8 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <KeyRound size={22} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Shared Password</p>
                <h2 className="text-xl font-bold text-slate-900">{password?.name}</h2>
                <p className="text-sm text-slate-500">
                  Shared by <span className="font-medium text-slate-700">{item.sharedBy?.fullName || 'a user'}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shrink-0">
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="px-8 py-5 space-y-5">
          <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              <div className="p-4 space-y-3">
                <MetaItem icon={User} label="Shared by" value={item.sharedBy?.fullName} />
                <MetaItem icon={User} label="Owner" value={password?.vault?.owner?.fullName || 'Unknown'} />
              </div>
              <div className="p-4 space-y-3">
                <MetaItem icon={Folder} label="Vault" value={password?.vault?.name || '-'} />
                <MetaItem icon={Folder} label="Folder" value={password?.folder?.name || '-'} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <Row label="Login" value={password?.login} onCopy={() => handleCopy(password?.login)} copyIcon />

            <Row label="Password" value={showPw ? (displayPassword || '') : '••••••••••••'} mono>
              <IconBtn onClick={() => setShowPw((p) => !p)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </IconBtn>
              <IconBtn onClick={() => handleCopy(displayPassword)}>
                <Copy size={15} />
              </IconBtn>
            </Row>

            <Row label="URL" value={password?.url || 'No URL'} link onCopy={() => handleCopy(password?.url)} external />

            <Row label="Note" value={displayNote || 'No note'} />

            <Row label="Tags" value={password?.tags?.length ? password.tags.map((t) => t.tag?.name).filter(Boolean).join(', ') : 'No tags'} />
          </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Securely shared via Vaultix</p>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value, children, link, mono, onCopy, copyIcon, external }) {
  const isUrl = link && value && value !== 'No URL';
  return (
    <div className="flex items-center justify-between px-5 py-4 min-h-[52px]">
      <p className="text-sm text-slate-500 shrink-0 w-20">{label}</p>
      <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
        {children}
        {isUrl ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[240px] flex items-center gap-1">
            <Globe size={13} className="shrink-0" />
            <span className="truncate">{value}</span>
          </a>
        ) : (
          <span className={`text-sm truncate max-w-[240px] ${mono ? 'font-mono tracking-wider' : 'text-slate-900'}`}>{value}</span>
        )}
        {onCopy ? (
          <IconBtn onClick={onCopy}>
            {external ? <ExternalLink size={15} /> : <Copy size={15} />}
          </IconBtn>
        ) : null}
      </div>
    </div>
  );
}

function IconBtn({ onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${disabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}

export default ViewSharedPasswordModal;
