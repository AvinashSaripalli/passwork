import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeAddFolderModal,
  createFolder,
} from '../../features/vault/vaultSlice';

function AddFolderModal() {
  const dispatch = useDispatch();
  const {
    isAddFolderModalOpen,
    selectedVault,
    selectedFolderId,
    actionLoading,
  } = useSelector((state) => state.vault);

  const [name, setName] = useState('');

  if (!isAddFolderModalOpen) return null;

const handleSubmit = async (e) => {
  e.preventDefault();

  const result = await dispatch(
    createFolder({
      name,
      vaultId: selectedVault?.id,
    })
  );

  if (createFolder.fulfilled.match(result)) {
    setName('');
  }
};

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Create Folder</h2>
          <button
            onClick={() => dispatch(closeAddFolderModal())}
            className="text-slate-500 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none"
            required
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dispatch(closeAddFolderModal())}
              className="px-5 py-3 rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium"
            >
              {actionLoading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddFolderModal;