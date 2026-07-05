import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider, useDispatch } from 'react-redux';

// Store de Redux
import { store } from './store/store';

// Componentes de autenticación
import { useAuth, checkAuth as checkAuthThunk } from './store/authSlice';

// Páginas principales
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';

// Layout components
import Navbar from './components/Navbar';
import Footer from './components/Footel';

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1', // Indigo
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#ec4899', // Pink/Rose
      light: '#f472b6',
      dark: '#db2777',
    },
    background: {
      default: '#080b11', // Deep Space Blue
      paper: '#111622', // Dark Card
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Outfit", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontSize: '2.8rem',
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontSize: '2.2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontSize: '1.8rem',
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h4: {
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontSize: '1.4rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontSize: '1.2rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#d1d5db',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#9ca3af',
    },
    button: {
      fontFamily: '"Outfit", "Inter", sans-serif',
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#080b11',
          backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15) 0%, rgba(8, 11, 17, 0) 50%)',
          backgroundAttachment: 'fixed',
          scrollbarColor: '#374151 #111827',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#080b11',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#374151',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#4b5563',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontWeight: 600,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            boxShadow: '0 6px 20px 0 rgba(99, 102, 241, 0.5)',
            transform: 'translateY(-1px)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
          boxShadow: '0 4px 14px 0 rgba(236, 72, 153, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
            boxShadow: '0 6px 20px 0 rgba(236, 72, 153, 0.5)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.12)',
          color: '#f3f4f6',
          '&:hover': {
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(17, 22, 34, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
          borderRadius: 16,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            borderColor: 'rgba(99, 102, 241, 0.25)',
            boxShadow: '0 12px 40px 0 rgba(99, 102, 241, 0.15)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            transition: 'all 0.2s',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.08)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366f1',
              borderWidth: '1.5px',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'rgba(17, 22, 34, 0.85)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
        },
      },
    },
  },
});

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Componente para rutas de administrador
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }

  return isAuthenticated && user?.tipo === 'admin' ? children : <Navigate to="/" replace />;
};

const AppContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Verificar autenticación al cargar la app (solo una vez)
    dispatch(checkAuthThunk());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="app">
          <Navbar />
          <main style={{ minHeight: 'calc(100vh - 140px)', paddingTop: '80px' }}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Rutas protegidas */}
              <Route path="/carrito" element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              } />
              <Route path="/ordenes" element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              } />
              <Route path="/perfil" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              
              {/* Rutas de administrador */}
              <Route path="/admin/*" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              {/* Ruta por defecto */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;