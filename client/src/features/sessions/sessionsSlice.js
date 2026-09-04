import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchActiveSessions = createAsyncThunk(
  'sessions/fetchActiveSessions',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;
      const response = await api.get('/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch sessions'
      );
    }
  }
);

export const revokeSession = createAsyncThunk(
  'sessions/revokeSession',
  async (sessionId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;
      await api.delete(`/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return sessionId;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to revoke session'
      );
    }
  }
);

export const revokeAllSessions = createAsyncThunk(
  'sessions/revokeAllSessions',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;
      await api.delete('/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to revoke all sessions'
      );
    }
  }
);

const initialState = {
  sessions: [],
  loading: false,
  error: null,
};

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload.sessions || [];
      })
      .addCase(fetchActiveSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(revokeSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      })
      .addCase(revokeAllSessions.fulfilled, (state) => {
        state.sessions = state.sessions.filter((s) => s.isCurrent);
      });
  },
});

export default sessionsSlice.reducer;
