import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import AppLayout from '../../components/layout/AppLayout';
import PasswordListPanel from '../../components/vault/PasswordListPanel';
import PasswordDetailsPanel from '../../components/vault/PasswordDetailsPanel';
import AddPasswordModal from '../../components/vault/AddPasswordModal';
import EditPasswordModal from '../../components/vault/EditPasswordModal';
import AddFolderModal from '../../components/vault/AddFolderModal';
import ShareFolderModal from '../../components/folder/ShareFolderModal';
import ShareVaultModal from '../../components/vault/ShareVaultModal';
import FolderHistoryPanel from '../../components/folder/FolderHistoryPanel';
import FolderMembersSummary from '../../components/folder/FolderMembersSummary';
import FolderUsersModal from '../../components/folder/FolderUsersModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { safeDecryptText, unwrapItemKey, decryptTextWithAesKey, encryptTextWithAesKey, wrapItemKey } from '../../utils/crypto';
import { showToast } from '../../utils/toast';

import * as XLSX from 'xlsx';
import api from '../../services/api';

import {
  MoreVertical,
  History,
  Users,
  Download,
  Upload,
  Trash2,
  RefreshCw,
} from 'lucide-react';

import {
  fetchPasswordsByVault,
  fetchVaultBySlug,
  fetchFoldersByVault,
  openAddPasswordModal,
  deleteFolder,
} from '../../features/vault/vaultSlice';

