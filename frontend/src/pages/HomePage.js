import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Divider,
  IconButton,
} from '@mui/material';
import {
  AddShoppingCart,
  PlayCircleOutline,
  MusicNote,
  Tv,
  Movie,
  HelpOutline,
  Close,
  ShieldOutlined,
  FlashOnOutlined,
  SupportAgentOutlined,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../store/authSlice';
import { servicesActions } from '../store/servicesSlice';
import { cartActions } from '../store/cartSlice';

// Configuración de temas específicos por marca de streaming
const BRAND_THEMES = {
  netflix: {
    gradient: 'linear-gradient(135deg, #e50914 0%, #800c12 100%)',
    glow: 'rgba(229, 9, 20, 0.25)',
    textColor: '#ffffff'
  },
  'disney+': {
    gradient: 'linear-gradient(135deg, #0063e5 0%, #001040 100%)',
    glow: 'rgba(0, 99, 229, 0.25)',
    textColor: '#ffffff'
  },
  'hbo max': {
    gradient: 'linear-gradient(135deg, #9933ff 0%, #3d0099 100%)',
    glow: 'rgba(153, 51, 255, 0.25)',
    textColor: '#ffffff'
  },
  'amazon prime video': {
    gradient: 'linear-gradient(135deg, #1a98ff 0%, #051d33 100%)',
    glow: 'rgba(26, 152, 255, 0.25)',
    textColor: '#ffffff'
  },
  spotify: {
    gradient: 'linear-gradient(135deg, #1db954 0%, #0d5c28 100%)',
    glow: 'rgba(29, 185, 84, 0.25)',
    textColor: '#ffffff'
  }
};

const getBrandTheme = (nombre) => {
  const cleanName = nombre.toLowerCase().trim();
  return BRAND_THEMES[cleanName] || {
    gradient: 'linear-gradient(135deg, #6366f1 0%, #312e81 100%)',
    glow: 'rgba(99, 102, 241, 0.25)',
    textColor: '#ffffff'
  };
};

const ServiceCard = ({ service, onAddToCart }) => {
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [quantity, setQuantity] = useState(1);

  const brandTheme = getBrandTheme(service.nombre);

  const handleAddToCart = () => {
    if (!selectedPlan) return;

    onAddToCart({
      servicio_id: service.id,
      plan_id: selectedPlan,
      cantidad: quantity,
    });

    setPlanDialogOpen(false);
    setSelectedPlan('');
    setQuantity(1);
  };

  const getServiceIcon = (nombre) => {
    const iconProps = { sx: { fontSize: '3rem', color: '#ffffff' } };
    switch (nombre.toLowerCase().trim()) {
      case 'netflix':
      case 'amazon prime video':
        return <Tv {...iconProps} />;
      case 'disney+':
      case 'hbo max':
        return <Movie {...iconProps} />;
      case 'spotify':
        return <MusicNote {...iconProps} />;
      default:
        return <PlayCircleOutline {...iconProps} />;
    }
  };

  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.15)',
            boxShadow: `0 12px 40px 0 ${brandTheme.glow}`,
            '& .card-header-bg': {
              transform: 'scale(1.03)',
            }
          }
        }}
      >
        {/* Card Header (Brand Image / Icon Area with custom gradients) */}
        <Box
          className="card-header-bg"
          sx={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: brandTheme.gradient,
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '30%',
              background: 'linear-gradient(to top, rgba(17,22,34,0.65), rgba(17,22,34,0))'
            }
          }}
        >
          {getServiceIcon(service.nombre)}
        </Box>
        
        <CardContent sx={{ flexGrow: 1, pt: 2.5, px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
              {service.nombre}
            </Typography>
            <Chip 
              label={service.categoria} 
              size="small" 
              sx={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f3f4f6',
                fontWeight: 600,
                fontSize: '0.75rem',
                backdropFilter: 'blur(5px)'
              }}
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, height: '40px', overflow: 'hidden' }}>
            {service.descripcion || 'Servicio de streaming premium en alta definición.'}
          </Typography>

          {service.planes && service.planes.length > 0 ? (
            <Box sx={{ background: 'rgba(255, 255, 255, 0.02)', p: 2, borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Planes destacados:
              </Typography>
              {service.planes.slice(0, 2).map((plan) => (
                <Box key={plan.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, '&:last-child': { mb: 0 } }}>
                  <Typography variant="body2" sx={{ color: '#d1d5db' }}>
                    {plan.nombre_plan} ({plan.duracion_meses} mes{plan.duracion_meses > 1 ? 'es' : ''})
                  </Typography>
                  <Typography variant="body2" fontWeight="700" color="primary.light">
                    ${plan.precio_venta} MXN
                  </Typography>
                </Box>
              ))}
              {service.planes.length > 2 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontSize: '0.75rem', textAlign: 'right' }}>
                  +{service.planes.length - 2} planes más disponibles
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No hay planes disponibles temporalmente.
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ p: 3, pt: 0 }}>
          <Button 
            variant="contained" 
            startIcon={<AddShoppingCart />}
            onClick={() => setPlanDialogOpen(true)}
            disabled={!service.planes || service.planes.length === 0}
            fullWidth
            sx={{
              py: 1.5,
              background: brandTheme.gradient,
              boxShadow: `0 4px 12px 0 ${brandTheme.glow}`,
              '&:hover': {
                background: brandTheme.gradient,
                filter: 'brightness(1.15)',
                boxShadow: `0 6px 16px 0 ${brandTheme.glow}`,
              }
            }}
          >
            Ver Planes
          </Button>
        </CardActions>
      </Card>

      {/* Dialogo de compra (Glassmorphism) */}
      <Dialog 
        open={planDialogOpen} 
        onClose={() => setPlanDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pt: 3, px: 3.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif' }}>
            {service.nombre}
          </Typography>
          <IconButton onClick={() => setPlanDialogOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3.5, pb: 3 }}>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="select-plan-label">Seleccionar Plan</InputLabel>
              <Select
                labelId="select-plan-label"
                value={selectedPlan}
                label="Seleccionar Plan"
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                {service.planes?.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{plan.nombre_plan} ({plan.duracion_meses} mes{plan.duracion_meses > 1 ? 'es' : ''})</span>
                      <strong style={{ color: '#818cf8' }}>${plan.precio_venta}</strong>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="number"
              label="Cantidad de cuentas"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              fullWidth
              inputProps={{ min: 1, max: 10 }}
              helperText="Puedes comprar hasta 10 cuentas a la vez"
            />

            {selectedPlan && (
              <Box 
                sx={{ 
                  mt: 4, 
                  p: 2.5, 
                  bgcolor: 'rgba(255,255,255,0.02)', 
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, mb: 1, letterSpacing: '0.05em' }}>
                  Resumen de compra:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ color: '#f3f4f6' }}>Total:</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.light', fontFamily: '"Outfit", sans-serif' }}>
                    ${(service.planes.find(p => p.id === selectedPlan)?.precio_venta || 0) * quantity} MXN
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3.5, pb: 4, pt: 0 }}>
          <Button 
            onClick={handleAddToCart}
            variant="contained"
            disabled={!selectedPlan}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Agregar al Carrito
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const LoadingSkeleton = () => (
  <Grid container spacing={4}>
    {[...Array(6)].map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card>
          <Skeleton variant="rectangular" height={120} />
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="text" height={32} width="60%" sx={{ mb: 1 }} />
            <Skeleton variant="text" height={20} width="90%" sx={{ mb: 0.5 }} />
            <Skeleton variant="text" height={20} width="80%" sx={{ mb: 3 }} />
            <Skeleton variant="rectangular" height={54} sx={{ borderRadius: 2 }} />
          </CardContent>
          <CardActions sx={{ p: 3, pt: 0 }}>
            <Skeleton variant="rectangular" height={48} width="100%" sx={{ borderRadius: 3 }} />
          </CardActions>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const HomePage = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const { services, loading, error } = useSelector((state) => state.services);
  const { message: cartMessage } = useSelector((state) => state.cart);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    dispatch(servicesActions.fetchServices());
  }, [dispatch]);

  useEffect(() => {
    if (cartMessage) {
      setSuccessMessage(cartMessage);
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [cartMessage]);

  const handleAddToCart = async (item) => {
    if (!isAuthenticated) return;
    try {
      await dispatch(cartActions.addToCart(item)).unwrap();
    } catch (error) {
      console.error('Error agregando al carrito:', error);
    }
  };

  const totalPlans = services.reduce((acc, service) => acc + (service.planes?.length || 0), 0);

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', pb: 8 }}>
      {/* Orbes de fondo difuminados de diseño Premium */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: '-20%', 
          left: '10%', 
          width: '500px', 
          height: '500px', 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
          filter: 'blur(80px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} 
      />
      <Box 
        sx={{ 
          position: 'absolute', 
          top: '30%', 
          right: '-10%', 
          width: '600px', 
          height: '600px', 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0) 70%)',
          filter: 'blur(100px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} 
      />

      <Container maxWidth="lg" sx={{ pt: 16 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 8, mt: 4 }}>
          <Typography 
            variant="h1" 
            component="h1" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 50%, #fbcfe8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              fontWeight: 800,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' }
            }}
          >
            Tus streaming favoritos, reunidos.
          </Typography>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            paragraph
            sx={{ 
              maxWidth: '650px', 
              mx: 'auto', 
              mb: 4.5,
              lineHeight: 1.6,
              fontSize: { xs: '1.05rem', sm: '1.25rem' }
            }}
          >
            Gestión inteligente de suscripciones y cuentas premium compartidas al mejor precio.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              icon={<Tv sx={{ '&&': { color: '#6366f1' } }} />} 
              label={`${services.length} Plataformas`} 
              sx={{ 
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#c7d2fe',
                fontWeight: 600,
                px: 1.5,
                py: 2.2,
                borderRadius: '20px',
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.05)'
              }}
            />
            <Chip 
              label={`${totalPlans} Planes Activos`} 
              sx={{ 
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.2)',
                color: '#fbcfe8',
                fontWeight: 600,
                px: 1.5,
                py: 2.2,
                borderRadius: '20px',
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.05)'
              }}
            />
          </Box>
        </Box>

        {/* Notificaciones / Alertas */}
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 4, 
              borderRadius: 3, 
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#a7f3d0'
            }}
          >
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4, 
              borderRadius: 3,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5'
            }}
          >
            {error}
          </Alert>
        )}

        {!isAuthenticated && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 5, 
              borderRadius: 3,
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              color: '#c7d2fe'
            }}
          >
            Inicia sesión para poder comprar o agregar servicios a tu carrito de compras.
          </Alert>
        )}

        <Divider sx={{ my: 6, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

        {/* Grid de servicios */}
        <Typography 
          variant="h3" 
          component="h2" 
          gutterBottom 
          sx={{ 
            mb: 4.5, 
            fontWeight: 800, 
            fontFamily: '"Outfit", sans-serif',
            background: 'linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Servicios Disponibles
        </Typography>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <Grid container spacing={4}>
            {services.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <ServiceCard 
                  service={service} 
                  onAddToCart={handleAddToCart}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {services.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 4, border: '1px dashed rgba(255,255,255,0.08)' }}>
            <HelpOutline sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No hay servicios disponibles en este momento.
            </Typography>
          </Box>
        )}

        {/* Bento Grid de Características */}
        <Box sx={{ mt: 14 }}>
          <Typography 
            variant="h3" 
            component="h2" 
            textAlign="center" 
            gutterBottom
            sx={{ 
              fontWeight: 800, 
              fontFamily: '"Outfit", sans-serif',
              mb: 8,
              background: 'linear-gradient(135deg, #ffffff 0%, #9ca3af 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tu compra garantizada y segura
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  p: 4.5, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
                  '&:hover': {
                    borderColor: 'rgba(99, 102, 241, 0.2)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <ShieldOutlined sx={{ fontSize: 48, color: '#6366f1', mb: 3 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 2 }}>
                  Garantía Anti-Caídas
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  Nuestras cuentas son estables y monitoreadas. Si experimentas alguna interrupción, la solucionamos o reemplazamos de inmediato.
                </Typography>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  p: 4.5, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
                  '&:hover': {
                    borderColor: 'rgba(236, 72, 153, 0.2)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <FlashOnOutlined sx={{ fontSize: 48, color: '#ec4899', mb: 3 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 2 }}>
                  Entrega Inmediata
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  Una vez confirmado tu pago, enviamos tus credenciales de acceso directamente vía WhatsApp y correo electrónico en minutos.
                </Typography>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%', 
                  p: 4.5, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
                  '&:hover': {
                    borderColor: 'rgba(99, 102, 241, 0.2)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <SupportAgentOutlined sx={{ fontSize: 48, color: '#6366f1', mb: 3 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 2 }}>
                  Soporte Premium
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  ¿Tienes dudas? Nuestro equipo está disponible las 24 horas del día por chat integrado y WhatsApp para ayudarte.
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;