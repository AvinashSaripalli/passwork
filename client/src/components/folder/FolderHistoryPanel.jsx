import { useEffect, useMemo, useState } from 'react';
import {
  X,
  History,
  Users,
  Folder,
  Copy,
  Eye,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

function getActionConfig(action) {
  switch (action) {
    case 'CREATE_PASSWORD':
      return {
        label: 'Created password',
        icon: Plus,
        badge: 'bg-green-100 text-green-700',
      };
    case 'VIEW_PASSWORD':
      return {
        label: 'Viewed password',
        icon: Eye,
        badge: 'bg-blue-100 text-blue-700',
      };
    case 'UPDATE_PASSWORD':
      return {
        label: 'Updated password',
        icon: Pencil,
        badge: 'bg-yellow-100 text-yellow-700',
      };
    case 'DELETE_PASSWORD':
      return {
        label: 'Deleted password',
        icon: Trash2,
        badge: 'bg-red-100 text-red-700',
      };
    case 'COPY_PASSWORD':
      return {
        label: 'Copied password',
        icon: Copy,
        badge: 'bg-purple-100 text-purple-700',
      };
    case 'CREATE_FOLDER':
      return {
        label: 'Created folder',
        icon: Folder,
        badge: 'bg-green-100 text-green-700',
      };
    case 'UPDATE_FOLDER':
      return {
        label: 'Updated folder',
        icon: Pencil,
        badge: 'bg-yellow-100 text-yellow-700',
      };
    case 'DELETE_FOLDER':
      return {
        label: 'Deleted folder',
        icon: Trash2,
        badge: 'bg-red-100 text-red-700',
      };
    default:
      return {
        label: action,
        icon: History,
        badge: 'bg-slate-100 text-slate-700',
      };
  }
}

function getTargetName(log) {
  return (
    log?.metadata?.name ||
    log?.metadata?.folderName ||
    log?.targetType ||
    'Item'
  );
}

function formatAccess(access) {
  switch (access) {
    case 'ADMINISTRATOR':
      return 'Administrator';
    case 'FULL_ACCESS':
      return 'Full access';
    case 'EDIT_ONLY':
      return 'Edit only';
    case 'READ_ONLY':
      return 'Read only';
    default:
      return access || '-';
  }
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function FolderHistoryPanel({ open, onClose, folderId }) {
  const { token } = useSelector((state) => state.auth);
  const { folders } = useSelector((state) => state.vault);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedFolder = folders.find((f) => f.id === folderId);
  const permissions = selectedFolder?.permissions || [];

  useEffect(() => {
    if (!open || !folderId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/folders/${folderId}/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setLogs(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load folder history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, folderId, token]);

  const summary = useMemo(() => {
    return {
      members: permissions.length,
      activities: logs.length,
    };
  }, [permissions.length, logs.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Folder History
            </p>
            <h2 className="text-2xl font-bold text-slate-900 truncate mt-1">
              {selectedFolder?.name || 'Folder'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Members and activity details
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Members</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {summary.members}
              </h3>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Activities</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {summary.activities}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-white">
                <Users size={18} className="text-slate-600" />
                <h3 className="text-base font-semibold text-slate-900">Members</h3>
              </div>

              {permissions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {permissions.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center shrink-0">
                        {getInitials(item.user?.fullName || item.user?.email || 'U')}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.user?.fullName || 'Unknown user'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {item.user?.email || '-'}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                        {formatAccess(item.accessLevel)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No folder permissions found.
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-white">
                <History size={18} className="text-slate-600" />
                <h3 className="text-base font-semibold text-slate-900">Activity</h3>
              </div>

              {loading && (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Loading history...
                </div>
              )}

              {!loading && logs.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const config = getActionConfig(log.action);
                    const Icon = config.icon;

                    return (
                      <div
                        key={log.id}
                        className="px-4 py-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Icon size={18} className="text-slate-700" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {config.label}
                              </p>
                              <span
                                className={`text-[11px] font-semibold px-2 py-1 rounded-md ${config.badge}`}
                              >
                                {log.action}
                              </span>
                            </div>

                            <p className="text-sm text-slate-600 mt-1 truncate">
                              {getTargetName(log)}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                              <span>{log.user?.fullName || 'Unknown user'}</span>
                              <ChevronRight size={12} />
                              <span>{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && !logs.length && (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No history found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FolderHistoryPanel;