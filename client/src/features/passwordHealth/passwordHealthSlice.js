import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchPasswordHealth = createAsyncThunk(
  'passwordHealth/fetchPasswordHealth',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;
      const response = await api.get('/password-health', {
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

const initialState = {
  total: 0,
  securityScore: 100,
  weakCount: 0,
  oldCount: 0,
  atRiskCount: 0,
  sensitiveCount: 0,
  strengthDistribution: { weak: 0, medium: 0, strong: 0, unknown: 0 },
  ageDistribution: { fresh: 0, months3: 0, months6: 0, over6m: 0 },
  weakPasswords: [],
  oldPasswords: [],
  atRiskPasswords: [],
  recommendations: [],
  loading: false,
  error: null,
};

const passwordHealthSlice = createSlice({
  name: 'passwordHealth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPasswordHealth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPasswordHealth.fulfilled, (state, action) => {
        state.loading = false;
        state.total = action.payload.total || 0;
        state.securityScore = action.payload.securityScore ?? 100;
        state.weakCount = action.payload.weakCount || 0;
        state.oldCount = action.payload.oldCount || 0;
        state.atRiskCount = action.payload.atRiskCount || 0;
        state.sensitiveCount = action.payload.sensitiveCount || 0;
        state.strengthDistribution = action.payload.strengthDistribution || initialState.strengthDistribution;
        state.ageDistribution = action.payload.ageDistribution || initialState.ageDistribution;
        state.weakPasswords = action.payload.weakPasswords || [];
        state.oldPasswords = action.payload.oldPasswords || [];
        state.atRiskPasswords = action.payload.atRiskPasswords || [];
        state.recommendations = action.payload.recommendations || [];
      })
      .addCase(fetchPasswordHealth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default passwordHealthSlice.reducer;