function VaultPage() {
  const dispatch = useDispatch();
  const { slug } = useParams();

  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [vaultShareOpen, setVaultShareOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rewrapping, setRewrapping] = useState(false);

  const { user, token, sessionMasterPassword, sessionRsaPrivateKey, sessionRsaPublicKey } = useSelector(
    (state) => state.auth
  );

  const isAdminUser = user?.role === 'ADMIN';

  const {
    selectedVault,
    folders,
    selectedFolderId,
    vaultsLoading,
    passwordsLoading,
    passwords,
    error,
  } = useSelector((state) => state.vault);

  const selectedFolder = folders.find((item) => item.id === selectedFolderId);

  const selectedFolderPermission = selectedFolder?.permissions?.find(
    (item) => item.userId === user?.id || item.user?.id === user?.id
  );

  const selectedFolderAccess =
    user?.role === 'ADMIN'
      ? 'ADMINISTRATOR'
      : selectedFolderPermission?.accessLevel || null;

  useEffect(() => {
    if (slug) {
      dispatch(fetchVaultBySlug(slug));
    }
  }, [dispatch, slug]);

  useEffect(() => {
    if (selectedVault?.id) {
      dispatch(fetchPasswordsByVault(selectedVault.id));
      dispatch(fetchFoldersByVault(selectedVault.id));
    }
  }, [dispatch, selectedVault?.id]);

  useEffect(() => {
    if (
      !selectedVault?.id ||
      !sessionRsaPrivateKey ||
      !sessionRsaPublicKey
    ) return;

    const unmigratedPasswords = passwords.filter((p) => !p.myWrappedKey && p.encryptedPassword);

    if (unmigratedPasswords.length === 0) return;

    let cancelled = false;

    const migrate = async () => {
      const publicKeysCache = {};

      const getPublicKeyForUser = async (uid) => {
        if (publicKeysCache[uid]) return publicKeysCache[uid];
        try {
          const res = await api.get(`/keypair/${uid}/public`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          publicKeysCache[uid] = res.data.publicKey;
          return res.data.publicKey;
        } catch {
          return null;
        }
      };

      const getAllUserIdsWithAccess = (folderId) => {
        const folder = folders.find((f) => f.id === folderId);
        if (!folder?.permissions) return [];
        return folder.permissions.map((p) => p.userId).filter(Boolean);
      };

      const passwordUpdates = [];

      for (const item of unmigratedPasswords) {
        if (cancelled) return;
        if (!sessionMasterPassword) return;

        try {
          const plainPassword = await safeDecryptText(
            item.encryptedPassword, sessionMasterPassword, user?.encryptionSalt
          );
          const { encryptedData: reEncrypted, aesKeyJwk } = await encryptTextWithAesKey(plainPassword);

          let reEncryptedNote = undefined;
          if (item.encryptedNote) {
            const plainNote = await safeDecryptText(
              item.encryptedNote, sessionMasterPassword, user?.encryptionSalt
            );
            if (plainNote) {
              const { encryptedData } = await encryptTextWithAesKey(plainNote);
              reEncryptedNote = encryptedData;
            }
          }

          const userIds = getAllUserIdsWithAccess(item.folderId);
          if (!userIds.includes(user.id)) userIds.push(user.id);

          const wrappedKeys = {};
          for (const uid of userIds) {
            const pubKey = await getPublicKeyForUser(uid);
            if (pubKey) {
              wrappedKeys[uid] = await wrapItemKey(aesKeyJwk, pubKey);
            }
          }

          passwordUpdates.push({
            id: item.id,
            encryptedPassword: reEncrypted,
            ...(reEncryptedNote !== undefined && { encryptedNote: reEncryptedNote }),
            wrappedKeys,
          });
        } catch {
          // skip
        }
      }

      if (cancelled || passwordUpdates.length === 0) return;

      try {
        await api.post('/passwords/batch-wrap', {
          wrappedPasswords: passwordUpdates,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          dispatch(fetchPasswordsByVault(selectedVault.id));
        }
      } catch {
        // best-effort
      }
    };

    migrate();

    return () => { cancelled = true; };
  }, [passwords, selectedVault?.id, sessionRsaPrivateKey, sessionRsaPublicKey, sessionMasterPassword, user, token, dispatch, folders]);

  const folderPasswords = useMemo(() => {
    if (!selectedFolder?.id) return [];

    return passwords.filter((item) => item.folderId === selectedFolder.id);
  }, [passwords, selectedFolder?.id]);

  const canAddPassword =
    user?.role === 'ADMIN' ||
    ['ADMINISTRATOR', 'FULL_ACCESS'].includes(selectedFolderAccess);

  const canShareFolder =
    !!selectedFolder &&
    (user?.role === 'ADMIN' || selectedFolderAccess === 'ADMINISTRATOR');

  const canDeleteFolder =
    !!selectedFolder &&
    (user?.role === 'ADMIN' || selectedFolderAccess === 'ADMINISTRATOR');

  const handleExportExcel = () => {
    if (!selectedVault?.id) {
      showToast('Vault not loaded', 'error');
      return;
    }

    if (!selectedFolder?.id) {
      showToast('Please select a folder first', 'error');
      return;
    }

    if (!folderPasswords.length) {
      showToast('No passwords found in this folder', 'error');
      return;
    }

    handleExportVerified();
  };

  const handleExportVerified = async () => {
    try {
      const rows = [];

      for (const item of folderPasswords) {
        let originalPassword = '';
        let originalNote = '';

        if (item.myWrappedKey && sessionRsaPrivateKey) {
          try {
            const aesKeyJwk = await unwrapItemKey(item.myWrappedKey, sessionRsaPrivateKey);
            originalPassword = await decryptTextWithAesKey(item.encryptedPassword, aesKeyJwk);
            originalNote = item.encryptedNote
              ? await decryptTextWithAesKey(item.encryptedNote, aesKeyJwk)
              : '';
          } catch {
            // skip this password
          }
        }

        rows.push({
          Name: item.name || '',
          Login: item.login || '',
          Password: originalPassword || '[Encrypted]',
          URL: item.url || '',
          Note: originalNote || '',
          Tags:
            item.tags
              ?.map((tagItem) => tagItem.tag?.name)
              .filter(Boolean)
              .join(', ') || '',
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Passwords');

      XLSX.writeFile(
        workbook,
        `${selectedFolder?.name || selectedVault?.name || 'passwords'}.xlsx`
      );

      setExportVerifyOpen(false);
    } catch {
      showToast('Export failed. Unable to decrypt passwords.', 'error');
      setExportVerifyOpen(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!selectedVault?.id) {
      showToast('Vault not loaded', 'error');
      return;
    }

    if (!selectedFolder?.id) {
      showToast('Please select a folder first', 'error');
      return;
    }

    setImportFile(file);

    handleImportVerified();
  };

  const handleImportVerified = async () => {
    try {
      if (!importFile) return;

      const arrayBuffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
      });

      const encryptedRows = [];

      for (const row of rows) {
        const name = row.Name || row.name || '';
        const login = row.Login || row.login || '';
        const password = row.Password || row.password || '';
        const url = row.URL || row.Url || row.url || '';
        const note = row.Note || row.note || '';
        const tagsText = row.Tags || row.tags || '';

        if (!name || !login || !password) continue;

        const { encryptedData: encryptedPassword, aesKeyJwk } = await encryptTextWithAesKey(
          String(password)
        );

        const { encryptedData: encryptedNote } = note
          ? await encryptTextWithAesKey(String(note))
          : { encryptedData: '' };

        const tags = tagsText
          ? String(tagsText)
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [];

        encryptedRows.push({
          name: String(name).trim(),
          login: String(login).trim(),
          encryptedPassword,
          encryptedNote,
          url: String(url).trim(),
          tags,
        });
      }

      if (!encryptedRows.length) {
        showToast('No valid rows found. Required columns: Name, Login, Password', 'error');
        setImportVerifyOpen(false);
        setImportFile(null);
        return;
      }

      await api.post(
        '/passwords/import-excel',
        {
          vaultId: selectedVault.id,
          folderId: selectedFolder.id,
          rows: encryptedRows,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      dispatch(fetchPasswordsByVault(selectedVault.id));
      showToast(`${encryptedRows.length} passwords imported successfully`);

      setImportVerifyOpen(false);
      setImportFile(null);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to import Excel', 'error');
      setImportVerifyOpen(false);
    }
  };

  const handleRewrapKeys = async () => {
    if (!selectedFolder?.id) return;

    const rsaKey = sessionRsaPrivateKey;
    if (!rsaKey) {
      showToast('Encryption key not available. Please refresh the page.', 'error');
      return;
    }

    try {
      setRewrapping(true);

      const passwordsRes = await api.get(`/passwords/vault/${selectedVault.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allPasswords = passwordsRes.data || [];
      const folderPasswords = allPasswords.filter((pw) => pw.folderId === selectedFolder.id);

      const folderRes = await api.get(`/folders/${selectedFolder.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const folderData = folderRes.data;
      const permissions = folderData?.permissions || [];

      const memberIds = permissions
        .map((p) => p.userId || p.user?.id)
        .filter((id) => id && id !== user.id);

      if (memberIds.length === 0) {
        showToast('No other members to wrap keys for', 'error');
        return;
      }

      const publicKeysCache = {};
      for (const memberId of memberIds) {
        try {
          const keyRes = await api.get(`/keypair/${memberId}/public`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (keyRes.data?.publicKey) {
            publicKeysCache[memberId] = keyRes.data.publicKey;
          }
        } catch {
          // skip
        }
      }

      let wrappedCount = 0;
      const wrappedUpdates = [];

      for (const pw of folderPasswords) {
        const myWrappedKey = pw.myWrappedKey;
        if (!myWrappedKey) continue;

        let aesKeyJwk;
        try {
          aesKeyJwk = await unwrapItemKey(myWrappedKey, rsaKey);
        } catch {
          continue;
        }

        const newWrappedKeys = { ...(pw.wrappedKeys || {}) };
        let changed = false;

        for (const memberId of memberIds) {
          if (newWrappedKeys[memberId]) continue;

          const memberPublicKey = publicKeysCache[memberId];
          if (!memberPublicKey) continue;

          try {
            newWrappedKeys[memberId] = await wrapItemKey(aesKeyJwk, memberPublicKey);
            changed = true;
            wrappedCount++;
          } catch {
            // skip
          }
        }

        if (changed) {
          wrappedUpdates.push({
            id: pw.id,
            wrappedKeys: newWrappedKeys,
          });
        }
      }

      if (wrappedUpdates.length > 0) {
        await api.post('/passwords/batch-wrap', {
          wrappedPasswords: wrappedUpdates,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch(fetchPasswordsByVault(selectedVault.id));
        showToast(`Wrapped keys for ${wrappedCount} passwords`);
      } else {
        showToast('All passwords already have wrapped keys for members');
      }
    } catch {
      showToast('Failed to re-wrap keys', 'error');
    } finally {
      setRewrapping(false);
    }
  };

  return (
    <AppLayout>
      <div className="bg-white rounded-[30px] border border-slate-200 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div className="px-8 py-6 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Company Vault
              </p>

              <h1 className="text-[44px] leading-none font-bold text-slate-900 mt-1 dark:text-slate-100">
                {selectedFolder?.name || selectedVault?.name || 'Company Vault'}
              </h1>

              <FolderMembersSummary onClick={() => setUsersOpen(true)} />
            </div>

            <div className="flex items-center gap-4">
              {selectedFolder && canShareFolder && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="h-[46px] px-5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  Share Folder
                </button>
              )}

              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setVaultShareOpen(true)}
                  className="h-[46px] px-5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                >
                  Share Vault
                </button>
              )}

              {selectedFolder && canAddPassword && (
                <button
                  onClick={() => dispatch(openAddPasswordModal())}
                  className="h-[46px] px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                >
                  Add password
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center dark:hover:bg-slate-700"
                >
                  <MoreVertical size={20} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg py-2 z-20 dark:bg-slate-800 dark:border-slate-600">
                    <button
                      onClick={() => {
                        setHistoryOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <History size={16} className="text-slate-500 dark:text-slate-400" />
                      History
                    </button>

                    <button
                      onClick={() => {
                        setUsersOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Users size={16} className="text-slate-500 dark:text-slate-400" />
                      Members
                    </button>

                    {selectedFolder && (
                      <>
                        <button
                          onClick={() => {
                            handleExportExcel();
                            setMenuOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <Download size={16} className="text-slate-500 dark:text-slate-400" />
                          Export
                        </button>

                        <label className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer dark:hover:bg-slate-700">
                          <Upload size={16} className="text-slate-500 dark:text-slate-400" />
                          Import
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => {
                              handleImportExcel(e);
                              setMenuOpen(false);
                            }}
                            className="hidden"
                          />
                        </label>

                        {isAdminUser && (
                          <button
                            onClick={() => {
                              handleRewrapKeys();
                              setMenuOpen(false);
                            }}
                            disabled={rewrapping}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                          >
                            <RefreshCw size={16} className={`text-slate-500 dark:text-slate-400 ${rewrapping ? 'animate-spin' : ''}`} />
                            {rewrapping ? 'Re-wrapping...' : 'Re-wrap Keys for Members'}
                          </button>
                        )}
                      </>
                    )}

                    {canDeleteFolder && (
                      <button
                        onClick={() => {
                          setConfirmDelete(true);
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                        Delete Folder
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {(vaultsLoading || passwordsLoading) && (
          <div className="p-8 text-slate-500 dark:text-slate-400">Loading vault...</div>
        )}

        {error && <div className="p-8 text-red-600 dark:text-red-400">{error}</div>}

        {!vaultsLoading && !passwordsLoading && !error && (
          <>
            {!selectedFolderId ? (
              <div className="min-h-[640px] flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <Users size={28} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Select a folder
                </h2>

                <p className="text-slate-500 mt-2 text-sm dark:text-slate-400">
                  Click a folder from the left sidebar to view your passwords.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-[420px_1fr] min-h-[640px]">
                <PasswordListPanel />
                <PasswordDetailsPanel />
              </div>
            )}
          </>
        )}
      </div>
      
      <ShareFolderModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        folderId={selectedFolder?.id || null}
        vaultId={selectedVault?.id || null}
      />

      <ShareVaultModal
        open={vaultShareOpen}
        onClose={() => setVaultShareOpen(false)}
        vaultId={selectedVault?.id || null}
      />

      <FolderHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        folderId={selectedFolder?.id || null}
      />

      <FolderUsersModal
        open={usersOpen}
        onClose={() => setUsersOpen(false)}
        folderId={selectedFolder?.id || null}
        folderName={selectedFolder?.name || ''}
        onSaved={() => {
          if (selectedVault?.id) {
            dispatch(fetchFoldersByVault(selectedVault.id));
          }
        }}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete Folder"
        message={`Are you sure you want to delete "${selectedFolder?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          dispatch(deleteFolder(selectedFolder.id));
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <AddFolderModal />
      <AddPasswordModal />
      <EditPasswordModal />
    </AppLayout>
  );
}

export default VaultPage;