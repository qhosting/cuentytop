import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth, logout } from '../store/authSlice';
import { useDispatch } from 'react-redux';
import { TvOutlined } from '@mui/icons-material';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    color: isActive(path) ? '#6366f1' : '#9ca3af',
    fontWeight: isActive(path) ? 700 : 500,
    fontSize: '0.9rem',
    position: 'relative',
    transition: 'color 0.25s',
    '&:hover': {
      color: '#f3f4f6',
      backgroundColor: 'transparent',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 2,
      left: 8,
      right: 8,
      height: '2px',
      backgroundColor: '#6366f1',
      transform: isActive(path) ? 'scaleX(1)' : 'scaleX(0)',
      transformOrigin: 'left',
      transition: 'transform 0.25s ease-out',
    },
    '&:hover::after': {
      transform: 'scaleX(1)',
    }
  });

  return (
    <AppBar 
      position="fixed" 
      sx={{
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 'lg',
        borderRadius: '16px',
        background: 'rgba(17, 22, 34, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
          {/* Logo / Brand */}
          <Box 
            onClick={() => navigate('/')} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover .logo-icon': {
                transform: 'rotate(-10deg) scale(1.1)',
                color: '#ec4899',
              }
            }}
          >
            <TvOutlined 
              className="logo-icon"
              sx={{ 
                fontSize: '2rem', 
                color: '#6366f1',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #f3f4f6 0%, #9ca3af 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              Cuenty
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button disableRipple sx={linkStyle('/')} component={Link} to="/">Inicio</Button>
            {isAuthenticated ? (
              <>
                <Button disableRipple sx={linkStyle('/carrito')} component={Link} to="/carrito">Carrito</Button>
                <Button disableRipple sx={linkStyle('/ordenes')} component={Link} to="/ordenes">Mis Órdenes</Button>
                <Button disableRipple sx={linkStyle('/perfil')} component={Link} to="/perfil">Perfil</Button>
                {user?.tipo === 'admin' && (
                  <Button disableRipple sx={linkStyle('/admin')} component={Link} to="/admin">Admin</Button>
                )}
                <Button 
                  color="secondary" 
                  variant="contained" 
                  onClick={handleLogout}
                  sx={{ 
                    ml: 1,
                    fontSize: '0.85rem',
                    py: '6px',
                    px: '18px',
                    borderRadius: '10px',
                  }}
                >
                  Salir
                </Button>
              </>
            ) : (
              <Button 
                variant="outlined" 
                component={Link} 
                to="/login"
                sx={{ 
                  ml: 1,
                  fontSize: '0.85rem',
                  py: '6px',
                  px: '18px',
                  borderRadius: '10px',
                }}
              >
                Entrar
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
