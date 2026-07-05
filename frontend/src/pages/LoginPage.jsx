import React, { useState } from 'react';
import { Container, Card, CardContent, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { requestCode, verifyCode } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { WhatsApp } from '@mui/icons-material';

const LoginPage = () => {
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [step, setStep] = useState(1); // 1 = Solicitar código, 2 = Verificar código
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, message } = useSelector((state) => state.auth);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!telefono) return;
    try {
      await dispatch(requestCode({ telefono })).unwrap();
      setStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!codigo) return;
    try {
      await dispatch(verifyCode({ telefono, codigo })).unwrap();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
      {/* Orbes de luz en el fondo */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: '20%', 
          left: '20%', 
          width: '400px', 
          height: '400px', 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)',
          filter: 'blur(70px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} 
      />
      <Box 
        sx={{ 
          position: 'absolute', 
          bottom: '20%', 
          right: '20%', 
          width: '350px', 
          height: '350px', 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, rgba(236, 72, 153, 0) 70%)',
          filter: 'blur(70px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} 
      />

      <Container maxWidth="xs" sx={{ py: 4 }}>
        <Card 
          sx={{ 
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(17, 22, 34, 0.7)',
            backdropFilter: 'blur(20px)',
            borderRadius: 5,
            p: 1.5
          }}
        >
          <CardContent sx={{ px: 3, py: 4 }}>
            {/* Header / Logo Icon */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3.5 }}>
              <Box 
                sx={{ 
                  display: 'inline-flex', 
                  p: 2, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.15)'
                }}
              >
                <WhatsApp sx={{ fontSize: '2.5rem', color: '#25D366' }} />
              </Box>
            </Box>

            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom 
              align="center"
              sx={{ 
                fontSize: '2rem', 
                fontWeight: 800, 
                fontFamily: '"Outfit", sans-serif',
                mb: 1.5,
                background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Acceso Rápido
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph align="center" sx={{ mb: 4, lineHeight: 1.5 }}>
              Ingresa tu número de WhatsApp para recibir un código de seguridad e iniciar sesión al instante.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
            {message && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{message}</Alert>}

            <Box component="form" onSubmit={step === 1 ? handleRequestCode : handleVerifyCode}>
              {step === 1 ? (
                <>
                  <TextField
                    fullWidth
                    label="Número de Teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="ej: +521234567890"
                    required
                    sx={{ mb: 3 }}
                  />
                  <Button 
                    fullWidth 
                    variant="contained" 
                    type="submit" 
                    disabled={isLoading}
                    sx={{ py: 1.5 }}
                  >
                    {isLoading ? 'Enviando...' : 'Recibir Código'}
                  </Button>
                </>
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="Código de Seguridad"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="ej: 1234"
                    required
                    sx={{ mb: 3 }}
                  />
                  <Button 
                    fullWidth 
                    variant="contained" 
                    type="submit" 
                    disabled={isLoading}
                    sx={{ py: 1.5 }}
                  >
                    {isLoading ? 'Verificando...' : 'Verificar y Entrar'}
                  </Button>
                  <Button 
                    fullWidth 
                    variant="text" 
                    onClick={() => setStep(1)} 
                    sx={{ mt: 2, color: 'text.secondary' }}
                  >
                    Cambiar número de teléfono
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage;
