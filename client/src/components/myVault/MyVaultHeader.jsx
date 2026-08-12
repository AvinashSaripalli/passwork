import { FolderPlus, Plus } from 'lucide-react';

function MyVaultHeader({ folders, onCreateFolder, onCreatePassword }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">My Vault</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">
          Your personal passwords, cards, bank accounts and private folders
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreateFolder}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <FolderPlus size={18} />
          New Folder
        </button>

        <button
          onClick={onCreatePassword}
          disabled={!folders.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>
    </div>
  );
}

export default MyVaultHeader;