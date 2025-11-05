import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService';

// Estado inicial
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
  message: null,
};

// Acciones asíncronas

// Verificar código y hacer login
export const verifyCode = createAsyncThunk(
  'auth/verifyCode',
  async ({ telefono, codigo, nombre, email }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyCode({
        telefono,
        codigo,
        nombre,
        email,
      });
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.mensaje || 'Error al verificar código'
      );
    }
  }
);

// Solicitar código
export const requestCode = createAsyncThunk(
  'auth/requestCode',
  async ({ telefono }, { rejectWithValue }) => {
    try {
      const response = await authService.requestCode({ telefono });
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.mensaje || 'Error al solicitar código'
      );
    }
  }
);

// Obtener perfil
export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response.usuario;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.mensaje || 'Error al obtener perfil'
      );
    }
  }
);

// Actualizar perfil
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(profileData);
      return response.usuario;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.mensaje || 'Error al actualizar perfil'
      );
    }
  }
);

// Cerrar sesión
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      return true;
    } catch (error) {
      return rejectWithValue('Error al cerrar sesión');
    }
  }
);

// Verificar token
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await authService.getProfile();
      return {
        user: response.usuario,
        token,
      };
    } catch (error) {
      localStorage.removeItem('token');
      return rejectWithValue('Token inválido');
    }
  }
);

// Slice de autenticación
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Solicitar código
      .addCase(requestCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestCode.fulfilled, (state, action) => {
        state.isLoading = false;
        state.message = action.payload.mensaje;
      })
      .addCase(requestCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Verificar código
      .addCase(verifyCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyCode.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.usuario;
        state.token = action.payload.token;
        state.message = action.payload.mensaje;
        
        // Guardar token en localStorage
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(verifyCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Obtener perfil
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Actualizar perfil
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.message = 'Perfil actualizado exitosamente';
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Cerrar sesión
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.message = 'Sesión cerrada exitosamente';
        
        // Remover token de localStorage
        localStorage.removeItem('token');
      })
      .addCase(logout.rejected, (state) => {
        state.isLoading = false;
        // Limpiar estado aunque haya error
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      })
      
      // Verificar autenticación
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
      });
  },
});

export const { clearError, clearMessage, setLoading } = authSlice.actions;

// Hook personalizado para usar el slice
export const useAuth = () => {
  const state = useSelector((state) => state.auth);
  return {
    ...state,
    clearError: () => dispatch(clearError()),
    clearMessage: () => dispatch(clearMessage()),
    setLoading: (loading) => dispatch(setLoading(loading)),
  };
};

export default authSlice.reducer;