import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import vaultReducer from '../features/vault/vaultSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vault: vaultReducer,
    dashboard: dashboardReducer,
  },
});