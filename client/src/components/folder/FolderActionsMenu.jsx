import { MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function FolderActionsMenu({
  folder,
  canManage,
  onRename,
  onShare,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!canManage) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100"
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-40 bg-white border border-slate-200 rounded-2xl shadow-lg py-2 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onRename(folder);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <Pencil size={14} />
            Rename
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onShare(folder);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <Share2 size={14} />
            Share
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete(folder);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default FolderActionsMenu;