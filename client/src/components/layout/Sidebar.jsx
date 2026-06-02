import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Shield, Users, Activity, Folder, FolderOpen,
  LogOut, Plus, ChevronDown, LockKeyhole, Share2, User, Sparkles,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import api from '../../services/api';
import {
  fetchVaults, fetchFoldersByVault, selectFolder, clearSelectedFolder,
  openAddFolderModal, deleteFolder, clearVaultError,
} from '../../features/vault/vaultSlice';
import ShareFolderModal from '../folder/ShareFolderModal';
import RenameFolderModal from '../folder/RenameFolderModal';
import FolderActionsMenu from '../folder/FolderActionsMenu';
import ConfirmModal from '../common/ConfirmModal';
import PasswordGeneratorModal from '../tools/PasswordGeneratorModal';
import logo from '../../assets/Vaultix1.png';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { slug: currentVaultSlug } = useParams();

  const { user } = useSelector((state) => state.auth);
  const { vaults, vaultsLoading, folders, foldersLoading, selectedFolderId, error } =
    useSelector((state) => state.vault);

  const activeVault = vaults.find((v) => v.slug === currentVaultSlug);
  const currentVaultId = activeVault?.id;

  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [actionFolder, setActionFolder] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, folder: null });
  const [unreadCount, setUnreadCount] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => { dispatch(fetchVaults()); }, [dispatch]);

  useEffect(() => {
    if (currentVaultId) dispatch(fetchFoldersByVault(currentVaultId));
  }, [dispatch, currentVaultId]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const params = {};
        const lastViewed = localStorage.getItem('lastViewedAt');
        if (lastViewed) params.since = lastViewed;
        const res = await api.get('/notifications/recent-activity', { params });
        setUnreadCount(res.data.unreadCount || 0);
      } catch { setUnreadCount(0); }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const overviewMenu = [{ name: 'Security Dashboard', path: '/dashboard', icon: Shield }];
  const vaultMenu = [
    { name: 'Personal Vault', path: '/my-vault', icon: LockKeyhole },
    { name: 'Shared With Me', path: '/shared-with-me', icon: Share2 },
  ];
  const securityMenu = [{ name: 'Activity Log', path: '/activity-log', icon: Activity, badge: unreadCount }];
  const toolsMenu = [{ name: 'Password Generator', icon: Sparkles }];
  const adminMenu = user?.role === 'ADMIN'
    ? [{ name: 'Team Management', path: '/team-management', icon: Users }]
    : [];

  const accountMenu = [{ name: 'Profile', path: '/profile', icon: User }];

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };
  const openRename = (folder) => { setActionFolder(folder); setRenameOpen(true); };
  const openShare = (folder) => { setActionFolder(folder); setShareOpen(true); };
  const handleDeleteFolder = (folder) => { dispatch(clearVaultError()); setConfirmDelete({ open: true, folder }); };
  const executeDeleteFolder = async () => {
    if (!confirmDelete.folder) return;
    const result = await dispatch(deleteFolder(confirmDelete.folder.id));
    if (deleteFolder.rejected.match(result)) alert(result.payload || 'Failed to delete folder');
    setConfirmDelete({ open: false, folder: null });
  };

  const renderMenuSection = (title, items) => {
    if (!items.length) return null;
    return (
      <div>
        <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5 text-slate-400">
          {title}
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
                <span className="flex-1">{item.name}</span>
                {item.badge > 0 && (
                  <span className="h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside className="w-[260px] bg-white border-r border-slate-200 px-3 py-5 flex flex-col">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-7 px-2">
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={logo} alt="Vaultix Logo" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-[16px] font-bold text-slate-900 leading-tight">
              Vault<span className="text-blue-600">ix</span>
            </p>
            <p className="text-[11px] text-slate-400">
              {user?.role === 'ADMIN' ? 'Administrator' : 'User'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-0.5">

          {renderMenuSection('Overview', overviewMenu)}
          {renderMenuSection('Vaults', vaultMenu)}

          {/* Company Vault */}
          <div>
            <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5 text-slate-400">
              Company Vault
            </p>

            {vaultsLoading && (
              <p className="text-xs text-slate-400 px-3 py-2">Loading vaults...</p>
            )}

            {!vaultsLoading && vaults.map((vault) => {
              const vaultActive = location.pathname === `/vaults/${vault.slug}`;
              return (
                <div key={vault.id} className="mb-1">
                  <div className={`flex items-center justify-between px-2 py-2 rounded-xl transition-all duration-150 ${
                    vaultActive
                      ? 'bg-blue-50 border border-blue-100'
                      : 'border border-transparent hover:bg-slate-50'
                  }`}>
                    <Link
                      to={`/vaults/${vault.slug}`}
                      onClick={() => dispatch(clearSelectedFolder())}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        vaultActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <FolderOpen size={15} />
                      </div>
                      <span className={`text-sm truncate ${
                        vaultActive ? 'text-blue-700 font-semibold' : 'text-slate-600 font-medium'
                      }`}>
                        {vault.name}
                      </span>
                    </Link>

                    <div className="flex items-center gap-1 ml-1">
                      {vaultActive && user?.role === 'ADMIN' && (
                        <button
                          onClick={() => dispatch(openAddFolderModal())}
                          className="w-7 h-7 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-500 hover:bg-blue-50 transition"
                          title="Add folder"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                      {vaultActive && <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Folders */}
                  {vaultActive && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-blue-100 pl-3">
                      {foldersLoading && (
                        <p className="text-xs text-slate-400 py-1">Loading folders...</p>
                      )}
                      {!foldersLoading && folders.map((folder) => {
                        const selected = selectedFolderId === folder.id;
                        const folderPermission = folder?.permissions?.find(
                          (item) => item.userId === user?.id || item.user?.id === user?.id
                        );
                        const folderAccess = user?.role === 'ADMIN'
                          ? 'ADMINISTRATOR'
                          : folderPermission?.accessLevel || null;
                        const canManageFolder = user?.role === 'ADMIN' || folderAccess === 'ADMINISTRATOR';

                        return (
                          <div
                            key={folder.id}
                            className={`w-full flex items-center justify-between rounded-lg transition-all duration-150 ${
                              selected ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                          >
                            <button
                              onClick={() => dispatch(selectFolder(folder.id))}
                              className="flex items-center gap-2 px-2.5 py-2 text-left text-sm flex-1 min-w-0"
                            >
                              <Folder size={13} className={selected ? 'text-blue-500' : 'text-slate-400'} />
                              <span className={`truncate ${selected ? 'font-medium' : ''}`}>
                                {folder.name}
                              </span>
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
                        <p className="text-xs text-slate-400 py-2 px-2">No folders</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {renderMenuSection('Security', securityMenu)}

          {/* Tools */}
          <div>
            <p className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5 text-slate-400">
              Tools
            </p>
            <div className="space-y-0.5">
              {toolsMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => setToolsOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  >
                    <Icon size={16} className="text-slate-400" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {renderMenuSection('Administration', adminMenu)}
          {renderMenuSection('Account', accountMenu)}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 mt-4 pt-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <ShareFolderModal
        open={shareOpen}
        onClose={() => { setShareOpen(false); setActionFolder(null); }}
        folderId={actionFolder?.id || null}
        vaultId={currentVaultId}
      />
      <RenameFolderModal
        open={renameOpen}
        onClose={() => { setRenameOpen(false); setActionFolder(null); }}
        folder={actionFolder}
        vaultId={currentVaultId}
      />
      <ConfirmModal
        open={confirmDelete.open}
        title="Delete Folder"
        message={`Are you sure you want to delete "${confirmDelete.folder?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={executeDeleteFolder}
        onCancel={() => setConfirmDelete({ open: false, folder: null })}
      />

      <PasswordGeneratorModal
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
      />
    </>
  );
}

export default Sidebar;