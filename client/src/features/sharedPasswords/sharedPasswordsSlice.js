import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchSharedWithMe = createAsyncThunk(
  'sharedPasswords/fetchSharedWithMe',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/password-shares/shared-with-me');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to load shared passwords'
      );
    }
  }
);

export const sharePasswordToUser = createAsyncThunk(
  'sharedPasswords/sharePasswordToUser',
  async ({ passwordId, userId }, thunkAPI) => {
    try {
      const response = await api.post(`/password-shares/${passwordId}/share`, {
        userId,
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to share password'
      );
    }
  }
);

export const removePasswordShare = createAsyncThunk(
  'sharedPasswords/removePasswordShare',
  async (shareId, thunkAPI) => {
    try {
      await api.delete(`/password-shares/${shareId}`);
      return shareId;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to remove share'
      );
    }
  }
);

const sharedPasswordsSlice = createSlice({
  name: 'sharedPasswords',

  initialState: {
    sharedWithMe: [],
    loading: false,
    error: null,

    sharing: false,
    shareError: null,

    removing: false,
    removeError: null,
  },

  reducers: {
    clearShareError: (state) => {
      state.shareError = null;
      state.removeError = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchSharedWithMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchSharedWithMe.fulfilled, (state, action) => {
        state.loading = false;
        state.sharedWithMe = action.payload;
      })

      .addCase(fetchSharedWithMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(sharePasswordToUser.pending, (state) => {
        state.sharing = true;
        state.shareError = null;
      })

      .addCase(sharePasswordToUser.fulfilled, (state) => {
        state.sharing = false;
      })

      .addCase(sharePasswordToUser.rejected, (state, action) => {
        state.sharing = false;
        state.shareError = action.payload;
      })

      .addCase(removePasswordShare.pending, (state) => {
        state.removing = true;
        state.removeError = null;
      })

      .addCase(removePasswordShare.fulfilled, (state, action) => {
        state.removing = false;

        state.sharedWithMe = state.sharedWithMe.filter(
          (item) => item.id !== action.payload
        );
      })

      .addCase(removePasswordShare.rejected, (state, action) => {
        state.removing = false;
        state.removeError = action.payload;
      });
  },
});

export const { clearShareError } = sharedPasswordsSlice.actions;

export default sharedPasswordsSlice.reducer;