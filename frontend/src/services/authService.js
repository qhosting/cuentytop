import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/v1';

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
  // Solicitar código de verificación (Adaptado a Microservicio Auth)
  // Nota: El microservicio espera autenticación para /2fa/send.
  // Si este flujo es para login/registro inicial, el backend debe soportarlo públicamente.
  async requestCode({ telefono }) {
    try {
      const response = await api.post('/auth/2fa/send', {
        phone: telefono, // Adaptado de telefono a phone
        method: 'whatsapp' // Default a whatsapp
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Verificar código (Adaptado a Microservicio Auth)
  async verifyCode({ telefono, codigo, nombre, email }) {
    try {
      // Nota: El microservicio auth tiene /register y /login separados.
      // Este endpoint /2fa/verify es para verificar un código después de login.
      // Para mantener compatibilidad, llamamos a verify
      const response = await api.post('/auth/2fa/verify', {
        code: codigo,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Registro (Nuevo endpoint para microservicio)
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Login (Nuevo endpoint para microservicio)
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Obtener perfil del usuario
  async getProfile() {
    try {
      const response = await api.get('/auth/me'); // Cambiado de /auth/user/profile a /auth/me
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Actualizar perfil
  async updateProfile(profileData) {
    try {
      // El microservicio actual no tiene endpoint explícito de update profile documentado en el server.js visible,
      // pero mantenemos la llamada por si se implementa o usa otro endpoint.
      // Por ahora apuntamos al mismo endpoint de perfil o uno genérico si existiera.
      // Asumiendo que podría ser PUT /auth/me si existiera.
      const response = await api.put('/auth/me', profileData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      await api.post('/auth/logout'); // Cambiado de /auth/user/logout
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
      const response = await api.post('/auth/2fa/send', {
        phone: telefono,
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