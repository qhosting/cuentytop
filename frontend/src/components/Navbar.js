import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, logout } from '../store/authSlice';
import { useDispatch } from 'react-redux';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <AppBar position="fixed">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
          Cuenty Suscripciones
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button color="inherit" component={Link} to="/">Inicio</Button>
          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/carrito">Carrito</Button>
              <Button color="inherit" component={Link} to="/ordenes">Mis Órdenes</Button>
              <Button color="inherit" component={Link} to="/perfil">Perfil</Button>
              {user?.tipo === 'admin' && (
                <Button color="inherit" component={Link} to="/admin">Admin</Button>
              )}
              <Button color="secondary" variant="contained" onClick={handleLogout}>Salir</Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">Entrar</Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
