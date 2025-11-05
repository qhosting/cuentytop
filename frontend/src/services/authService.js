import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 429) {
      console.warn('Demasiadas solicitudes, intenta más tarde');
    }

    return Promise.reject(error);
  }
);

class AuthService {
  // Solicitar código de verificación
  async requestCode({ telefono }) {
    try {
      const response = await api.post('/auth/user/phone/request-code', {
        telefono,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Verificar código
  async verifyCode({ telefono, codigo, nombre, email }) {
    try {
      const response = await api.post('/auth/user/phone/verify-code', {
        telefono,
        codigo,
        nombre,
        email,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Obtener perfil del usuario
  async getProfile() {
    try {
      const response = await api.get('/auth/user/profile');
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Actualizar perfil
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/user/profile', profileData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      await api.post('/auth/user/logout');
      localStorage.removeItem('token');
    } catch (error) {
      // Asegurar que se limpie el token local incluso si falla la llamada
      localStorage.removeItem('token');
      throw error;
    }
  }

  // Verificar token
  async verifyToken() {
    try {
      const response = await api.get('/auth/user/verify-token');
      return response;
    } catch (error) {
      localStorage.removeItem('token');
      throw error;
    }
  }

  // Reenviar código
  async resendCode({ telefono }) {
    try {
      const response = await api.post('/auth/user/phone/resend-code', {
        telefono,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Login de administrador
  async adminLogin({ username, password }) {
    try {
      const response = await api.post('/auth/admin/login', {
        username,
        password,
      });
      
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Verificar token de administrador
  async verifyAdminToken() {
    try {
      const response = await api.get('/auth/admin/verify-admin');
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Obtener estado de salud del servidor
  async healthCheck() {
    try {
      const response = await axios.get('http://localhost:3000/health', {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Obtener información de la API
  async getApiInfo() {
    try {
      const response = await axios.get('http://localhost:3000/', {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Formatear número de teléfono
  formatPhoneNumber(phone) {
    // Remover todos los caracteres no numéricos excepto +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Si no empieza con + y es un número mexicano, agregar +52
    if (!cleaned.startsWith('+') && cleaned.length === 10) {
      cleaned = '+52' + cleaned;
    }
    
    return cleaned;
  }

  // Validar formato de teléfono
  validatePhoneNumber(phone) {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  // Obtener token desde localStorage
  getToken() {
    return localStorage.getItem('token');
  }

  // Verificar si está autenticado
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Decodificar JWT para verificar expiración
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      return payload.exp > now;
    } catch (error) {
      return false;
    }
  }

  // Obtener información del usuario desde el token
  getUserFromToken() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.userId,
        telefono: payload.telefono,
        tipo: payload.tipo,
        exp: payload.exp,
      };
    } catch (error) {
      return null;
    }
  }
}

export default new AuthService();