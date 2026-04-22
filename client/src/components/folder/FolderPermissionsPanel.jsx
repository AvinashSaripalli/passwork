import { useSelector } from 'react-redux';

function FolderPermissionsPanel() {
  const { folders, selectedFolderId } = useSelector((state) => state.vault);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const permissions = selectedFolder?.permissions || [];

  if (!selectedFolderId) return null;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm mt-8 border border-slate-200">
      <h3 className="text-2xl font-semibold mb-4">Folder Permissions</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-4">User</th>
              <th className="pb-4">Email</th>
              <th className="pb-4">Access</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-4">{item.user?.fullName || '-'}</td>
                <td className="py-4">{item.user?.email || '-'}</td>
                <td className="py-4">{item.accessLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!permissions.length && (
          <p className="text-slate-500 mt-4">No folder permissions found.</p>
        )}
      </div>
    </div>
  );
}

export default FolderPermissionsPanel;