import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchSecuritySummary = createAsyncThunk(
  'dashboard/fetchSecuritySummary',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const response = await api.get('/dashboard/security-summary', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch security summary'
      );
    }
  }
);

export const fetchPasswordActivity = createAsyncThunk(
  'dashboard/fetchPasswordActivity',
  async (range = '6M', thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const response = await api.get(
        `/dashboard/password-activity?range=${range}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch password activity'
      );
    }
  }
);

export const fetchRecentPasswords = createAsyncThunk(
  'dashboard/fetchRecentPasswords',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const response = await api.get('/dashboard/recent-passwords', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch recent passwords'
      );
    }
  }
);

export const fetchPasswordHealth = createAsyncThunk(
  'dashboard/fetchPasswordHealth',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const response = await api.get('/dashboard/password-health', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch password health'
      );
    }
  }
);

export const fetchVaultPasswordCounts = createAsyncThunk(
  'dashboard/fetchVaultPasswordCounts',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const response = await api.get('/dashboard/vault-counts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vault counts'
      );
    }
  }
);

export const fetchRecentActivity = createAsyncThunk(
  'dashboard/fetchRecentActivity',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const response = await api.get('/dashboard/recent-activity', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch recent activity'
      );
    }
  }
);

const initialState = {
  totalPasswords: 0,
  weakPasswords: 0,
  oldPasswords: 0,
  riskPasswords: 0,
  securityScore: 100,

  passwordTrend: [],
  recentPasswords: [],
  passwordHealth: [],
  vaultPasswordCounts: [],
  recentActivity: [],

  summaryLoading: false,
  activityLoading: false,
  recentLoading: false,
  healthLoading: false,
  vaultCountsLoading: false,
  recentActivityLoading: false,

  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSecuritySummary.pending, (state) => {
        state.summaryLoading = true;
        state.error = null;
      })
      .addCase(fetchSecuritySummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.totalPasswords = action.payload.totalPasswords || 0;
        state.weakPasswords = action.payload.weakPasswords || 0;
        state.oldPasswords = action.payload.oldPasswords || 0;
        state.riskPasswords = action.payload.riskPasswords || 0;
        state.securityScore = action.payload.securityScore ?? 100;
      })
      .addCase(fetchSecuritySummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchPasswordActivity.pending, (state) => {
        state.activityLoading = true;
        state.error = null;
      })
      .addCase(fetchPasswordActivity.fulfilled, (state, action) => {
        state.activityLoading = false;
        state.passwordTrend = action.payload.passwordTrend || [];
      })
      .addCase(fetchPasswordActivity.rejected, (state, action) => {
        state.activityLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchRecentPasswords.pending, (state) => {
        state.recentLoading = true;
        state.error = null;
      })
      .addCase(fetchRecentPasswords.fulfilled, (state, action) => {
        state.recentLoading = false;
        state.recentPasswords = action.payload.recentPasswords || [];
      })
      .addCase(fetchRecentPasswords.rejected, (state, action) => {
        state.recentLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchPasswordHealth.pending, (state) => {
        state.healthLoading = true;
        state.error = null;
      })
      .addCase(fetchPasswordHealth.fulfilled, (state, action) => {
        state.healthLoading = false;
        state.passwordHealth = action.payload.passwordHealth || [];
      })
      .addCase(fetchPasswordHealth.rejected, (state, action) => {
        state.healthLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchVaultPasswordCounts.pending, (state) => {
        state.vaultCountsLoading = true;
        state.error = null;
      })
      .addCase(fetchVaultPasswordCounts.fulfilled, (state, action) => {
        state.vaultCountsLoading = false;
        state.vaultPasswordCounts = action.payload.vaultPasswordCounts || [];
      })
      .addCase(fetchVaultPasswordCounts.rejected, (state, action) => {
        state.vaultCountsLoading = false;
        state.error = action.payload;
      })

      .addCase(fetchRecentActivity.pending, (state) => {
        state.recentActivityLoading = true;
        state.error = null;
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.recentActivityLoading = false;
        state.recentActivity = action.payload.recentActivity || [];
      })
      .addCase(fetchRecentActivity.rejected, (state, action) => {
        state.recentActivityLoading = false;
        state.error = action.payload;
      });
  },
});

export default dashboardSlice.reducer;