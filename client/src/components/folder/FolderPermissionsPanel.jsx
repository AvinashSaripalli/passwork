import { useSelector } from 'react-redux';

function FolderPermissionsPanel() {
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

  if (!selectedFolderId) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm mt-8 border border-slate-200 dark:border-slate-700">
      <h3 className="text-2xl font-semibold mb-4">Folder Permissions</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">
              <th className="pb-4">User</th>
              <th className="pb-4">Email</th>
              <th className="pb-4">Access</th>
            </tr>
          </thead>
          <tbody>
            {allMembers.map((item) => (
              <tr
                key={item.id}
                className={`border-b last:border-0 ${item.isOwner ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
              >
                <td className="py-4">{item.user?.fullName || '-'}</td>
                <td className="py-4">{item.user?.email || '-'}</td>
                <td className="py-4">
                  {item.isOwner ? 'ADMINISTRATOR (Owner)' : item.accessLevel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!allMembers.length && (
          <p className="text-slate-500 dark:text-slate-400 mt-4">No folder permissions found.</p>
        )}
      </div>
    </div>
  );
}

export default FolderPermissionsPanel;