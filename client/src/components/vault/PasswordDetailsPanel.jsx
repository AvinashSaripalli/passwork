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
import ConfirmModal from '../common/ConfirmModal';
import { safeDecryptText } from '../../utils/crypto';
import { setCompanyPasswordEditCache } from '../../utils/companyPasswordEditCache';

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
  const [decryptedPasswords, setDecryptedPasswords] = useState({});
  const [decryptedNotes, setDecryptedNotes] = useState({});
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activePasswordId, setActivePasswordId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, name: '', passwordId: null });

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
        <p className="text-slate-500 dark:text-slate-400">Select a password to view details.</p>
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

  const decryptPasswordItem = async (item, adminMasterPassword) => {
    const creatorSalt = item.createdBy?.encryptionSalt || user?.encryptionSalt;

    const originalPassword = await safeDecryptText(
      item.encryptedPassword,
      adminMasterPassword,
      creatorSalt
    );

    const originalNote = item.encryptedNote
      ? await safeDecryptText(item.encryptedNote, adminMasterPassword, creatorSalt)
      : '';

    return {
      originalPassword,
      originalNote,
    };
  };

  const handleVerified = async (adminMasterPassword) => {
    try {
      const activePassword = getPasswordById(activePasswordId);

      if (!activePassword) {
        setPendingAction(null);
        setActivePasswordId(null);
        setVerifyOpen(false);
        return;
      }

      if (pendingAction === 'delete' && canDelete) {
        setConfirmDelete({ open: true, name: activePassword.name, passwordId: activePassword.id });
        return;
      }

      const { originalPassword, originalNote } = await decryptPasswordItem(
        activePassword,
        adminMasterPassword
      );

      if (pendingAction === 'view' && canView) {
        setDecryptedPasswords((prev) => ({
          ...prev,
          [activePassword.id]: originalPassword,
        }));

        setDecryptedNotes((prev) => ({
          ...prev,
          [activePassword.id]: originalNote,
        }));

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
        await navigator.clipboard.writeText(originalPassword);

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
        setCompanyPasswordEditCache(activePassword.id, {
          password: originalPassword,
          note: originalNote,
        });

        dispatch(selectPassword(activePassword.id));
        dispatch(openEditPasswordModal());
      }

      setPendingAction(null);
      setActivePasswordId(null);
      setVerifyOpen(false);
    } catch {
      alert('Failed to decrypt password. Please check administrator master password.');
      setPendingAction(null);
      setActivePasswordId(null);
      setVerifyOpen(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Selected password group</p>
        <h2 className="text-3xl font-bold text-slate-900 mt-1 dark:text-slate-100">
          {selectedPassword.name}
        </h2>
        <p className="text-slate-500 mt-2 dark:text-slate-400">
          {sameNamePasswords.length} account
          {sameNamePasswords.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-5">
        {sameNamePasswords.map((item, index) => {
          const isVisible = !!visiblePasswords[item.id];
          const tagNames = getTagNames(item);

          return (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-5 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight dark:text-slate-100">
                    Account {index + 1}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => requestAdminVerification('edit', item.id)}
                      className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => requestAdminVerification('delete', item.id)}
                      disabled={actionLoading}
                      className="w-9 h-9 rounded-xl border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden dark:border-slate-700">
                <DetailRow
                  label="Login"
                  value={item.login || '-'}
                  action={
                    <button
                      onClick={() =>
                        requestAdminVerification('copy-login', item.id)
                      }
                      className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      <Copy size={16} />
                    </button>
                  }
                />

                <DetailRow
                  label="Password"
                  value={
                    isVisible
                      ? decryptedPasswords[item.id] || ''
                      : '••••••••••••'
                  }
                  action={
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          requestAdminVerification('view', item.id)
                        }
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>

                      <button
                        onClick={() =>
                          requestAdminVerification('copy-password', item.id)
                        }
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  }
                />

                <DetailRow
                  label="URL"
                  value={
                    item.url ? (
                      <a
                        href={
                          item.url.startsWith('http')
                            ? item.url
                            : `https://${item.url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline break-all dark:text-blue-400 dark:hover:text-blue-400"
                      >
                        {item.url}
                      </a>
                    ) : (
                      'No URL'
                    )
                  }
                  action={
                    item.url ? (
                      <a
                        href={
                          item.url.startsWith('http')
                            ? item.url
                            : `https://${item.url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        <ExternalLink size={16} />
                      </a>
                    ) : null
                  }
                />

                <DetailRow
                  label="Note"
                  value={
                    isVisible
                      ? decryptedNotes[item.id] || 'No note'
                      : ''
                  }
                />

                <DetailRow
                  label="Tags"
                  value={
                    tagNames.length ? (
                      <div className="flex flex-wrap gap-2">
                        {tagNames.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">No tags</span>
                    )
                  }
                />
              </div>
            </div>
          );
        })}
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

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete Password"
        message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
        onConfirm={async () => {
          if (!confirmDelete.passwordId) return;
          const result = await dispatch(deletePassword(confirmDelete.passwordId));
          if (deletePassword.fulfilled.match(result)) {
            dispatch(selectPassword(null));
          }
          setConfirmDelete({ open: false, name: '', passwordId: null });
          setPendingAction(null);
          setActivePasswordId(null);
          setVerifyOpen(false);
        }}
        onCancel={() => {
          setConfirmDelete({ open: false, name: '', passwordId: null });
          setPendingAction(null);
          setActivePasswordId(null);
          setVerifyOpen(false);
        }}
      />
    </div>
  );
}

function DetailRow({ label, value, action }) {
  return (
    <div className="grid grid-cols-[120px_1fr_80px] items-center border-b border-slate-200 last:border-b-0 px-4 py-4 dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>

      <div className="text-sm text-slate-900 break-all dark:text-slate-100">
        {value}
      </div>

      <div className="flex justify-end">{action}</div>
    </div>
  );
}

export default PasswordDetailsPanel;