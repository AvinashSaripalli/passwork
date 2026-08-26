import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import {
  selectPassword,
  setSearchTerm,
} from '../../features/vault/vaultSlice';

function PasswordListPanel() {
  const dispatch = useDispatch();
  const {
    passwords,
    selectedPasswordId,
    searchTerm,
    selectedFolderId,
  } = useSelector((state) => state.vault);

  const filteredPasswords = passwords.filter((item) => {
    const q = searchTerm.toLowerCase();

    const matchesSearch =
      item.name?.toLowerCase().includes(q) ||
      item.login?.toLowerCase().includes(q) ||
      item.url?.toLowerCase().includes(q);

    const matchesFolder = selectedFolderId
      ? item.folderId === selectedFolderId
      : true;

    return matchesSearch && matchesFolder;
  });

  const groupedPasswords = Object.values(
    filteredPasswords.reduce((acc, item) => {
      const key = item.name?.trim().toLowerCase() || 'untitled';

      if (!acc[key]) {
        acc[key] = {
          name: item.name || 'Untitled',
          items: [],
        };
      }

      acc[key].items.push(item);
      return acc;
    }, {})
  );

  useEffect(() => {
    if (!selectedFolderId) {
      dispatch(selectPassword(null));
      return;
    }

    const stillVisible = filteredPasswords.some(
      (item) => item.id === selectedPasswordId
    );

    if (!filteredPasswords.length) {
      dispatch(selectPassword(null));
      return;
    }

    if (!stillVisible) {
      dispatch(selectPassword(filteredPasswords[0].id));
    }
  }, [filteredPasswords, selectedPasswordId, selectedFolderId, dispatch]);

  return (
    <div className="bg-white p-6 border-r border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search passwords..."
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          className="w-full h-[48px] rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-slate-800/50 dark:border-slate-700"
        />
      </div>

      <p className="text-[28px] font-bold text-slate-900 mb-6 dark:text-slate-100">
        {groupedPasswords.length} password
        {groupedPasswords.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-3">
        {groupedPasswords.map((group) => {
          const active = group.items.some(
            (item) => item.id === selectedPasswordId
          );

          return (
            <button
              key={group.name}
              onClick={() => dispatch(selectPassword(group.items[0].id))}
              className={`w-full text-left px-5 py-5 rounded-2xl border transition ${
                active
                  ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-700'
              }`}
            >
              <div className="text-[18px] font-bold text-slate-900 dark:text-slate-100">
                {group.name}
              </div>

              <div className="text-sm text-slate-500 mt-1 dark:text-slate-400">
                {group.items.length} account{group.items.length > 1 ? 's' : ''}
              </div>
            </button>
          );
        })}

        {!groupedPasswords.length && (
          <p className="text-slate-500 text-sm dark:text-slate-400">No passwords found.</p>
        )}
      </div>
    </div>
  );
}

export default PasswordListPanel;