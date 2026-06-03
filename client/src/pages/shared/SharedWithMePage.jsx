import { useEffect, useMemo, useState } from 'react';
import { Eye, ExternalLink, Globe, KeyRound, Search, Share2, User, Folder, ChevronRight, Lock, EyeOff } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';
import ViewSharedPasswordModal from './ViewSharedPasswordModal';
import { fetchSharedWithMe } from '../../features/sharedPasswords/sharedPasswordsSlice';
import { decryptText, isEncryptedFormat } from '../../utils/crypto';
import api from '../../services/api';

function SharedWithMePage() {
  const dispatch = useDispatch();
  const { sharedWithMe, loading, error } = useSelector((state) => state.sharedPasswords);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedShare, setSelectedShare] = useState(null);
  const [decryptOpen, setDecryptOpen] = useState(false);
  const [decryptItem, setDecryptItem] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [decryptedData, setDecryptedData] = useState({});

  useEffect(() => { dispatch(fetchSharedWithMe()); }, [dispatch]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return sharedWithMe.filter((i) =>
      i.password?.name?.toLowerCase().includes(q) ||
      i.password?.login?.toLowerCase().includes(q) ||
      i.password?.url?.toLowerCase().includes(q) ||
      i.sharedBy?.fullName?.toLowerCase().includes(q)
    );
  }, [sharedWithMe, searchTerm]);

  const handleView = (item) => {
    const password = item.password;
    const isEncrypted = isEncryptedFormat(password?.encryptedPassword);

    if (isEncrypted) {
      setDecryptItem(item);
      setMasterPassword('');
      setDecryptError('');
      setDecryptOpen(true);
    } else {
      setSelectedShare(item);
      setViewOpen(true);
    }
  };

  const handleDecrypt = async () => {
    if (!masterPassword || !decryptItem) return;
    try {
      setDecrypting(true);
      setDecryptError('');
      const password = decryptItem.password;
      const ownerSalt = password?.vault?.owner?.encryptionSalt;
      if (!ownerSalt) { setDecryptError('Owner encryption salt not available'); return; }

      const decrypted = await decryptText(password.encryptedPassword, masterPassword, ownerSalt);
      let noteText = null;
      if (password.encryptedNote && isEncryptedFormat(password.encryptedNote)) {
        noteText = await decryptText(password.encryptedNote, masterPassword, ownerSalt);
      }

      setDecryptedData((prev) => ({
        ...prev,
        [decryptItem.id]: { password: decrypted, note: noteText },
      }));
      setDecryptOpen(false);
      setMasterPassword('');
      setSelectedShare(decryptItem);
      setViewOpen(true);

      api.post(`/passwords/${password.id}/view-log`).catch(() => {});
    } catch { setDecryptError('Wrong master password'); }
    finally { setDecrypting(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Share2 size={22} className="text-indigo-600" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shared With Me</h1>
            <p className="text-sm text-slate-500">Passwords shared with you by other users</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, login, or shared by..."
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-50/50 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-16">
              <div className="space-y-4 max-w-2xl mx-auto">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="h-10 w-10 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded-lg w-1/3" />
                      <div className="h-3 bg-slate-200 rounded-lg w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="m-5 rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="min-h-[450px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mb-5">
                <Share2 size={28} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">
                {searchTerm ? 'No matches found' : 'No shared passwords'}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-xs">
                {searchTerm ? 'Try a different search term.' : 'Passwords shared with you will appear here.'}
              </p>
            </div>
          ) : (
            <div>
              <div className="hidden lg:grid grid-cols-[2fr_1.2fr_1fr_1.2fr_100px] gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 sticky top-0">
                <p>Password</p>
                <p>URL</p>
                <p>Shared By</p>
                <p>Location</p>
                <p className="text-center">Action</p>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr_1fr_1.2fr_100px] gap-4 items-center px-6 py-4.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                        <KeyRound size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.password?.name}</p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <User size={11} />
                          {item.password?.login || 'No login'}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="lg:hidden text-xs font-medium text-slate-400 mb-1">URL</p>
                      {item.password?.url ? (
                        <a href={item.password.url.startsWith('http') ? item.password.url : `https://${item.password.url}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate flex items-center gap-1.5">
                          <Globe size={13} className="shrink-0" />
                          <span className="truncate">{item.password.url}</span>
                          <ExternalLink size={11} className="shrink-0 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400 truncate flex items-center gap-1.5">
                          <Globe size={13} className="shrink-0" />
                          No URL
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="lg:hidden text-xs font-medium text-slate-400 mb-1">Shared By</p>
                      <p className="text-sm font-medium text-slate-700 truncate">{item.sharedBy?.fullName || '-'}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="lg:hidden text-xs font-medium text-slate-400 mb-1">Location</p>
                      <p className="text-sm text-slate-600 truncate flex items-center gap-1">
                        <Folder size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{item.password?.vault?.name || '-'}</span>
                        <ChevronRight size={10} className="text-slate-300 shrink-0" />
                        <span className="truncate">{item.password?.folder?.name || '-'}</span>
                      </p>
                    </div>

                    <button onClick={() => handleView(item)} className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3.5 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                      <Eye size={14} />
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {decryptOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Encrypted Password</h2>
                <p className="text-sm text-slate-500 mt-1">Enter the owner's master password to decrypt</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                {decryptError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{decryptError}</div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Owner: {decryptItem?.password?.vault?.owner?.fullName || 'Unknown'}</p>
                  <div className="relative">
                    <input
                      type={showMasterPassword ? 'text' : 'password'}
                      value={masterPassword}
                      onChange={(e) => { setMasterPassword(e.target.value); setDecryptError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
                      placeholder="Owner's master password"
                      autoFocus
                      className="w-full h-11 rounded-xl border border-slate-200 px-4 pr-11 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                    />
                    <button type="button" onClick={() => setShowMasterPassword(!showMasterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showMasterPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <button onClick={handleDecrypt} disabled={decrypting || !masterPassword} className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm">
                  {decrypting ? <><Lock size={16} className="animate-spin" /> Decrypting...</> : <><Lock size={16} /> Decrypt</>}
                </button>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex justify-end">
                <button onClick={() => { setDecryptOpen(false); setDecryptItem(null); setMasterPassword(''); setDecryptError(''); }} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <ViewSharedPasswordModal
          open={viewOpen}
          item={selectedShare}
          decryptedData={decryptedData[selectedShare?.id]}
          onClose={() => { setViewOpen(false); setSelectedShare(null); }}
        />
      </div>
    </AppLayout>
  );
}

export default SharedWithMePage;
