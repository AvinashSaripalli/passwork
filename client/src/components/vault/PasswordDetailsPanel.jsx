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

  const selectedPassword = passwords.find((item) => item.id === selectedPasswordId);
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
        `Are you sure you want to delete "${activePassword.login || activePassword.name}"?`
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
            <h2 className="text-[42px] leading-none font-bold text-slate-900">
              {selectedPassword.name}
            </h2>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
              {sameNamePasswords.length} account
              {sameNamePasswords.length !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="text-slate-500">
            All accounts saved under this password name
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 overflow-hidden">
          <div className="max-h-[760px] overflow-y-auto">
            {sameNamePasswords.map((item, index) => {
              const tagNames =
                item.tags?.map((tagItem) => tagItem.tag?.name).filter(Boolean) || [];

              const isVisible = !!visiblePasswords[item.id];

              return (
                <div
                  key={item.id}
                  className={`bg-white px-7 py-7 ${
                    index !== 0 ? 'border-t border-slate-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-7">
                    <div className="min-w-0">
                      <h3 className="text-[20px] font-bold text-slate-900 break-all">
                        {item.login || item.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Account details
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canEdit && (
                        <button
                          onClick={() => requestAdminVerification('edit', item.id)}
                          className="w-11 h-11 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                        >
                          <Pencil size={18} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => requestAdminVerification('delete', item.id)}
                          disabled={actionLoading}
                          className="w-11 h-11 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0">
                    <div className="grid grid-cols-[150px_1fr_40px] items-center gap-4 py-5 border-t border-slate-200 first:border-t-0">
                      <span className="text-slate-500">Login</span>
                      <span className="break-all text-slate-900">{item.login}</span>

                      {canView && (
                        <button
                          onClick={() => requestAdminVerification('copy-login', item.id)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <Copy size={18} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-[150px_1fr_80px] items-center gap-4 py-5 border-t border-slate-200">
                      <span className="text-slate-500">Password</span>
                      <span className="text-slate-900">
                        {isVisible ? item.encryptedPassword : '••••••••••••••'}
                      </span>

                      {canView && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => requestAdminVerification('view', item.id)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>

                          <button
                            onClick={() => requestAdminVerification('copy-password', item.id)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <Copy size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-[150px_1fr_40px] items-center gap-4 py-5 border-t border-slate-200">
                      <span className="text-slate-500">URL</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 break-all hover:underline"
                      >
                        {item.url}
                      </a>

                      <button
                        onClick={() => window.open(item.url, '_blank')}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-[150px_1fr] gap-4 py-5 border-t border-slate-200">
                      <span className="text-slate-500">Tags</span>

                      <div className="flex flex-wrap gap-2">
                        {tagNames.map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-sm"
                          >
                            {tag}
                          </span>
                        ))}

                        {!tagNames.length && (
                          <span className="text-slate-400 text-sm">No tags</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!sameNamePasswords.length && (
              <div className="p-6 text-slate-500 text-sm">No passwords found.</div>
            )}
          </div>
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

export default PasswordDetailsPanel;