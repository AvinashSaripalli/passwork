import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RotateCcw,
  Activity,
  Folder,
  KeyRound,
  Database,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';
import { fetchActivityLogs } from '../../features/vault/vaultSlice';

const PAGE_SIZE = 10;

const ACTION_FILTERS = [
  { label: 'All Actions', value: 'ALL' },
  { label: 'Create', value: 'CREATE' },
  { label: 'Update', value: 'UPDATE' },
  { label: 'Delete', value: 'DELETE' },
  { label: 'View', value: 'VIEW' },
  { label: 'Copy', value: 'COPY' },
  { label: 'Share', value: 'SHARE' },
];

const TYPE_FILTERS = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Password', value: 'PASSWORD' },
  { label: 'Folder', value: 'FOLDER' },
  { label: 'Vault', value: 'VAULT' },
];

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
    case 'SHARE_PASSWORD':
      return 'Share Password';
    case 'CREATE_VAULT':
      return 'Create Vault';
    case 'UPDATE_VAULT':
      return 'Update Vault';
    case 'DELETE_VAULT':
      return 'Delete Vault';
    default:
      return action?.replaceAll('_', ' ') || '-';
  }
}

function getActionBadge(action) {
  if (action?.startsWith('CREATE')) return 'bg-green-50 text-green-700';
  if (action?.startsWith('UPDATE')) return 'bg-amber-50 text-amber-700';
  if (action?.startsWith('DELETE')) return 'bg-red-50 text-red-700';
  if (action?.startsWith('VIEW')) return 'bg-blue-50 text-blue-700';
  if (action?.startsWith('COPY')) return 'bg-sky-50 text-sky-700';
  if (action?.startsWith('SHARE')) return 'bg-indigo-50 text-indigo-700';
  return 'bg-slate-100 text-slate-700';
}

function getActionIcon(action) {
  if (action?.includes('PASSWORD')) return <KeyRound size={15} />;
  if (action?.includes('FOLDER')) return <Folder size={15} />;
  if (action?.includes('VAULT')) return <Database size={15} />;
  return <Activity size={15} />;
}

function ActivityLogPage() {
  const dispatch = useDispatch();

  const { activityLogs, activityLoading, error } = useSelector(
    (state) => state.vault
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    dispatch(fetchActivityLogs());
  }, [dispatch]);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        !searchValue ||
        log.user?.email?.toLowerCase().includes(searchValue) ||
        log.user?.fullName?.toLowerCase().includes(searchValue) ||
        log.action?.toLowerCase().includes(searchValue) ||
        log.targetId?.toLowerCase().includes(searchValue) ||
        log.metadata?.name?.toLowerCase?.().includes(searchValue);

      const matchesAction =
        actionFilter === 'ALL' || log.action?.startsWith(actionFilter);

      const matchesType =
        typeFilter === 'ALL' || log.action?.includes(typeFilter);

      return matchesSearch && matchesAction && matchesType;
    });
  }, [activityLogs, search, actionFilter, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, typeFilter, activityLogs.length]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const startItem =
    filteredLogs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;

  const endItem = Math.min(currentPage * PAGE_SIZE, filteredLogs.length);

  const resetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setTypeFilter('ALL');
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Activity Log
              </h1>
              <p className="mt-2 text-slate-500">
                Track password, folder and vault activity
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-[340px]">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search activity..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {ACTION_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {TYPE_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {activityLoading && (
            <div className="p-6 text-slate-500">Loading activity logs...</div>
          )}

          {error && (
            <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!activityLoading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Target ID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-t border-slate-100 hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString()
                            : '-'}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          <div>
                            <p className="font-medium text-slate-900">
                              {log.user?.fullName || 'User'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {log.user?.email || '-'}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${getActionBadge(
                              log.action
                            )}`}
                          >
                            {getActionIcon(log.action)}
                            {formatAction(log.action)}
                          </span>
                        </td>

                        <td
                          className="px-6 py-4 text-sm font-semibold text-slate-700"
                          title={log.targetId || ''}
                        >
                          {log.targetId || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!filteredLogs.length && (
                <div className="py-14 text-center">
                  <p className="text-slate-500">
                    No activity logs matched your filters.
                  </p>
                </div>
              )}

              {filteredLogs.length > 0 && (
                <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {startItem} - {endItem} of {filteredLogs.length}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => {
                      const page = index + 1;

                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-10 w-10 rounded-xl text-sm font-semibold ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
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