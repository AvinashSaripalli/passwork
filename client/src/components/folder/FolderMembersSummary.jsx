import { UsersRound } from 'lucide-react';
import { useSelector } from 'react-redux';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function FolderMembersSummary({ onClick }) {
  const { folders, selectedFolderId } = useSelector((state) => state.vault);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const permissions = selectedFolder?.permissions || [];
  const owner = selectedFolder?.vault?.owner || null;

  const allMembers = owner
    ? [
        {
          id: `owner-${owner.id}`,
          user: owner,
          accessLevel: 'ADMINISTRATOR',
          isOwner: true,
        },
        ...permissions.filter((item) => item.user?.id !== owner.id),
      ]
    : permissions;

  if (!selectedFolderId || !allMembers.length) return null;

  const visibleMembers = allMembers.slice(0, 3);
  const extraCount = allMembers.length - visibleMembers.length;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 mt-3 text-left"
    >
      <div className="flex items-center">
        {visibleMembers.map((item, index) => (
          <div
            key={item.id}
            className={`w-9 h-9 rounded-full border-2 border-white bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center ${
              index !== 0 ? '-ml-2' : ''
            }`}
            title={item.user?.fullName || item.user?.email || 'User'}
          >
            {getInitials(item.user?.fullName || item.user?.email || 'U')}
          </div>
        ))}

        <div className="w-9 h-9 rounded-full border-2 border-white bg-indigo-50 text-indigo-600 flex items-center justify-center -ml-2">
          <UsersRound size={16} />
        </div>
      </div>

      <div className="text-sm leading-tight">
        <div className="text-indigo-600 font-medium">
          Shared with {allMembers.length} user{allMembers.length > 1 ? 's' : ''}
          {extraCount > 0 ? ` (+${extraCount})` : ''}
        </div>
        <div className="text-slate-400 text-xs">Folder members</div>
      </div>
    </button>
  );
}

export default FolderMembersSummary;