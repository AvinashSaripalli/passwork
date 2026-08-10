import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import vaultReducer from '../features/vault/vaultSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import myVaultReducer from '../features/myVault/myVaultSlice';
import sharedPasswordsReducer from '../features/sharedPasswords/sharedPasswordsSlice';
import themeReducer from '../features/theme/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vault: vaultReducer,
    dashboard: dashboardReducer,
    myVault: myVaultReducer,
    sharedPasswords: sharedPasswordsReducer,
    theme: themeReducer,
  },
});