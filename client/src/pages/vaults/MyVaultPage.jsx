import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';

import MyVaultHeader from '../../components/myVault/MyVaultHeader';
import MyVaultSidebar from '../../components/myVault/MyVaultSidebar';
import MyVaultPasswordWorkspace from '../../components/myVault/MyVaultPasswordWorkspace';

import CreateFolderModal from '../../components/myVault/CreateFolderModal';
import EditFolderModal from '../../components/myVault/EditFolderModal';

import AddMyVaultPasswordModal from '../../components/myVault/AddMyVaultPasswordModal';
import EditMyVaultPasswordModal from '../../components/myVault/EditMyVaultPasswordModal';

import SharePasswordModal from '../../components/myVault/SharePasswordModal';
import ManagePasswordSharesModal from '../../components/myVault/ManagePasswordSharesModal';
import ViewMyVaultPasswordModal from '../../components/myVault/ViewMyVaultPasswordModal';
import ConfirmModal from '../../components/common/ConfirmModal';

import {
  createMyVaultFolder,
  createMyVaultPassword,
  deleteMyVaultFolder,
  deleteMyVaultPassword,
  fetchMyVault,
  setSelectedFolderId,
  updateMyVaultFolder,
  updateMyVaultPassword,
} from '../../features/myVault/myVaultSlice';

import {
  clearShareError,
  removePasswordShare,
  sharePasswordToUser,
} from '../../features/sharedPasswords/sharedPasswordsSlice';

