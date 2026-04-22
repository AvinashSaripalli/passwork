import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  }, [filteredPasswords, selectedPasswordId, dispatch]);

  return (
    <div className="bg-white p-6 border-r border-slate-200">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search passwords..."
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          className="w-full h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm outline-none"
        />
      </div>

      <p className="text-[28px] font-bold text-slate-900 mb-6">
        {groupedPasswords.length} password
        {groupedPasswords.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-3">
        {groupedPasswords.map((group) => {
          const firstItem = group.items[0];
          const active = group.items.some(
            (item) => item.id === selectedPasswordId
          );

          return (
            // <button
            //   key={group.name}
            //   onClick={() => dispatch(selectPassword(firstItem.id))}
            //   className={`w-full text-left px-5 py-4 rounded-2xl border transition ${
            //     active
            //       ? 'bg-indigo-50 border-indigo-200'
            //       : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            //   }`}
            // >
            //   <div className="min-w-0">
            //     <div className="text-[18px] font-bold text-slate-900 truncate">
            //       {group.name}
            //     </div>

            //     <div className="text-sm text-slate-600 mt-1">
            //       {group.items.length} account
            //       {group.items.length !== 1 ? 's' : ''}
            //     </div>

            //     <div className="text-xs text-slate-400 truncate mt-1">
            //       {group.items
            //         .map((item) => item.login)
            //         .filter(Boolean)
            //         .join(', ')}
            //     </div>
            //   </div>
            // </button>

            <button
              key={group.name}
              onClick={() => dispatch(selectPassword(group.items[0].id))}
              className={`w-full text-left px-5 py-5 rounded-2xl border transition ${
                active
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-[18px] font-bold text-slate-900">
                {group.name}
              </div>

              <div className="text-sm text-slate-500 mt-1">
                {group.items.length} account{group.items.length > 1 ? 's' : ''}
              </div>
            </button>
          );
        })}

        {!groupedPasswords.length && (
          <p className="text-slate-500 text-sm">No passwords found.</p>
        )}
      </div>
    </div>
  );
}

export default PasswordListPanel;