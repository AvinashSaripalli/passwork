import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Shield,
  Users,
  Activity,
  Folder,
  FolderOpen,
  LogOut,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import {
  fetchVaults,
  fetchFoldersByVault,
  selectFolder,
  clearSelectedFolder,
  openAddFolderModal,
  deleteFolder,
  clearVaultError,
} from '../../features/vault/vaultSlice';
import ShareFolderModal from '../folder/ShareFolderModal';
import RenameFolderModal from '../folder/RenameFolderModal';
import FolderActionsMenu from '../folder/FolderActionsMenu';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { slug: currentVaultSlug } = useParams();

  const { user } = useSelector((state) => state.auth);
  const {
    vaults,
    vaultsLoading,
    folders,
    foldersLoading,
    selectedFolderId,
    error,
  } = useSelector((state) => state.vault);

  const activeVault = vaults.find((v) => v.slug === currentVaultSlug);
  const currentVaultId = activeVault?.id;

  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [actionFolder, setActionFolder] = useState(null);

  useEffect(() => {
    dispatch(fetchVaults());
  }, [dispatch]);

  useEffect(() => {
    if (currentVaultId) {
      dispatch(fetchFoldersByVault(currentVaultId));
    }
  }, [dispatch, currentVaultId]);

  const menu = [
    { name: 'Security Dashboard', path: '/dashboard', icon: Shield },
    { name: 'Activity Log', path: '/activity-log', icon: Activity },
  ];

  if (user?.role === 'ADMIN') {
    menu.splice(1, 0, {
      name: 'Team Management',
      path: '/team-management',
      icon: Users,
    });
  }

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const openRename = (folder) => {
    setActionFolder(folder);
    setRenameOpen(true);
  };

  const openShare = (folder) => {
    setActionFolder(folder);
    setShareOpen(true);
  };

  const handleDeleteFolder = async (folder) => {
    dispatch(clearVaultError());

    const confirmed = window.confirm(`Delete folder "${folder.name}"?`);
    if (!confirmed) return;

    const result = await dispatch(deleteFolder(folder.id));

    if (deleteFolder.rejected.match(result)) {
      alert(result.payload || 'Failed to delete folder');
    }
  };

  return (
    <>
      <aside className="w-[290px] bg-white border-r border-slate-200 px-5 py-6 flex flex-col">
        <div className="mb-9">
          <h1 className="text-[30px] leading-none font-bold text-slate-900">
            Passwork
          </h1>
          <p className="text-sm text-slate-500 mt-3">
            {user?.role === 'ADMIN' ? 'Administrator' : 'User'}
          </p>
        </div>

        <div className="mb-9">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase mb-4">
            Management
          </p>

          <div className="space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] transition ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={17} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase mb-4">
            Company Vault
          </p>

          {vaultsLoading && (
            <p className="text-sm text-slate-400 px-3 py-2">
              Loading vaults...
            </p>
          )}

          {!vaultsLoading &&
            vaults.map((vault) => {
              const vaultActive = location.pathname === `/vaults/${vault.slug}`;

              return (
                <div key={vault.id} className="mb-2">
                  <div
                    className={`flex items-center justify-between px-3 py-3 rounded-2xl ${
                      vaultActive
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Link
                      to={`/vaults/${vault.slug}`}
                      onClick={() => dispatch(clearSelectedFolder())}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <FolderOpen size={17} />
                      <span className="text-[15px] truncate">{vault.name}</span>
                    </Link>

                    <div className="flex items-center gap-2 ml-2">
                      {vaultActive && user?.role === 'ADMIN' && (
                        <button
                          onClick={() => dispatch(openAddFolderModal())}
                          className="w-7 h-7 rounded-lg border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-50"
                          title="Add folder"
                        >
                          <Plus size={14} />
                        </button>
                      )}

                      {vaultActive && (
                        <ChevronDown size={15} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {vaultActive && (
                    <div className="ml-6 mt-2 space-y-1 border-l border-slate-200 pl-3">
                      {foldersLoading && (
                        <p className="text-xs text-slate-400 py-1">
                          Loading folders...
                        </p>
                      )}

                      {!foldersLoading &&
                        folders.map((folder) => {
                          const selected = selectedFolderId === folder.id;

                          const folderPermission = folder?.permissions?.find(
                            (item) =>
                              item.userId === user?.id ||
                              item.user?.id === user?.id
                          );

                          const folderAccess =
                            user?.role === 'ADMIN'
                              ? 'ADMINISTRATOR'
                              : folderPermission?.accessLevel || null;

                          const canManageFolder =
                            user?.role === 'ADMIN' ||
                            folderAccess === 'ADMINISTRATOR';

                          return (
                            <div
                              key={folder.id}
                              className={`w-full flex items-center justify-between rounded-lg ${
                                selected
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <button
                                onClick={() => dispatch(selectFolder(folder.id))}
                                className="flex items-center gap-2 px-2 py-2 text-left text-sm flex-1 min-w-0"
                              >
                                <Folder size={14} />
                                <span className="truncate">{folder.name}</span>
                              </button>

                              <FolderActionsMenu
                                folder={folder}
                                canManage={canManageFolder}
                                onRename={openRename}
                                onShare={openShare}
                                onDelete={handleDeleteFolder}
                              />
                            </div>
                          );
                        })}

                      {!foldersLoading && !folders.length && (
                        <p className="text-xs text-slate-400 py-1">No folders</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      <ShareFolderModal
        open={shareOpen}
        onClose={() => {
          setShareOpen(false);
          setActionFolder(null);
        }}
        folderId={actionFolder?.id || null}
        vaultId={currentVaultId}
      />

      <RenameFolderModal
        open={renameOpen}
        onClose={() => {
          setRenameOpen(false);
          setActionFolder(null);
        }}
        folder={actionFolder}
        vaultId={currentVaultId}
      />
    </>
  );
}

export default Sidebar;