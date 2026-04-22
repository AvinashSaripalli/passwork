import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';
import { fetchActivityLogs } from '../../features/vault/vaultSlice';

function formatAction(action) {
  switch (action) {
    case 'CREATE_FOLDER':
      return 'Create Folder';
    case 'UPDATE_FOLDER':
      return 'Update Folder';
    case 'DELETE_FOLDER':
      return 'Delete Folder';
    case 'CREATE_PASSWORD':
      return 'Create Password';
    case 'UPDATE_PASSWORD':
      return 'Update Password';
    case 'DELETE_PASSWORD':
      return 'Delete Password';
    case 'VIEW_PASSWORD':
      return 'View Password';
    case 'COPY_PASSWORD':
      return 'Copy Password';
    default:
      return action?.replaceAll('_', ' ') || '-';
  }
}

function getActionBadge(action) {
  switch (action) {
    case 'CREATE_FOLDER':
    case 'CREATE_PASSWORD':
      return 'bg-green-50 text-green-700';
    case 'UPDATE_FOLDER':
    case 'UPDATE_PASSWORD':
      return 'bg-amber-50 text-amber-700';
    case 'DELETE_FOLDER':
    case 'DELETE_PASSWORD':
      return 'bg-red-50 text-red-700';
    case 'VIEW_PASSWORD':
    case 'COPY_PASSWORD':
      return 'bg-blue-50 text-blue-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getTargetBadge(targetType) {
  switch (targetType) {
    case 'Folder':
      return 'bg-indigo-50 text-indigo-700';
    case 'PasswordEntry':
      return 'bg-purple-50 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function ActivityLogPage() {
  const dispatch = useDispatch();
  const { activityLogs, activityLoading, error } = useSelector((state) => state.vault);

  useEffect(() => {
    dispatch(fetchActivityLogs());
  }, [dispatch]);

  const summary = useMemo(() => {
    const folderCount = activityLogs.filter((log) => log.targetType === 'Folder').length;
    const passwordCount = activityLogs.filter((log) => log.targetType === 'PasswordEntry').length;

    return {
      total: activityLogs.length,
      folder: folderCount,
      password: passwordCount,
    };
  }, [activityLogs]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h1 className="text-4xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-slate-500 mt-2">Track password and folder activity</p>
        </div>

        {!activityLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Total Activities</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">{summary.total}</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Folder Activities</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">{summary.folder}</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Password Activities</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-2">{summary.password}</h2>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {activityLoading && (
            <p className="text-slate-500">Loading activity logs...</p>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!activityLoading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-4 pr-4 font-medium">Date</th>
                      <th className="py-4 pr-4 font-medium">User</th>
                      <th className="py-4 pr-4 font-medium">Action</th>
                      <th className="py-4 pr-4 font-medium">Target Type</th>
                      <th className="py-4 font-medium">Target ID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activityLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="py-4 pr-4 text-sm text-slate-700 whitespace-nowrap">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString()
                            : '-'}
                        </td>

                        <td className="py-4 pr-4 text-sm text-slate-700">
                          {log.user?.email || '-'}
                        </td>

                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getActionBadge(
                              log.action
                            )}`}
                          >
                            {formatAction(log.action)}
                          </span>
                        </td>

                        <td className="py-4 pr-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTargetBadge(
                              log.targetType
                            )}`}
                          >
                            {log.targetType || '-'}
                          </span>
                        </td>

                        <td className="py-4 text-sm text-slate-500 break-all">
                          {log.targetId || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!activityLogs.length && (
                <div className="py-8 text-center">
                  <p className="text-slate-500">No activity logs found.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default ActivityLogPage;