import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

function EditFolderModal({ open, folder, onClose, onSubmit }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (folder) {
      setName(folder.name || '');
    }
  }, [folder]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Folder</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none"
        />

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditFolderModal;