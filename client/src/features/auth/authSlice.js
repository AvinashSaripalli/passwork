import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
import {
  encryptText,
  decryptText,
  encryptFields,
  decryptFields,
  createMasterPasswordVerifier,
  MASTER_VERIFIER_STORAGE_KEY,
  generateKeyPair,
  encryptPrivateKey,
  reWrapItemKey,
  rsaDecrypt,
  rsaEncrypt,
  isEncryptedFormat,
} from '../../utils/crypto';
import {
  clearSecureSession,
  setMasterPassword as storeMasterPassword,
  setAdminMasterPassword as storeAdminMasterPassword,
  setMasterVerifiedFlag,
  isMasterVerified as getSecureMasterVerified,
  setRsaPrivateKey as storeRsaPrivateKey,
  setRsaPublicKey as storeRsaPublicKeyPersist,
  setSessionMasterPassword as storeSessionMasterPassword,
  getRsaPrivateKey as loadRsaPrivateKey,
  getRsaPublicKey as loadRsaPublicKey,
  getSessionMasterPassword as loadSessionMasterPassword,
} from '../../utils/secureSession';

const saveVerifier = (verifier) => {
  if (verifier) {
    sessionStorage.setItem(MASTER_VERIFIER_STORAGE_KEY, verifier);
  } else {
    sessionStorage.removeItem(MASTER_VERIFIER_STORAGE_KEY);
  }
};

