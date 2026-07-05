import React, { useState } from 'react';
import { Container, Card, CardContent, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { requestCode, verifyCode } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

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
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom align="center">
            Iniciar Sesión
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph align="center">
            Ingresa tu número de teléfono para recibir un código de acceso por WhatsApp / SMS
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

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
                <Button fullWidth variant="contained" type="submit" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Solicitar Código'}
                </Button>
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Código de Verificación"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="ej: 1234"
                  required
                  sx={{ mb: 3 }}
                />
                <Button fullWidth variant="contained" type="submit" disabled={isLoading}>
                  {isLoading ? 'Verificando...' : 'Verificar y Entrar'}
                </Button>
                <Button fullWidth variant="text" onClick={() => setStep(1)} sx={{ mt: 2 }}>
                  Regresar
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;