function MyVaultPage() {
  const dispatch = useDispatch();

  const { folders, passwords, selectedFolderId, loading } = useSelector(
    (state) => state.myVault
  );

  const { sharing, shareError } = useSelector(
    (state) => state.sharedPasswords
  );

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editPasswordOpen, setEditPasswordOpen] = useState(false);
  const [addChildParent, setAddChildParent] = useState(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [manageSharesOpen, setManageSharesOpen] = useState(false);

  const [selectedPassword, setSelectedPassword] = useState(null);
  const [selectedFolderForEdit, setSelectedFolderForEdit] = useState(null);
  const [selectedPasswordForEdit, setSelectedPasswordForEdit] = useState(null);
  const [viewPasswordOpen, setViewPasswordOpen] = useState(false);
  const [selectedPasswordForView, setSelectedPasswordForView] = useState(null);
  const [selectedPasswordId, setSelectedPasswordId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: '', item: null });

  useEffect(() => {
    dispatch(fetchMyVault());
  }, [dispatch]);

  const filteredPasswords = useMemo(() => {
    if (!selectedFolderId) return passwords;

    return passwords.filter((item) => item.folderId === selectedFolderId);
  }, [passwords, selectedFolderId]);

  const selectedFolder = folders.find((item) => item.id === selectedFolderId);
  const addFolderForChild = addChildParent
    ? folders.find((item) => item.id === addChildParent.folderId)
    : null;

  const openAddPasswordModal = (parent = null) => {
    setAddChildParent(parent);
    setPasswordModalOpen(true);
  };

  const handleCreateFolder = async (name) => {
    const result = await dispatch(createMyVaultFolder({ name }));

    if (createMyVaultFolder.fulfilled.match(result)) {
      setFolderModalOpen(false);
    }
  };

  const handleViewPassword = (password) => {
    setSelectedPasswordForView(password);
    setViewPasswordOpen(true);
  };

  const handleEditFolder = (folder) => {
    setSelectedFolderForEdit(folder);
    setEditFolderOpen(true);
  };

  const handleUpdateFolder = async (name) => {
    if (!selectedFolderForEdit) return;

    const result = await dispatch(
      updateMyVaultFolder({
        folderId: selectedFolderForEdit.id,
        name,
      })
    );

    if (updateMyVaultFolder.fulfilled.match(result)) {
      setEditFolderOpen(false);
      setSelectedFolderForEdit(null);
    }
  };

  const handleDeleteFolder = async (folder) => {
    setConfirmDelete({ open: true, type: 'folder', item: folder });
  };

  const handleCreatePassword = async (payload) => {
    const result = await dispatch(createMyVaultPassword(payload));

    if (createMyVaultPassword.fulfilled.match(result)) {
      setPasswordModalOpen(false);
      setAddChildParent(null);
    }
  };

  const handleEditPassword = (password) => {
    setSelectedPasswordForEdit(password);
    setEditPasswordOpen(true);
  };

  const handleUpdatePassword = async (data) => {
    if (!selectedPasswordForEdit) return;

    const result = await dispatch(
      updateMyVaultPassword({
        passwordId: selectedPasswordForEdit.id,
        data,
      })
    );

    if (updateMyVaultPassword.fulfilled.match(result)) {
      setEditPasswordOpen(false);
      setSelectedPasswordForEdit(null);
    }
  };

  const handleDeletePassword = async (password) => {
    setConfirmDelete({ open: true, type: 'password', item: password });
  };

  const executeDelete = async () => {
    const { type, item } = confirmDelete;
    if (!item) return;

    if (type === 'folder') {
      await dispatch(deleteMyVaultFolder(item.id));
    } else if (type === 'password') {
      await dispatch(deleteMyVaultPassword(item.id));
    }

    setConfirmDelete({ open: false, type: '', item: null });
  };

  const handleOpenShare = (password) => {
    dispatch(clearShareError());
    setSelectedPassword(password);
    setShareModalOpen(true);
  };

  const handleSharePassword = async (userId) => {
    if (!selectedPassword) return;

    const result = await dispatch(
      sharePasswordToUser({
        passwordId: selectedPassword.id,
        userId,
      })
    );

    if (sharePasswordToUser.fulfilled.match(result)) {
      setShareModalOpen(false);
      setSelectedPassword(null);
    }
  };

  const handleManageShares = (password) => {
    setSelectedPassword(password);
    setManageSharesOpen(true);
  };

  const handleRemoveShare = async (shareId) => {
    await dispatch(removePasswordShare(shareId));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <MyVaultHeader
          folders={folders}
          onCreateFolder={() => setFolderModalOpen(true)}
          onCreatePassword={() => openAddPasswordModal()}
        />

        <div className="grid grid-cols-[280px_1fr] gap-5">
          <MyVaultSidebar
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => dispatch(setSelectedFolderId(id))}
            onEditFolder={handleEditFolder}
            onDeleteFolder={handleDeleteFolder}
          />

          <MyVaultPasswordWorkspace
            loading={loading}
            passwords={filteredPasswords}
            selectedPasswordId={selectedPasswordId}
            onSelectPassword={setSelectedPasswordId}
            onViewPassword={handleViewPassword}
            onSharePassword={handleOpenShare}
            onEditPassword={handleEditPassword}
            onDeletePassword={handleDeletePassword}
            onManageShares={handleManageShares}
            onAddChild={openAddPasswordModal}
          />
        </div>

        <CreateFolderModal
          open={folderModalOpen}
          onClose={() => setFolderModalOpen(false)}
          onSubmit={handleCreateFolder}
        />

        <EditFolderModal
          open={editFolderOpen}
          folder={selectedFolderForEdit}
          onClose={() => {
            setEditFolderOpen(false);
            setSelectedFolderForEdit(null);
          }}
          onSubmit={handleUpdateFolder}
        />

        <AddMyVaultPasswordModal
          open={passwordModalOpen}
          folders={folders}
          selectedFolder={addFolderForChild || selectedFolder}
          parent={addChildParent}
          onClose={() => {
            setPasswordModalOpen(false);
            setAddChildParent(null);
          }}
          onSubmit={handleCreatePassword}
        />

        <EditMyVaultPasswordModal
          open={editPasswordOpen}
          password={selectedPasswordForEdit}
          folders={folders}
          onClose={() => {
            setEditPasswordOpen(false);
            setSelectedPasswordForEdit(null);
          }}
          onSubmit={handleUpdatePassword}
        />

        <SharePasswordModal
          open={shareModalOpen}
          password={selectedPassword}
          loading={sharing}
          error={shareError}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedPassword(null);
          }}
          onSubmit={handleSharePassword}
        />

        <ManagePasswordSharesModal
          open={manageSharesOpen}
          password={selectedPassword}
          onClose={() => {
            setManageSharesOpen(false);
            setSelectedPassword(null);
          }}
          onRemoveShare={handleRemoveShare}
        />
        <ViewMyVaultPasswordModal
          open={viewPasswordOpen}
          password={selectedPasswordForView}
          onClose={() => {
            setViewPasswordOpen(false);
            setSelectedPasswordForView(null);
          }}
        />

        <ConfirmModal
          open={confirmDelete.open}
          title={confirmDelete.type === 'folder' ? 'Delete Folder' : 'Delete Password'}
          message={
            confirmDelete.type === 'folder'
              ? `Are you sure you want to delete "${confirmDelete.item?.name}"? This action cannot be undone.`
              : `Are you sure you want to delete "${confirmDelete.item?.name}"? This action cannot be undone.`
          }
          confirmLabel="Delete"
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete({ open: false, type: '', item: null })}
        />
      </div>
    </AppLayout>
  );
}

export default MyVaultPage;