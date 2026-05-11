import { useState } from 'react';
import { Edit2, Folder, MoreHorizontal, Trash2 } from 'lucide-react';

function MyVaultSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);

  const toggleMenu = (e, folderId) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === folderId ? null : folderId));
  };

  const handleEdit = (e, folder) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onEditFolder(folder);
  };

  const handleDelete = (e, folder) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onDeleteFolder(folder);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 min-h-[600px]">
      <div
        onClick={() => {
          onSelectFolder(null);
          setOpenMenuId(null);
        }}
        className={`px-3 py-2 rounded-xl cursor-pointer font-medium mb-2 transition ${
          !selectedFolderId
            ? 'bg-indigo-50 text-indigo-700'
            : 'hover:bg-slate-100'
        }`}
      >
        All Passwords
      </div>

      {folders.map((folder) => (
        <div
          key={folder.id}
          onClick={() => {
            onSelectFolder(folder.id);
            setOpenMenuId(null);
          }}
          className={`relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-medium mb-2 transition cursor-pointer ${
            selectedFolderId === folder.id
              ? 'bg-indigo-50 text-indigo-700'
              : 'hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Folder size={16} />
            <span className="truncate">{folder.name}</span>
          </div>

          <button
            onClick={(e) => toggleMenu(e, folder.id)}
            className="p-1.5 rounded-lg hover:bg-white text-slate-500"
          >
            <MoreHorizontal size={16} />
          </button>

          {openMenuId === folder.id && (
            <div className="absolute right-2 top-10 z-30 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-2">
              <button
                onClick={(e) => handleEdit(e, folder)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Edit2 size={14} />
                Edit
              </button>

              <button
                onClick={(e) => handleDelete(e, folder)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default MyVaultSidebar;