import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search,
  RotateCcw,
  Activity,
  Folder,
  KeyRound,
  Database,
  CheckCircle2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';
import { fetchActivityLogs } from '../../features/vault/vaultSlice';
import api from '../../services/api';

const PAGE_SIZE = 10;
const ACTIVITY_PAGE_SIZE = 10;

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

const LOGIN_STATUS_FILTERS = [
  { label: 'All Status', value: 'ALL' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Blocked', value: 'BLOCKED' },
];

const TABS = [
  { id: 'actions', label: 'Actions' },
  { id: 'login', label: 'Login History' },
  { id: 'unread', label: 'Unread' },
];

function formatAction(action) {
  switch (action) {
    case 'CREATE_FOLDER': return 'Create Folder';
    case 'UPDATE_FOLDER': return 'Update Folder';
    case 'DELETE_FOLDER': return 'Delete Folder';
    case 'CREATE_PASSWORD': return 'Create Password';
    case 'UPDATE_PASSWORD': return 'Update Password';
    case 'DELETE_PASSWORD': return 'Delete Password';
    case 'VIEW_PASSWORD': return 'View Password';
    case 'COPY_PASSWORD': return 'Copy Password';
    case 'SHARE_PASSWORD': return 'Share Password';
    case 'SHARE_FOLDER': return 'Share Folder';
    case 'CREATE_VAULT': return 'Create Vault';
    case 'UPDATE_VAULT': return 'Update Vault';
    case 'DELETE_VAULT': return 'Delete Vault';
    default: return action?.replaceAll('_', ' ') || '-';
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

function getDateGroup(dateStr) {
  if (!dateStr) return 'Earlier';
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekStart) return 'This Week';
  return 'Earlier';
}

function downloadCSV(filename, rows, headers) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ActivityLogPage() {
  const dispatch = useDispatch();

  const { activityLogs, activityLoading, error } = useSelector(
    (state) => state.vault
  );

  const [activeTab, setActiveTab] = useState('actions');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [loginActivities, setLoginActivities] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginStatusFilter, setLoginStatusFilter] = useState('ALL');
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [expandedLogin, setExpandedLogin] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchActivityLogs());
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === 'login') fetchLoginActivities();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'unread') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchLoginActivities = useCallback(async () => {
    setLoginLoading(true);
    try {
      const res = await api.get('/login-activity');
      setLoginActivities(res.data?.activities || []);
    } catch {
      setLoginActivities([]);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const markAsRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await api.patch('/notifications/mark-all-read');
    fetchNotifications();
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        log.user?.email?.toLowerCase().includes(q) ||
        log.user?.fullName?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.targetId?.toLowerCase().includes(q) ||
        log.metadata?.name?.toLowerCase?.().includes(q);
      const matchesAction =
        actionFilter === 'ALL' || log.action?.startsWith(actionFilter);
      const matchesType =
        typeFilter === 'ALL' || log.action?.includes(typeFilter);
      return matchesSearch && matchesAction && matchesType;
    });
  }, [activityLogs, search, actionFilter, typeFilter]);

  const totalPages = Math.ceil(filteredLogs.length / ACTIVITY_PAGE_SIZE) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ACTIVITY_PAGE_SIZE;
    return filteredLogs.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const groupedLogs = useMemo(() => {
    const groups = {};
    paginatedLogs.forEach((log) => {
      const group = getDateGroup(log.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(log);
    });
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    return order.filter((g) => groups[g]).map((g) => ({ label: g, items: groups[g] }));
  }, [paginatedLogs]);

  const startItem = filteredLogs.length === 0 ? 0 : (currentPage - 1) * ACTIVITY_PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * ACTIVITY_PAGE_SIZE, filteredLogs.length);

  const resetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setTypeFilter('ALL');
    setLoginStatusFilter('ALL');
  };

  const filteredLogin = useMemo(() => {
    const q = search.toLowerCase();
    return loginActivities.filter((item) => {
      if (loginStatusFilter !== 'ALL' && item.status !== loginStatusFilter) return false;
      if (!q) return true;
      const userName = (item.user?.fullName || item.user?.email || '').toLowerCase();
      const email = (item.user?.email || '').toLowerCase();
      const ip = (item.ipAddress || '').toLowerCase();
      const status = (item.status || '').toLowerCase();
      return userName.includes(q) || email.includes(q) || ip.includes(q) || status.includes(q);
    });
  }, [loginActivities, search, loginStatusFilter]);

  const paginatedLogin = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogin.slice(start, start + PAGE_SIZE);
  }, [filteredLogin, currentPage]);
  const loginTotalPages = Math.ceil(filteredLogin.length / PAGE_SIZE) || 1;

  const groupedLogin = useMemo(() => {
    const groups = {};
    paginatedLogin.forEach((item) => {
      const group = getDateGroup(item.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    return order.filter((g) => groups[g]).map((g) => ({ label: g, items: groups[g] }));
  }, [paginatedLogin]);

  const unreadNotifications = useMemo(() => {
    const q = search.toLowerCase();
    const unread = notifications.filter((n) => !n.isRead);
    if (!q) return unread;
    return unread.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const paginatedUnread = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return unreadNotifications.slice(start, start + PAGE_SIZE);
  }, [unreadNotifications, currentPage]);
  const unreadTotalPages = Math.ceil(unreadNotifications.length / PAGE_SIZE) || 1;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearch('');
    setActionFilter('ALL');
    setTypeFilter('ALL');
    setLoginStatusFilter('ALL');
    setExpandedLogin(null);
  };

  const handleRefresh = () => {
    if (activeTab === 'login') fetchLoginActivities();
    if (activeTab === 'unread') fetchNotifications();
  };

  const handleExportCSV = () => {
    if (activeTab === 'actions') {
      const headers = ['Date', 'User', 'Email', 'Action', 'TargetID', 'TargetName'];
      const rows = filteredLogs.map((log) => ({
        Date: log.createdAt ? new Date(log.createdAt).toLocaleString() : '',
        User: log.user?.fullName || '',
        Email: log.user?.email || '',
        Action: formatAction(log.action),
        TargetID: log.targetId || '',
        TargetName: log.metadata?.name || '',
      }));
      downloadCSV('activity-log.csv', rows, headers);
    }
    if (activeTab === 'login') {
      const headers = ['Date', 'User', 'Email', 'IPAddress', 'Device', 'Status'];
      const rows = filteredLogin.map((item) => ({
        Date: item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
        User: item.user?.fullName || '',
        Email: item.user?.email || '',
        IPAddress: item.ipAddress || '',
        Device: item.userAgent || '',
        Status: item.status || '',
      }));
      downloadCSV('login-history.csv', rows, headers);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Activity Log</h1>
              <p className="mt-2 text-slate-500">
                Track actions, login history, and notifications in one place
              </p>
            </div>

            <div className="flex gap-1 border-b border-slate-200">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'unread' && unreadNotifications.length > 0 && (
                    <span className="ml-2 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-[340px]">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); setExpandedLogin(null); }}
                  placeholder={
                    activeTab === 'actions' ? 'Search by user, action, target...' :
                    activeTab === 'login' ? 'Search by user, IP, status...' :
                    'Search notifications...'
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {activeTab === 'actions' && (
                <>
                  <select
                    value={actionFilter}
                    onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {ACTION_FILTERS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {TYPE_FILTERS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </>
              )}

              {activeTab === 'login' && (
                <select
                  value={loginStatusFilter}
                  onChange={(e) => { setLoginStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {LOGIN_STATUS_FILTERS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={16} />
                Reset
              </button>

              {(activeTab === 'login' || activeTab === 'unread') && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loginLoading || notifLoading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loginLoading || notifLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              )}

              {activeTab !== 'unread' && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'actions' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {activityLoading && <div className="p-6 text-sm text-slate-500">Loading activity logs...</div>}
            {error && (
              <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {!activityLoading && !error && (
              <>
                {groupedLogs.map((group) => (
                  <div key={group.label}>
                    <div className="sticky top-0 bg-slate-50 px-6 py-3 border-b border-slate-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</p>
                    </div>
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">User</th>
                          <th className="px-6 py-4">Action</th>
                          <th className="px-6 py-4">Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((log) => (
                          <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div>
                                <p className="font-medium text-slate-900">{log.user?.fullName || 'User'}</p>
                                <p className="text-xs text-slate-500">{log.user?.email || '-'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${getActionBadge(log.action)}`}>
                                {getActionIcon(log.action)}
                                {formatAction(log.action)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">
                              <div>
                                <p className="font-semibold">{log.metadata?.name || log.targetId || '-'}</p>
                                {log.metadata?.name && log.targetId && (
                                  <p className="text-xs text-slate-400">{log.targetId}</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {!filteredLogs.length && (
                  <div className="py-14 text-center">
                    <p className="text-slate-500">No activity logs matched your filters.</p>
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
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
                      >Previous</button>
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
                          >{page}</button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
                      >Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'login' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {loginLoading && <div className="p-6 text-sm text-slate-500">Loading login history...</div>}
            {!loginLoading && (
              <>
                {groupedLogin.map((group) => (
                  <div key={group.label}>
                    <div className="sticky top-0 bg-slate-50 px-6 py-3 border-b border-slate-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <div key={item.id}>
                          <div
                            onClick={() => setExpandedLogin(expandedLogin === item.id ? null : item.id)}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 cursor-pointer"
                          >
                            <div className="shrink-0">
                              {expandedLogin === item.id
                                ? <ChevronDown size={16} className="text-slate-400" />
                                : <ChevronRight size={16} className="text-slate-400" />}
                            </div>
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold shrink-0">
                              {item.user?.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0 flex-1 grid grid-cols-5 gap-4 text-sm items-center">
                              <div>
                                <p className="font-medium text-slate-900 truncate">{item.user?.fullName || 'User'}</p>
                              </div>
                              <div className="text-slate-600 truncate">{item.user?.email || '-'}</div>
                              <div className="text-slate-600 font-mono text-xs">{item.ipAddress || '-'}</div>
                              <div>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.status === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {item.status || '-'}
                                </span>
                              </div>
                              <div className="text-slate-600 whitespace-nowrap">
                                {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                              </div>
                            </div>
                          </div>
                          {expandedLogin === item.id && (
                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                              <div className="grid grid-cols-2 gap-4 text-sm ml-9">
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">IP Address</p>
                                  <p className="text-slate-700 font-mono">{item.ipAddress || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">Status</p>
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    item.status === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                  }`}>{item.status || '-'}</span>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-xs text-slate-400 mb-1">Device / User Agent</p>
                                  <p className="text-slate-700 text-xs break-words">{item.userAgent || '-'}</p>
                                </div>
                                {item.location && (
                                  <div className="col-span-2">
                                    <p className="text-xs text-slate-400 mb-1">Location</p>
                                    <p className="text-slate-700">{item.location}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {!filteredLogin.length && (
                  <div className="py-14 text-center">
                    <p className="text-slate-500">No login history found.</p>
                  </div>
                )}

                {filteredLogin.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                    <p className="text-sm text-slate-500">Page {currentPage} of {loginTotalPages}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
                      >Previous</button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, loginTotalPages))}
                        disabled={currentPage === loginTotalPages}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
                      >Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'unread' && (
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <p className="text-sm text-slate-500">
                {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
              </p>
              {unreadNotifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Mark All Read
                </button>
              )}
            </div>

            {notifLoading && <div className="p-6 text-sm text-slate-500">Loading notifications...</div>}

            {!notifLoading && (
              <div className="divide-y divide-slate-100">
                {paginatedUnread.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className="flex items-start gap-3 px-6 py-4 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="mt-1">
                      {!n.isRead ? (
                        <span className="h-2 w-2 rounded-full bg-indigo-600 block" />
                      ) : (
                        <CheckCircle2 size={14} className="text-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      <p className="text-[11px] text-slate-400 mt-2">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!notifLoading && !paginatedUnread.length && (
              <div className="py-14 text-center">
                <p className="text-slate-500">
                  {search ? 'No unread notifications match your search.' : 'No unread notifications.'}
                </p>
              </div>
            )}

            {unreadNotifications.length > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                <p className="text-sm text-slate-500">Page {currentPage} of {unreadTotalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
                  >Previous</button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, unreadTotalPages))}
                    disabled={currentPage === unreadTotalPages}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-50"
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ActivityLogPage;
