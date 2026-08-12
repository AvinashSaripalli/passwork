import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchMyVault = createAsyncThunk(
  'myVault/fetchMyVault',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/my-vault');
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load my vault'
      );
    }
  }
);

export const createMyVaultFolder = createAsyncThunk(
  'myVault/createMyVaultFolder',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/my-vault/folders', data);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create folder'
      );
    }
  }
);

export const updateMyVaultFolder = createAsyncThunk(
  'myVault/updateMyVaultFolder',
  async ({ folderId, name }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/my-vault/folders/${folderId}`, { name });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update folder'
      );
    }
  }
);

export const deleteMyVaultFolder = createAsyncThunk(
  'myVault/deleteMyVaultFolder',
  async (folderId, { rejectWithValue }) => {
    try {
      await api.delete(`/my-vault/folders/${folderId}`);
      return folderId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete folder'
      );
    }
  }
);

export const createMyVaultPassword = createAsyncThunk(
  'myVault/createMyVaultPassword',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/my-vault/passwords', data);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create password'
      );
    }
  }
);

export const updateMyVaultPassword = createAsyncThunk(
  'myVault/updateMyVaultPassword',
  async ({ passwordId, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/my-vault/passwords/${passwordId}`, data);
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update password'
      );
    }
  }
);

export const deleteMyVaultPassword = createAsyncThunk(
  'myVault/deleteMyVaultPassword',
  async (passwordId, { rejectWithValue }) => {
    try {
      await api.delete(`/my-vault/passwords/${passwordId}`);
      return passwordId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete password'
      );
    }
  }
);

const removeEntrySubtree = (passwords, id) => {
  const idsToRemove = new Set([id]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const password of passwords) {
      if (
        !idsToRemove.has(password.id) &&
        password.parentId &&
        idsToRemove.has(password.parentId)
      ) {
        idsToRemove.add(password.id);
        changed = true;
      }
    }
  }

  return passwords.filter((password) => !idsToRemove.has(password.id));
};

const myVaultSlice = createSlice({
  name: 'myVault',

  initialState: {
    vault: null,
    folders: [],
    passwords: [],
    selectedFolderId: null,
    loading: false,
    actionLoading: false,
    error: null,
  },

  reducers: {
    setSelectedFolderId: (state, action) => {
      state.selectedFolderId = action.payload;
    },

    clearMyVaultError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMyVault.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchMyVault.fulfilled, (state, action) => {
        state.loading = false;
        state.vault = action.payload;
        state.folders = action.payload.folders || [];
        state.passwords = action.payload.passwords || [];
      })

      .addCase(fetchMyVault.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createMyVaultFolder.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(createMyVaultFolder.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.folders.push(action.payload);
      })

      .addCase(createMyVaultFolder.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(updateMyVaultFolder.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(updateMyVaultFolder.fulfilled, (state, action) => {
        state.actionLoading = false;

        state.folders = state.folders.map((folder) =>
          folder.id === action.payload.id ? action.payload : folder
        );
      })

      .addCase(updateMyVaultFolder.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(deleteMyVaultFolder.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(deleteMyVaultFolder.fulfilled, (state, action) => {
        state.actionLoading = false;

        state.folders = state.folders.filter(
          (folder) => folder.id !== action.payload
        );

        state.passwords = state.passwords.filter(
          (password) => password.folderId !== action.payload
        );

        if (state.selectedFolderId === action.payload) {
          state.selectedFolderId = null;
        }
      })

      .addCase(deleteMyVaultFolder.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(createMyVaultPassword.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(createMyVaultPassword.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.passwords.unshift(action.payload);
      })

      .addCase(createMyVaultPassword.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(updateMyVaultPassword.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(updateMyVaultPassword.fulfilled, (state, action) => {
        state.actionLoading = false;

        state.passwords = state.passwords.map((password) =>
          password.id === action.payload.id ? action.payload : password
        );
      })

      .addCase(updateMyVaultPassword.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(deleteMyVaultPassword.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(deleteMyVaultPassword.fulfilled, (state, action) => {
        state.actionLoading = false;

        state.passwords = removeEntrySubtree(state.passwords, action.payload);
      })

      .addCase(deleteMyVaultPassword.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedFolderId, clearMyVaultError } = myVaultSlice.actions;

export default myVaultSlice.reducer;