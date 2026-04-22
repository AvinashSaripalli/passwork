import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  ChevronDown,
  CircleX,
  ShieldCheck,
  PencilLine,
  Eye,
  Crown,
  Users,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

const ACCESS_OPTIONS = [
  { value: 'ADMINISTRATOR', label: 'Administrator', icon: Crown },
  { value: 'FULL_ACCESS', label: 'Full access', icon: ShieldCheck },
  { value: 'EDIT_ONLY', label: 'Edit only', icon: PencilLine },
  { value: 'READ_ONLY', label: 'Read only', icon: Eye },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getAccessMeta(accessLevel) {
  const found = ACCESS_OPTIONS.find((item) => item.value === accessLevel);
  return found || ACCESS_OPTIONS[3];
}

function FolderUsersModal({ open, onClose, folderId, folderName, onSaved }) {
  const { token, user } = useSelector((state) => state.auth);
  const { folders } = useSelector((state) => state.vault);

  const [search, setSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [changedMembers, setChangedMembers] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedFolder = folders.find((f) => f.id === folderId);

  const currentUserPermission = selectedFolder?.permissions?.find(
    (item) => item.userId === user?.id || item.user?.id === user?.id
  );

  const currentUserAccess =
    user?.role === 'ADMIN'
      ? 'ADMINISTRATOR'
      : currentUserPermission?.accessLevel || null;

  const canManageMembers =
    user?.role === 'ADMIN' || currentUserAccess === 'ADMINISTRATOR';

  useEffect(() => {
    if (!open || !folderId) return;

    setLoading(true);
    setError('');

    try {
      const currentPermissions = selectedFolder?.permissions || [];
      setMembers(currentPermissions);
      setChangedMembers({});
    } catch (err) {
      setError('Failed to load folder members');
    } finally {
      setLoading(false);
    }
  }, [open, folderId, selectedFolder]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();

    return members.filter((item) => {
      const name = item.user?.fullName?.toLowerCase() || '';
      const email = item.user?.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [members, search]);

  const handleAccessChange = (permissionId, newAccess) => {
    if (!canManageMembers) return;

    setChangedMembers((prev) => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        accessLevel: newAccess,
      },
    }));

    setMembers((prev) =>
      prev.map((item) =>
        item.id === permissionId ? { ...item, accessLevel: newAccess } : item
      )
    );
  };

  const handleRemoveMember = (permissionId) => {
    if (!canManageMembers) return;

    setChangedMembers((prev) => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        remove: true,
      },
    }));

    setMembers((prev) => prev.filter((item) => item.id !== permissionId));
  };

  const handleSave = async () => {
    if (!canManageMembers) return;

    try {
      setSaving(true);
      setError('');

      const updates = Object.entries(changedMembers);

      for (const [permissionId, change] of updates) {
        if (change.remove) {
          await api.delete(`/folders/permissions/${permissionId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else if (change.accessLevel) {
          await api.put(
            `/folders/permissions/${permissionId}`,
            { accessLevel: change.accessLevel },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
      }

      if (onSaved) {
        await onSaved();
      }

      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to save folder permissions'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center px-4">
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-[0_20px_70px_rgba(15,23,42,0.18)] border border-slate-200 overflow-hidden">
        <div className="px-8 py-7 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4">
                <Users size={14} />
                Folder permissions
              </div>

              <h2 className="text-[30px] leading-[1.15] font-bold text-slate-900">
                {folderName || 'Folder'}
              </h2>

              <p className="text-slate-500 mt-2 text-sm">
                View members, change access levels, and remove access from this folder.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-11 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-8 pt-6 pb-8">
          {error && (
            <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-[28px] p-6 h-fit">
              <div className="mb-5">
                <div className="text-sm text-slate-500 mb-2">Total members</div>
                <div className="text-4xl font-bold text-slate-900">
                  {members.length}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 flex items-center gap-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search member"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm text-slate-700"
                  />
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400 font-semibold mb-3">
                    Access levels
                  </div>

                  <div className="space-y-3">
                    {ACCESS_OPTIONS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.value}
                          className="flex items-center gap-3 text-sm text-slate-700"
                        >
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <Icon size={16} />
                          </div>
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[28px] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Members
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {filteredMembers.length} visible user
                    {filteredMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {canManageMembers ? (
                  <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-full">
                    You can manage access
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-full">
                    View only
                  </div>
                )}
              </div>

              <div className="max-h-[460px] overflow-y-auto">
                {loading && (
                  <div className="px-6 py-8 text-sm text-slate-500">
                    Loading members...
                  </div>
                )}

                {!loading && filteredMembers.length > 0 && (
                  <div className="divide-y divide-slate-200">
                    {filteredMembers.map((item) => {
                      const accessMeta = getAccessMeta(item.accessLevel);
                      const AccessIcon = accessMeta.icon;

                      return (
                        <div
                          key={item.id}
                          className="px-6 py-5 flex items-center justify-between gap-5 hover:bg-slate-50/70 transition"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                              {getInitials(item.user?.fullName || item.user?.email || 'U')}
                            </div>

                            <div className="min-w-0">
                              <div className="text-[15px] font-semibold text-slate-900 truncate">
                                {item.user?.fullName || 'Unknown user'}
                              </div>
                              <div className="text-sm text-slate-500 truncate mt-0.5">
                                {item.user?.email || '-'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {canManageMembers ? (
                              <div className="relative">
                                <select
                                  value={item.accessLevel}
                                  onChange={(e) =>
                                    handleAccessChange(item.id, e.target.value)
                                  }
                                  className="appearance-none min-w-[220px] h-[48px] rounded-2xl border border-slate-300 bg-white pl-4 pr-11 text-sm font-medium text-slate-700 outline-none hover:border-slate-400"
                                >
                                  {ACCESS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  size={17}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                              </div>
                            ) : (
                              <div className="min-w-[220px] h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                                <AccessIcon size={16} className="text-slate-500" />
                                <span>{accessMeta.label}</span>
                              </div>
                            )}

                            {canManageMembers && (
                              <button
                                onClick={() => handleRemoveMember(item.id)}
                                className="w-11 h-11 rounded-2xl border border-red-200 bg-white text-red-500 hover:bg-red-50 flex items-center justify-center"
                                title="Remove access"
                              >
                                <CircleX size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!loading && !filteredMembers.length && (
                  <div className="px-6 py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-4">
                      <Users size={22} />
                    </div>
                    <div className="text-base font-semibold text-slate-800">
                      No users found
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Try another name or email in search.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="h-[50px] px-6 rounded-2xl border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>

            {canManageMembers && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-[50px] px-7 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FolderUsersModal;