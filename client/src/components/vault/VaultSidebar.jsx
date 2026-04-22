import {
  Search,
  Folder,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  openAddFolderModal,
  selectFolder,
  clearSelectedFolder,
  deleteFolder,
  clearVaultError,
} from '../../features/vault/vaultSlice';

function VaultSidebar() {
  const dispatch = useDispatch();

  const {
    selectedVault,
    folders,
    selectedFolderId,
    foldersLoading,
    actionLoading,
    error,
  } = useSelector((state) => state.vault);

  const { user } = useSelector((state) => state.auth);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const selectedFolderPermission = selectedFolder?.permissions?.find(
    (item) => item.userId === user?.id || item.user?.id === user?.id
  );

  const selectedFolderAccess =
    user?.role === 'ADMIN'
      ? 'ADMINISTRATOR'
      : selectedFolderPermission?.accessLevel || null;

  const canCreateFolder = user?.role === 'ADMIN';

  const canDeleteFolder =
    user?.role === 'ADMIN' || selectedFolderAccess === 'ADMINISTRATOR';

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;

    dispatch(clearVaultError());

    const confirmed = window.confirm(
      `Delete folder "${selectedFolder.name}"?`
    );

    if (!confirmed) return;

    const result = await dispatch(deleteFolder(selectedFolder.id));

    if (deleteFolder.rejected.match(result)) {
      alert(result.payload || 'Failed to delete folder');
    }
  };

  return (
    <div className="bg-[#eef2f7] border-r border-slate-200 p-5">
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5">
        <Search size={16} className="text-slate-400" />
        <input
          placeholder="Search"
          className="bg-transparent outline-none w-full text-sm"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
          Folders
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => {
              dispatch(clearVaultError());
              dispatch(clearSelectedFolder());
            }}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center"
            title="Clear"
          >
            <X size={15} />
          </button>

          {canCreateFolder && (
            <button
              onClick={() => {
                dispatch(clearVaultError());
                dispatch(openAddFolderModal());
              }}
              className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center"
              title="Add folder"
            >
              <Plus size={15} />
            </button>
          )}

          {selectedFolder && canDeleteFolder && (
            <button
              onClick={handleDeleteFolder}
              disabled={actionLoading}
              className="w-8 h-8 rounded-lg border border-red-300 text-red-600 bg-white flex items-center justify-center disabled:opacity-50"
              title="Delete folder"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div>
        <div className="text-sm font-semibold text-slate-900 mb-3">
          {selectedVault?.name || 'Vault'}
        </div>

        <div className="space-y-2">
          {foldersLoading && (
            <p className="text-sm text-slate-400 py-2">Loading folders...</p>
          )}

          {!foldersLoading &&
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  dispatch(clearVaultError());
                  dispatch(selectFolder(folder.id));
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition ${
                  selectedFolderId === folder.id
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    : 'bg-white text-slate-700 border border-transparent hover:bg-slate-50'
                }`}
              >
                <Folder size={15} />
                <span className="text-sm font-medium">{folder.name}</span>
              </button>
            ))}

          {!foldersLoading && !folders.length && (
            <p className="text-sm text-slate-400 py-2">No folders found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VaultSidebar;