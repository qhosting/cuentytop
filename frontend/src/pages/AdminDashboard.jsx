import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ p: 5, border: '1px dashed grey', borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Panel de Administración
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Esta página se encuentra actualmente en desarrollo. Aquí los administradores podrán gestionar los servicios, planes y usuarios del sistema.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Volver al Inicio
        </Button>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