const getSavedToken = () => localStorage.getItem('token');
const getSavedUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const purgeSecureSession = () => {
  clearSecureSession();
  saveVerifier(null);
};
const saveUser = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (formData, thunkAPI) => {
    try {
      const response = await api.post('/auth/register', formData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Registration failed'
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (formData, thunkAPI) => {
    try {
      const response = await api.post('/auth/login', formData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.token || getSavedToken();

    const response = await api.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || 'Failed to fetch user'
    );
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (formData, thunkAPI) => {
    try {
      const response = await api.put('/auth/me', formData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to update profile'
      );
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (formData, thunkAPI) => {
    try {
      const response = await api.put('/auth/change-password', formData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to change password'
      );
    }
  }
);

export const fetchKeyPair = createAsyncThunk(
  'auth/fetchKeyPair',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/keypair');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to fetch key pair'
      );
    }
  }
);

export const changeMasterPassword = createAsyncThunk(
  'auth/changeMasterPassword',
  async ({ currentMasterPassword, newMasterPassword, hint }, thunkAPI) => {
    try {
      const { auth } = thunkAPI.getState();
      const salt = auth.user.encryptionSalt;
      const userId = auth.user.id;
      const oldPrivateKey = thunkAPI.getState().auth.sessionRsaPrivateKey;

      const ownedRes = await api.get('/passwords/owned');
      const ownedPasswords = ownedRes.data;

      const reencrypted = [];
      for (const pw of ownedPasswords) {
        // Items encrypted with per-item AES keys (wrapped-keys scheme) are
        // not derived from the master password — skip them; their wrapped
        // keys are re-wrapped separately below.
        if (!pw.encryptedPassword || isEncryptedFormat(pw.encryptedPassword)) {
          continue;
        }

        let decrypted;
        try {
          decrypted = await decryptText(
            pw.encryptedPassword,
            currentMasterPassword,
            salt
          );
        } catch {
          // Not decryptable with the current master password — leave as-is.
          continue;
        }

        const newEncrypted = await encryptText(decrypted, newMasterPassword, salt);

        const update = { id: pw.id, encryptedPassword: newEncrypted };

        if (pw.encryptedNote && isEncryptedFormat(pw.encryptedNote)) {
          try {
            const decryptedNote = await decryptText(
              pw.encryptedNote,
              currentMasterPassword,
              salt
            );
            update.encryptedNote = await encryptText(
              decryptedNote,
              newMasterPassword,
              salt
            );
          } catch {
            // skip note that cannot be decrypted
          }
        }

        if (pw.encryptedFields) {
          const decryptedFields = await decryptFields(
            pw.encryptedFields,
            currentMasterPassword,
            salt
          );
          if (decryptedFields) {
            update.encryptedFields = await encryptFields(
              decryptedFields,
              newMasterPassword,
              salt
            );
          }
        }

        reencrypted.push(update);
      }

      if (reencrypted.length > 0) {
        await api.post('/auth/reencrypt-passwords', { passwords: reencrypted });
      }

      const response = await api.put('/auth/change-master-password', {
        currentMasterPassword,
        newMasterPassword,
        hint,
      });

      const newKeyPair = await generateKeyPair();
      const newEncryptedPrivateKey = await encryptPrivateKey(
        newKeyPair.privateKeyJwk,
        newMasterPassword,
        salt
      );

      await api.post('/keypair', {
        encryptedPrivateKey: newEncryptedPrivateKey,
        publicKey: newKeyPair.publicKeyJwk,
        salt,
      });

      storeRsaPrivateKey(newKeyPair.privateKeyJwk);

      thunkAPI.dispatch(setSessionRsaPublicKey(newKeyPair.publicKeyJwk));

      if (oldPrivateKey) {
        const wrappedKeysRes = await api.get('/keypair/me/wrapped-keys');
        const wrappedKeys = wrappedKeysRes.data;

        if (wrappedKeys.length > 0) {
          const reWrappedKeys = [];
          for (const item of wrappedKeys) {
            if (!item.encryptedItemKey) continue;
            try {
              const newEncryptedItemKey = await reWrapItemKey(
                item.encryptedItemKey,
                oldPrivateKey,
                newKeyPair.publicKeyJwk
              );
              reWrappedKeys.push({
                shareId: item.id,
                encryptedItemKey: newEncryptedItemKey,
              });
            } catch {
              // skip items that fail to re-wrap
            }
          }

          if (reWrappedKeys.length > 0) {
            await api.post('/keypair/me/re-wrap', { wrappedKeys: reWrappedKeys });
          }
        }

        try {
          const vaultKeysRes = await api.get('/keypair/me/all-vault-wrapped-keys');
          const vaultKeys = vaultKeysRes.data;

          const reWrappedFolders = [];
          for (const item of vaultKeys.folders || []) {
            try {
              const aesKeyJson = await rsaDecrypt(item.wrappedKey, oldPrivateKey);
              const newWrappedKey = await rsaEncrypt(aesKeyJson, newKeyPair.publicKeyJwk);
              reWrappedFolders.push({
                id: item.id,
                wrappedKeys: { [userId]: newWrappedKey },
              });
            } catch {
              // skip
            }
          }

          const reWrappedPasswords = [];
          for (const item of vaultKeys.passwords || []) {
            try {
              const aesKeyJson = await rsaDecrypt(item.wrappedKey, oldPrivateKey);
              const newWrappedKey = await rsaEncrypt(aesKeyJson, newKeyPair.publicKeyJwk);
              reWrappedPasswords.push({
                id: item.id,
                wrappedKeys: { [userId]: newWrappedKey },
              });
            } catch {
              // skip
            }
          }

          if (reWrappedFolders.length > 0 || reWrappedPasswords.length > 0) {
            await api.post('/keypair/me/re-wrap-vault-keys', {
              folders: reWrappedFolders,
              passwords: reWrappedPasswords,
            });
          }
        } catch {
          // vault key re-wrap is best-effort
        }
      }

      saveVerifier(await createMasterPasswordVerifier(newMasterPassword, salt));
      thunkAPI.dispatch(setSessionMasterPassword(newMasterPassword));

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to change master password'
      );
    }
  }
);

export const setMasterPassword = createAsyncThunk(
  'auth/setMasterPassword',
  async (formData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token || getSavedToken();
      const salt = thunkAPI.getState().auth.user?.encryptionSalt;

      const response = await api.post('/auth/set-master-password', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();
      const encryptedPrivKey = await encryptPrivateKey(
        privateKeyJwk,
        formData.masterPassword,
        salt
      );

      await api.post(
        '/keypair',
        {
          encryptedPrivateKey: encryptedPrivKey,
          publicKey: publicKeyJwk,
          salt,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      storeRsaPrivateKey(privateKeyJwk);

      return {
        ...response.data,
        hint: formData.hint || '',
        masterPassword: formData.masterPassword,
        publicKeyJwk,
        privateKeyJwk,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Failed to set master password'
      );
    }
  }
);

const savedToken = getSavedToken();
const savedUser = getSavedUser();

const initialState = {
  token: savedToken,
  user: savedUser,
  isAuthenticated: !!savedToken,
  loading: false,
  error: null,
  isMasterVerified: !!savedToken && getSecureMasterVerified(),
  sessionMasterPassword: loadSessionMasterPassword(),
  sessionAdminMasterPassword: null,
  sessionRsaPrivateKey: loadRsaPrivateKey(),
  sessionRsaPublicKey: loadRsaPublicKey(),
  sessionWarningOpen: false,
  sessionWarningSeconds: 0,
  userLoaded: !savedToken,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setMasterVerified: (state, action) => {
      state.isMasterVerified = action.payload;
      setMasterVerifiedFlag(action.payload);
    },

    setSessionMasterPassword: (state, action) => {
      state.sessionMasterPassword = action.payload || null;
      storeMasterPassword(action.payload || null);
      storeSessionMasterPassword(action.payload || null);
    },

    setSessionAdminMasterPassword: (state, action) => {
      state.sessionAdminMasterPassword = action.payload || null;
      storeAdminMasterPassword(action.payload || null);
    },

    setSessionRsaPrivateKey: (state, action) => {
      state.sessionRsaPrivateKey = action.payload || null;
      storeRsaPrivateKey(action.payload || null);
    },

    setSessionRsaPublicKey: (state, action) => {
      state.sessionRsaPublicKey = action.payload || null;
      storeRsaPublicKeyPersist(action.payload || null);
    },

    showSessionWarning: (state, action) => {
      state.sessionWarningOpen = true;
      state.sessionWarningSeconds = action.payload;
    },

    updateSessionWarningSeconds: (state, action) => {
      state.sessionWarningSeconds = action.payload;
    },

    dismissSessionWarning: (state) => {
      state.sessionWarningOpen = false;
      state.sessionWarningSeconds = 0;
    },

    lockVault: (state) => {
      state.isMasterVerified = false;
      state.sessionMasterPassword = null;
      state.sessionAdminMasterPassword = null;
      state.sessionRsaPrivateKey = null;
      state.sessionRsaPublicKey = null;
      state.sessionWarningOpen = false;
      state.sessionWarningSeconds = 0;
      clearSecureSession();
    },

    setUser: (state, action) => {
      state.user = action.payload;
      saveUser(action.payload);
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.isMasterVerified = false;
      state.sessionMasterPassword = null;
      state.sessionAdminMasterPassword = null;
      state.sessionRsaPrivateKey = null;
      state.sessionRsaPublicKey = null;
      state.userLoaded = true;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      purgeSecureSession();
    },

    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isMasterVerified = false;
        state.sessionMasterPassword = null;
        state.sessionAdminMasterPassword = null;
        state.userLoaded = true;
        localStorage.setItem('token', action.payload.token);
        saveUser(action.payload.user);
        purgeSecureSession();
      })

      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isMasterVerified = false;
        state.sessionMasterPassword = null;
        state.sessionAdminMasterPassword = null;
        state.userLoaded = true;
        localStorage.setItem('token', action.payload.token);
        saveUser(action.payload.user);
        purgeSecureSession();
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
        state.isAuthenticated = true;
        state.userLoaded = true;
        saveUser(state.user);
      })

      .addCase(fetchMe.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isMasterVerified = false;
        state.sessionMasterPassword = null;
        state.sessionAdminMasterPassword = null;
        state.userLoaded = true;

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        purgeSecureSession();
      })

      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = {
          ...state.user,
          ...action.payload.user,
        };
        saveUser(state.user);
      })

      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
      })

      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(changeMasterPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(changeMasterPassword.fulfilled, (state) => {
        state.loading = false;
      })

      .addCase(changeMasterPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(setMasterPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(setMasterPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.user = {
          ...state.user,
          masterPasswordHint: action.payload.hint,
          hasMasterPassword: true,
        };
        state.isMasterVerified = true;
        state.sessionMasterPassword = action.payload.masterPassword;
        state.sessionRsaPublicKey = action.payload.publicKeyJwk;
        state.sessionRsaPrivateKey = action.payload.privateKeyJwk;
        storeMasterPassword(action.payload.masterPassword);
        storeRsaPrivateKey(action.payload.privateKeyJwk);
        storeRsaPublicKeyPersist(action.payload.publicKeyJwk);
        storeSessionMasterPassword(action.payload.masterPassword);
        setMasterVerifiedFlag(true);
        saveUser(state.user);
      })

      .addCase(setMasterPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  logout,
  clearError,
  setMasterVerified,
  setSessionMasterPassword,
  setSessionAdminMasterPassword,
  setSessionRsaPrivateKey,
  setSessionRsaPublicKey,
  setUser,
  lockVault,
  showSessionWarning,
  updateSessionWarningSeconds,
  dismissSessionWarning,
} = authSlice.actions;
export default authSlice.reducer;