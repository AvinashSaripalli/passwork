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
import FolderHistoryPanel from '../../components/folder/FolderHistoryPanel';
import FolderMembersSummary from '../../components/folder/FolderMembersSummary';
import FolderUsersModal from '../../components/folder/FolderUsersModal';
import VerifyAdminMasterPasswordModal from '../../components/security/VerifyAdminMasterPasswordModal';
import { safeDecryptText, encryptText } from '../../utils/crypto';

import * as XLSX from 'xlsx';
import api from '../../services/api';

import {
  MoreVertical,
  History,
  Users,
  Download,
  Upload,
  Trash2,
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
  const [usersOpen, setUsersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportVerifyOpen, setExportVerifyOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importVerifyOpen, setImportVerifyOpen] = useState(false);

  const { user, token } = useSelector((state) => state.auth);

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
      alert('Vault not loaded');
      return;
    }

    if (!selectedFolder?.id) {
      alert('Please select a folder first');
      return;
    }

    if (!folderPasswords.length) {
      alert('No passwords found in this folder');
      return;
    }

    setExportVerifyOpen(true);
  };

  const handleExportVerified = async (adminMasterPassword) => {
    try {
      const rows = [];

      for (const item of folderPasswords) {
        const originalPassword = await safeDecryptText(
          item.encryptedPassword,
          adminMasterPassword,
          user?.encryptionSalt
        );

        const originalNote = item.encryptedNote
          ? await safeDecryptText(
              item.encryptedNote,
              adminMasterPassword,
              user?.encryptionSalt
            )
          : '';

        rows.push({
          Name: item.name || '',
          Login: item.login || '',
          Password: originalPassword,
          URL: item.url || '',
          Note: originalNote,
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
    } catch (error) {
      alert('Export failed. Unable to decrypt passwords.');
      setExportVerifyOpen(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!selectedVault?.id) {
      alert('Vault not loaded');
      return;
    }

    if (!selectedFolder?.id) {
      alert('Please select a folder first');
      return;
    }

    setImportFile(file);
    setImportVerifyOpen(true);
  };

  const handleImportVerified = async (adminMasterPassword) => {
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

        const encryptedPassword = await encryptText(
          String(password),
          adminMasterPassword,
          user?.encryptionSalt
        );

        const encryptedNote = note
          ? await encryptText(String(note), adminMasterPassword, user?.encryptionSalt)
          : '';

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
        alert('No valid rows found. Required columns: Name, Login, Password');
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
      alert(`${encryptedRows.length} passwords imported successfully`);

      setImportVerifyOpen(false);
      setImportFile(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to import Excel');
      setImportVerifyOpen(false);
    }
  };

  return (
    <AppLayout>
      <div className="bg-white rounded-[30px] border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Company Vault
              </p>

              <h1 className="text-[44px] leading-none font-bold text-slate-900 mt-1">
                {selectedFolder?.name || selectedVault?.name || 'Company Vault'}
              </h1>

              <FolderMembersSummary onClick={() => setUsersOpen(true)} />
            </div>

            <div className="flex items-center gap-4">
              {selectedFolder && canShareFolder && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="h-[46px] px-5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold"
                >
                  Share Folder
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
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
                >
                  <MoreVertical size={20} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg py-2 z-20">
                    <button
                      onClick={() => {
                        setHistoryOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      <History size={16} className="text-slate-500" />
                      History
                    </button>

                    <button
                      onClick={() => {
                        setUsersOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      <Users size={16} className="text-slate-500" />
                      Members
                    </button>

                    {selectedFolder && (
                      <>
                        <button
                          onClick={() => {
                            handleExportExcel();
                            setMenuOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50"
                        >
                          <Download size={16} className="text-slate-500" />
                          Export
                        </button>

                        <label className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                          <Upload size={16} className="text-slate-500" />
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
                      </>
                    )}

                    {canDeleteFolder && (
                      <button
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete folder "${selectedFolder.name}"?`
                          );

                          if (confirmed) {
                            dispatch(deleteFolder(selectedFolder.id));
                          }

                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
          <div className="p-8 text-slate-500">Loading vault...</div>
        )}

        {error && <div className="p-8 text-red-600">{error}</div>}

        {!vaultsLoading && !passwordsLoading && !error && (
          <>
            {!selectedFolderId ? (
              <div className="min-h-[640px] flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Users size={28} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  Select a folder
                </h2>

                <p className="text-slate-500 mt-2 text-sm">
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
      
      <VerifyAdminMasterPasswordModal
        open={importVerifyOpen}
        onClose={() => {
          setImportVerifyOpen(false);
          setImportFile(null);
        }}
        onVerified={handleImportVerified}
      />
      <ShareFolderModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        folderId={selectedFolder?.id || null}
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

      <VerifyAdminMasterPasswordModal
        open={exportVerifyOpen}
        onClose={() => setExportVerifyOpen(false)}
        onVerified={handleExportVerified}
      />

      <AddFolderModal />
      <AddPasswordModal />
      <EditPasswordModal />
    </AppLayout>
  );
}

export default VaultPage;