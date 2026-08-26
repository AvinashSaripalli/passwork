import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { shareFolderAccess } from '../../features/vault/vaultSlice';
import { showToast } from '../../utils/toast';
import { unwrapItemKey, wrapItemKey } from '../../utils/crypto';

const DEPT_ACCESS_LEVELS = ['READ_ONLY', 'READ_WRITE', 'DELETE', 'ADMIN'];

function ShareFolderModal({ open, onClose, folderId, vaultId }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { sessionRsaPrivateKey, sessionRsaPublicKey } = useSelector((state) => state.auth);
  const { actionLoading } = useSelector((state) => state.vault);

  const [activeTab, setActiveTab] = useState('USERS');

  const [users, setUsers] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('READ_ONLY');
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [error, setError] = useState('');

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptsError, setDeptsError] = useState('');
  const [existingGrants, setExistingGrants] = useState({});
  const [selectedDepts, setSelectedDepts] = useState({});
  const [deptLevels, setDeptLevels] = useState({});
  const [savingDepts, setSavingDepts] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      try {
        setFetchingUsers(true);
        setError('');

        const response = await api.get('/users/shareable');

        const filteredUsers = (response.data || []).filter(
          (item) => item.id !== user?.id
        );

        setUsers(filteredUsers);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch users');
      } finally {
        setFetchingUsers(false);
      }
    };

    fetchUsers();
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !folderId || activeTab !== 'DEPARTMENTS') return;

    const fetchDepartments = async () => {
      try {
        setLoadingDepts(true);
        setDeptsError('');

        const res = await api.get('/departments');

        const list = res.data || [];
        setDepartments(list);

        const grants = {};
        const selected = {};
        const levels = {};

        list.forEach((dept) => {
          const grant = dept.permissions.find((p) => p.folderId === folderId);

          if (grant) {
            grants[dept.id] = grant;
            selected[dept.id] = true;
            levels[dept.id] = grant.accessLevel;
          }
        });

        setExistingGrants(grants);
        setSelectedDepts(selected);
        setDeptLevels(levels);
      } catch (err) {
        setDeptsError(
          err.response?.status === 403
            ? 'Only admins can manage department access'
            : err.response?.data?.message || 'Failed to fetch departments'
        );
      } finally {
        setLoadingDepts(false);
      }
    };

    fetchDepartments();
  }, [open, folderId, activeTab]);

  const resetForm = () => {
    setUserEmail('');
    setAccessLevel('READ_ONLY');
    setError('');
    setActiveTab('USERS');
    setSelectedDepts({});
    setDeptLevels({});
    setExistingGrants({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRequestShare = (e) => {
    e.preventDefault();

    if (!folderId) return setError('Select a folder');
    if (!vaultId) return setError('Vault missing');
    if (!userEmail) return setError('Select a user');

    setError('');
    handleVerified();
  };

  const handleVerified = async () => {
    const result = await dispatch(
      shareFolderAccess({
        folderId,
        userEmail,
        accessLevel,
        vaultId,
      })
    );

    if (shareFolderAccess.fulfilled.match(result)) {
      await wrapKeysForNewUser(userEmail);
      handleClose();
    } else {
      setError(result.payload || 'Failed to share');
    }
  };

  const wrapKeysForNewUser = async (recipientEmail) => {
    try {
      if (!sessionRsaPrivateKey || !sessionRsaPublicKey) return;

      const recipientRes = await api.get(`/users/by-email/${recipientEmail}`);
      const recipient = recipientRes.data;
      if (!recipient?.id) return;

      const recipientKeyRes = await api.get(`/keypair/${recipient.id}/public`);
      const recipientPublicKey = recipientKeyRes.data?.publicKey;
      if (!recipientPublicKey) return;

      const passwordsRes = await api.get(`/passwords/vault/${vaultId}`);
      const folderPasswords = (passwordsRes.data || []).filter(
        (pw) => pw.folderId === folderId
      );

      const wrappedUpdates = [];
      for (const pw of folderPasswords) {
        const existingWrappedKey = pw.wrappedKeys?.[recipient.id];
        if (existingWrappedKey) continue;

        const myWrappedKey = pw.myWrappedKey;
        if (!myWrappedKey) continue;

        try {
          const aesKeyJwk = await unwrapItemKey(myWrappedKey, sessionRsaPrivateKey);
          const newWrappedKey = await wrapItemKey(aesKeyJwk, recipientPublicKey);
          wrappedUpdates.push({
            id: pw.id,
            wrappedKeys: {
              ...(pw.wrappedKeys || {}),
              [recipient.id]: newWrappedKey,
            },
          });
        } catch {
          // skip items that fail to re-wrap
        }
      }

      if (wrappedUpdates.length > 0) {
        await api.post('/passwords/batch-wrap', {
          wrappedPasswords: wrappedUpdates,
        });
      }
    } catch {
      // best-effort key wrapping
    }
  };

  const toggleDept = (deptId) => {
    setSelectedDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const setDeptLevel = (deptId, level) => {
    setDeptLevels((prev) => ({ ...prev, [deptId]: level }));
  };

  const buildDeptLabel = (dept, byId) => {
    if (!dept.parentId || !byId.has(dept.parentId)) return dept.name;
    return `${buildDeptLabel(byId.get(dept.parentId), byId)} / ${dept.name}`;
  };

  const sortedDepartments = useMemo(() => {
    const byId = new Map(departments.map((d) => [d.id, d]));

    return [...departments].sort((a, b) =>
      buildDeptLabel(a, byId).localeCompare(buildDeptLabel(b, byId))
    );
  }, [departments]);

  const handleSaveDepartmentAccess = async () => {
    try {
      setSavingDepts(true);

      let created = 0;
      let updated = 0;
      let revoked = 0;

      for (const dept of departments) {
        const isSelected = !!selectedDepts[dept.id];
        const existing = existingGrants[dept.id];
        const wantedLevel = deptLevels[dept.id];

        if (isSelected && !existing) {
          await api.post(`/departments/${dept.id}/grants`, {
            folderId,
            accessLevel: wantedLevel || 'READ_ONLY',
          });
          created += 1;
        } else if (isSelected && existing && existing.accessLevel !== wantedLevel) {
          await api.delete(`/departments/${dept.id}/grants/${existing.id}`);
          await api.post(`/departments/${dept.id}/grants`, {
            folderId,
            accessLevel: wantedLevel,
          });
          updated += 1;
        } else if (!isSelected && existing) {
          await api.delete(`/departments/${dept.id}/grants/${existing.id}`);
          revoked += 1;
        }
      }

      const parts = [];
      if (created) parts.push(`${created} granted`);
      if (updated) parts.push(`${updated} updated`);
      if (revoked) parts.push(`${revoked} revoked`);

      showToast(parts.length ? `Department access saved (${parts.join(', ')})` : 'No changes');

      handleClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save department access', 'error');
    } finally {
      setSavingDepts(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 max-h-[85vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Share Folder</h2>
            <button onClick={handleClose} className="text-slate-400 dark:text-slate-500">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/50">
            {[
              { key: 'USERS', label: 'Users' },
              { key: 'DEPARTMENTS', label: 'Departments' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-600 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'USERS' ? (
            <>
              {/* Error */}
              {error && (
                <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm px-3 py-2 rounded-md">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRequestShare} className="space-y-4">

                {/* User Select */}
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300 mb-1 block">
                    Select user
                  </label>
                  <select
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full border border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">
                      {fetchingUsers ? 'Loading...' : 'Choose user'}
                    </option>
                    {users.map((item) => (
                      <option key={item.id} value={item.email}>
                        {item.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Access Level */}
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300 mb-1 block">
                    Access level
                  </label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                    className="w-full border border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="READ_ONLY">Read Only</option>
                    <option value="EDIT_ONLY">Edit Only</option>
                    <option value="FULL_ACCESS">Full Access</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg border text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm"
                  >
                    {actionLoading ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {deptsError && (
                <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm px-3 py-2 rounded-md">
                  {deptsError}
                </div>
              )}

              {loadingDepts && (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Loading departments...
                </p>
              )}

              {!loadingDepts && !deptsError && !sortedDepartments.length && (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No departments yet. Create them under Administration → Departments.
                </p>
              )}

              {!loadingDepts && !deptsError && sortedDepartments.length > 0 && (
                <>
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                    Tick departments to give them access to this folder. Untick to revoke.
                  </p>

                  <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-1">
                    {sortedDepartments.map((dept) => {
                      const checked = !!selectedDepts[dept.id];
                      const byId = new Map(departments.map((d) => [d.id, d]));

                      return (
                        <div
                          key={dept.id}
                          className={`rounded-xl border px-3 py-2.5 transition-colors ${
                            checked
                              ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-900/20'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDept(dept.id)}
                                className="h-4 w-4 accent-indigo-600 shrink-0"
                              />

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {buildDeptLabel(dept, byId)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {dept.members.length} member{dept.members.length === 1 ? '' : 's'}
                                  {existingGrants[dept.id] ? ' · currently has access' : ''}
                                </p>
                              </div>
                            </label>

                            {checked && (
                              <select
                                value={deptLevels[dept.id] || 'READ_ONLY'}
                                onChange={(e) => setDeptLevel(dept.id, e.target.value)}
                                className="h-8 shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                              >
                                {DEPT_ACCESS_LEVELS.map((level) => (
                                  <option key={level} value={level}>
                                    {level.replace('_', ' ')}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 rounded-lg border text-sm"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDepartmentAccess}
                      disabled={savingDepts}
                      className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50"
                    >
                      {savingDepts ? 'Saving...' : 'Save Department Access'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
  );
}

export default ShareFolderModal;
