import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';

const getSavedToken = () => localStorage.getItem('token');
const getSavedUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

export const setMasterPassword = createAsyncThunk(
  'auth/setMasterPassword',
  async (formData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token || getSavedToken();

      const response = await api.post('/auth/set-master-password', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return {
        ...response.data,
        hint: formData.hint || '',
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
  isMasterVerified: sessionStorage.getItem('isMasterVerified') === 'true',
  sessionMasterPassword: sessionStorage.getItem('sessionMasterPassword'),
  userLoaded: !savedToken,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setMasterVerified: (state, action) => {
      state.isMasterVerified = action.payload;
      if (action.payload) {
        sessionStorage.setItem('isMasterVerified', 'true');
      }
    },

    setSessionMasterPassword: (state, action) => {
      state.sessionMasterPassword = action.payload;
      if (action.payload) {
        sessionStorage.setItem('sessionMasterPassword', action.payload);
      } else {
        sessionStorage.removeItem('sessionMasterPassword');
      }
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
      state.userLoaded = true;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('isMasterVerified');
      sessionStorage.removeItem('sessionMasterPassword');
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
        state.userLoaded = true;
        localStorage.setItem('token', action.payload.token);
        saveUser(action.payload.user);
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
        state.userLoaded = true;
        localStorage.setItem('token', action.payload.token);
        saveUser(action.payload.user);
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.userLoaded = true;
        saveUser(action.payload);
      })

      .addCase(fetchMe.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isMasterVerified = false;
        state.userLoaded = true;

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('isMasterVerified');
        sessionStorage.removeItem('sessionMasterPassword');
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
        saveUser(state.user);
      })

      .addCase(setMasterPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError, setMasterVerified, setSessionMasterPassword, setUser } = authSlice.actions;
export default authSlice.reducer;