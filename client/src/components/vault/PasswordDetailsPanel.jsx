import { useMemo, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import {
  deletePassword,
  openEditPasswordModal,
  selectPassword,
} from '../../features/vault/vaultSlice';
import VerifyAdminMasterPasswordModal from '../security/VerifyAdminMasterPasswordModal';

function PasswordDetailsPanel() {
  const dispatch = useDispatch();

  const {
    passwords,
    selectedPasswordId,
    actionLoading,
    folders,
    selectedFolderId,
  } = useSelector((state) => state.vault);

  const { user, token } = useSelector((state) => state.auth);

  const selectedPassword = passwords.find(
    (item) => item.id === selectedPasswordId
  );

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const selectedFolderPermission = selectedFolder?.permissions?.find(
    (item) => item.userId === user?.id || item.user?.id === user?.id
  );

  const selectedFolderAccess =
    user?.role === 'ADMIN'
      ? 'ADMINISTRATOR'
      : selectedFolderPermission?.accessLevel || null;

  const canView =
    user?.role === 'ADMIN' ||
    ['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY', 'READ_ONLY'].includes(
      selectedFolderAccess
    );

  const canEdit =
    user?.role === 'ADMIN' ||
    ['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY'].includes(
      selectedFolderAccess
    );

  const canDelete =
    user?.role === 'ADMIN' ||
    ['ADMINISTRATOR', 'FULL_ACCESS'].includes(selectedFolderAccess);

  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activePasswordId, setActivePasswordId] = useState(null);

  const sameNamePasswords = useMemo(() => {
    if (!selectedPassword) return [];

    return passwords.filter(
      (item) =>
        item.name?.trim().toLowerCase() ===
          selectedPassword.name?.trim().toLowerCase() &&
        (selectedFolderId ? item.folderId === selectedFolderId : true)
    );
  }, [passwords, selectedPassword, selectedFolderId]);

  if (!selectedPassword) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Select a password to view details.</p>
      </div>
    );
  }

  const requestAdminVerification = (actionName, passwordId) => {
    setPendingAction(actionName);
    setActivePasswordId(passwordId);
    setVerifyOpen(true);
  };

  const getPasswordById = (passwordId) =>
    sameNamePasswords.find((item) => item.id === passwordId);

  const getTagNames = (item) => {
    return item.tags?.map((tagItem) => tagItem.tag?.name).filter(Boolean) || [];
  };

  const handleVerified = async () => {
    const activePassword = getPasswordById(activePasswordId);

    if (!activePassword) {
      setPendingAction(null);
      setActivePasswordId(null);
      return;
    }

    if (pendingAction === 'view' && canView) {
      setVisiblePasswords((prev) => ({
        ...prev,
        [activePassword.id]: !prev[activePassword.id],
      }));

      await api.post(
        `/passwords/${activePassword.id}/view-log`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }

    if (pendingAction === 'copy-login' && canView) {
      await navigator.clipboard.writeText(activePassword.login || '');
      alert('Login copied');
    }

    if (pendingAction === 'copy-password' && canView) {
      await navigator.clipboard.writeText(activePassword.encryptedPassword || '');

      await api.post(
        `/passwords/${activePassword.id}/copy-log`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Password copied');
    }

    if (pendingAction === 'edit' && canEdit) {
      dispatch(selectPassword(activePassword.id));
      dispatch(openEditPasswordModal());
    }

    if (pendingAction === 'delete' && canDelete) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${
          activePassword.login || activePassword.name
        }"?`
      );

      if (confirmed) {
        dispatch(selectPassword(activePassword.id));
        dispatch(deletePassword(activePassword.id));
      }
    }

    setPendingAction(null);
    setActivePasswordId(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-[20px] leading-none font-bold text-slate-700">
              Website / Service Name
            </p>

            <h2 className="text-[30px] leading-none font-bold text-slate-900">
              {selectedPassword.name}
            </h2>

            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
              {sameNamePasswords.length} account
              {sameNamePasswords.length !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="text-slate-500">
            All accounts saved under this website or service name
          </p>
        </div>

        <div className="space-y-5 max-h-[760px] overflow-y-auto pr-2">
          {sameNamePasswords.map((item, index) => {
            const tagNames = getTagNames(item);
            const isVisible = !!visiblePasswords[item.id];

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4 px-7 py-6 border-b border-slate-200 bg-slate-50/70">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>

                      <h3 className="text-[20px] font-bold text-slate-900 break-all">
                        {item.login || item.name}
                      </h3>
                    </div>

                    <p className="text-sm text-slate-500 mt-2">
                      Account details
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => requestAdminVerification('edit', item.id)}
                        className="w-10 h-10 rounded-full border border-slate-200 text-slate-600 hover:bg-white flex items-center justify-center"
                      >
                        <Pencil size={17} />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() =>
                          requestAdminVerification('delete', item.id)
                        }
                        disabled={actionLoading}
                        className="w-10 h-10 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-7 py-2">
                  <DetailRow
                    label="Login"
                    value={item.login || '-'}
                    action={
                      canView && (
                        <button
                          onClick={() =>
                            requestAdminVerification('copy-login', item.id)
                          }
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <Copy size={18} />
                        </button>
                      )
                    }
                  />

                  <DetailRow
                    label="Password"
                    value={
                      isVisible ? item.encryptedPassword : '••••••••••••••'
                    }
                    action={
                      canView && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              requestAdminVerification('view', item.id)
                            }
                            className="text-slate-500 hover:text-slate-700"
                          >
                            {isVisible ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>

                          <button
                            onClick={() =>
                              requestAdminVerification('copy-password', item.id)
                            }
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <Copy size={18} />
                          </button>
                        </div>
                      )
                    }
                  />

                  <DetailRow
                    label="URL"
                    value={
                      item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 break-all hover:underline"
                        >
                          {item.url}
                        </a>
                      ) : (
                        '-'
                      )
                    }
                    action={
                      item.url && (
                        <button
                          onClick={() => window.open(item.url, '_blank')}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <ExternalLink size={18} />
                        </button>
                      )
                    }
                  />

                  <div className="grid grid-cols-[150px_1fr] gap-4 py-5 border-t border-slate-200">
                    <span className="text-slate-500">Tags</span>

                    <div className="flex flex-wrap gap-2">
                      {tagNames.length ? (
                        tagNames.map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-sm">No tags</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!sameNamePasswords.length && (
            <div className="p-6 text-slate-500 text-sm">
              No passwords found.
            </div>
          )}
        </div>
      </div>

      <VerifyAdminMasterPasswordModal
        open={verifyOpen}
        onClose={() => {
          setVerifyOpen(false);
          setPendingAction(null);
          setActivePasswordId(null);
        }}
        onVerified={handleVerified}
      />
    </div>
  );
}

function DetailRow({ label, value, action }) {
  return (
    <div className="grid grid-cols-[150px_1fr_80px] items-center gap-4 py-5 border-t border-slate-200 first:border-t-0">
      <span className="text-slate-500">{label}</span>
      <span className="break-all text-slate-900">{value}</span>
      <div className="flex items-center justify-end">{action}</div>
    </div>
  );
}

export default PasswordDetailsPanel;