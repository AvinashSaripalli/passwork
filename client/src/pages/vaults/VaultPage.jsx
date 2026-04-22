import { useEffect, useState } from 'react';
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

  const { user, token } = useSelector((state) => state.auth);
  const {
    selectedVault,
    folders,
    selectedFolderId,
    vaultsLoading,
    passwordsLoading,
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

  const canAddPassword =
    user?.role === 'ADMIN' ||
    ['ADMINISTRATOR', 'FULL_ACCESS'].includes(selectedFolderAccess);

  const canShareFolder =
    !!selectedFolder &&
    (user?.role === 'ADMIN' || selectedFolderAccess === 'ADMINISTRATOR');

  const canDeleteFolder =
    !!selectedFolder &&
    (user?.role === 'ADMIN' || selectedFolderAccess === 'ADMINISTRATOR');

  const handleExportExcel = async () => {
    try {
      if (!selectedVault?.id) {
        alert('Vault not loaded');
        return;
      }

      const response = await api.get(
        `/passwords/export-excel?vaultId=${selectedVault.id}&folderId=${selectedFolder?.id || ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedFolder?.name || selectedVault?.name || 'passwords'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export Excel');
    }
  };

  const handleImportExcel = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!selectedVault?.id) {
        alert('Vault not loaded');
        return;
      }

      if (!selectedFolder?.id) {
        alert('Please select a folder first');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      await api.post(
        '/passwords/import-excel',
        {
          vaultId: selectedVault.id,
          folderId: selectedFolder.id,
          rows,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      dispatch(fetchPasswordsByVault(selectedVault.id));
      alert('Passwords imported successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to import Excel');
    } finally {
      e.target.value = '';
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
          <div className="grid grid-cols-[420px_1fr] min-h-[640px]">
            <PasswordListPanel />
            <PasswordDetailsPanel />
          </div>
        )}
      </div>

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

      <AddFolderModal />
      <AddPasswordModal />
      <EditPasswordModal />
    </AppLayout>
  );
}

export default VaultPage;