import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchSecurityDashboard = createAsyncThunk(
  'dashboard/fetchSecurityDashboard',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const response = await api.get('/dashboard/security', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch dashboard'
      );
    }
  }
);

const initialState = {
  totalPasswords: 0,
  weakPasswords: 0,
  oldPasswords: 0,
  riskPasswords: 0,
  recentPasswords: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSecurityDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSecurityDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.totalPasswords = action.payload.totalPasswords;
        state.weakPasswords = action.payload.weakPasswords;
        state.oldPasswords = action.payload.oldPasswords;
        state.riskPasswords = action.payload.riskPasswords;
        state.recentPasswords = action.payload.recentPasswords;
      })
      .addCase(fetchSecurityDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default dashboardSlice.reducer;