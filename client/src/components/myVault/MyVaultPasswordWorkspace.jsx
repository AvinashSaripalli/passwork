import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Lock } from 'lucide-react';
import ItemTypeBadge from './ItemTypeBadge';
import ItemDetailsPanel from './ItemDetailsPanel';
import { getItemTypeMeta } from '../../utils/itemTypes';

function MyVaultPasswordWorkspace({
  loading,
  passwords,
  selectedPasswordId,
  onSelectPassword,
  onSharePassword,
  onEditPassword,
  onDeletePassword,
  onManageShares,
  onAddChild,
}) {
  const { user, sessionMasterPassword } = useSelector((state) => state.auth);
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

  const selectedPasswordChildren = selectedPassword
    ? passwords.filter((item) => item.parentId === selectedPassword.id)
    : [];

  const selectedPasswordParent = selectedPassword
    ? passwords.find((item) => item.id === selectedPassword.parentId)
    : null;

  const handleSelect = (id) => {
    onSelectPassword(id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 min-h-[600px] overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      {loading ? (
        <div className="p-6 text-slate-500 dark:text-slate-400">Loading...</div>
      ) : passwords.length === 0 ? (
        <div className="h-full min-h-[600px] flex items-center justify-center text-slate-400 dark:text-slate-500">
          No items found
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] min-h-[600px]">
          {/* Left Side */}
          <div className="border-r border-slate-200 p-5 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none bg-white mb-5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
            />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Items</h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">{filteredPasswords.length}</span>
            </div>

            <div className="space-y-2">
              {filteredPasswords.map((item) => {
                const meta = getItemTypeMeta(item.type);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      selectedPassword?.id === item.id
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                        : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {item.parentId && (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">↳</span>
                      )}
                      <h3 className="font-semibold text-slate-900 truncate flex items-center gap-1.5 flex-1 dark:text-slate-100">
                        {item.name}
                      </h3>
                      {item.isSensitive && (
                        <Lock size={12} className="text-emerald-600 shrink-0 dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-sm text-slate-500 truncate dark:text-slate-400">
                        {item.login || meta.label}
                      </p>
                      <ItemTypeBadge type={item.type} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side */}
          <div className="p-8">
            {!selectedPassword ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                Select an item
              </div>
            ) : (
              <>
                <ItemDetailsPanel
                  item={selectedPassword}
                  parent={selectedPasswordParent}
                  children={selectedPasswordChildren}
                  onSelectChild={handleSelect}
                  onAddChild={() => onAddChild(selectedPassword)}
                  onShare={onSharePassword}
                  onEdit={onEditPassword}
                  onDelete={onDeletePassword}
                  onManageShares={onManageShares}
                  user={user}
                  sessionMasterPassword={sessionMasterPassword}
                  samples={passwords.map((item) => item.encryptedPassword)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MyVaultPasswordWorkspace;
