import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
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
} from '@mui/material';
import {
  AddShoppingCart,
  PlayCircleOutline,
  MusicNote,
  Tv,
  Movie,
  SportsEsports,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../store/authSlice';
import { servicesActions } from '../store/servicesSlice';
import { cartActions } from '../store/cartSlice';

const ServiceCard = ({ service, onAddToCart }) => {
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [quantity, setQuantity] = useState(1);

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
    const iconProps = { fontSize: 'large', color: 'primary' };
    
    switch (nombre.toLowerCase()) {
      case 'netflix':
        return <Tv {...iconProps} />;
      case 'disney+':
        return <Movie {...iconProps} />;
      case 'hbo max':
        return <PlayCircleOutline {...iconProps} />;
      case 'amazon prime video':
        return <Tv {...iconProps} />;
      case 'spotify':
        return <MusicNote {...iconProps} />;
      default:
        return <PlayCircleOutline {...iconProps} />;
    }
  };

  const getCategoryColor = (categoria) => {
    const colors = {
      'Entretenimiento': 'primary',
      'Música': 'secondary',
      'Deportes': 'success',
      'Noticias': 'info',
    };
    return colors[categoria] || 'default';
  };

  return (
    <>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardMedia
          component="div"
          sx={{
            height: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
          }}
        >
          {getServiceIcon(service.nombre)}
        </CardMedia>
        
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" component="h3">
              {service.nombre}
            </Typography>
            <Chip 
              label={service.categoria} 
              size="small" 
              color={getCategoryColor(service.categoria)}
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {service.descripcion || 'Servicio de streaming premium'}
          </Typography>

          {service.planes && service.planes.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Planes disponibles:
              </Typography>
              {service.planes.slice(0, 2).map((plan) => (
                <Box key={plan.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {plan.nombre_plan} ({plan.duracion_meses} mes{plan.duracion_meses > 1 ? 'es' : ''})
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${plan.precio_venta}
                  </Typography>
                </Box>
              ))}
              {service.planes.length > 2 && (
                <Typography variant="body2" color="text.secondary">
                  +{service.planes.length - 2} planes más
                </Typography>
              )}
            </Box>
          )}
        </CardContent>

        <CardActions>
          <Button 
            variant="contained" 
            startIcon={<AddShoppingCart />}
            onClick={() => setPlanDialogOpen(true)}
            disabled={!service.planes || service.planes.length === 0}
            fullWidth
          >
            Agregar al Carrito
          </Button>
        </CardActions>
      </Card>

      <Dialog 
        open={planDialogOpen} 
        onClose={() => setPlanDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Seleccionar Plan - {service.nombre}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Plan</InputLabel>
              <Select
                value={selectedPlan}
                label="Plan"
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                {service.planes?.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>{plan.nombre_plan} ({plan.duracion_meses} mes{plan.duracion_meses > 1 ? 'es' : ''})</span>
                      <span>${plan.precio_venta}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="number"
              label="Cantidad"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              fullWidth
              inputProps={{ min: 1, max: 10 }}
              helperText="Máximo 10 unidades"
            />

            {selectedPlan && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Resumen:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total:</span>
                  <strong>
                    ${(service.planes.find(p => p.id === selectedPlan)?.precio_venta || 0) * quantity}
                  </strong>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddToCart}
            variant="contained"
            disabled={!selectedPlan}
          >
            Agregar al Carrito
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const LoadingSkeleton = () => (
  <Grid container spacing={3}>
    {[...Array(6)].map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card>
          <Skeleton variant="rectangular" height={140} />
          <CardContent>
            <Skeleton variant="text" height={32} width="70%" />
            <Skeleton variant="text" height={20} width="90%" />
            <Skeleton variant="text" height={20} width="80%" />
          </CardContent>
          <CardActions>
            <Skeleton variant="rectangular" height={36} width="100%" />
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
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [cartMessage]);

  const handleAddToCart = async (item) => {
    if (!isAuthenticated) {
      // Redirigir al login o mostrar mensaje
      return;
    }

    try {
      await dispatch(cartActions.addToCart(item)).unwrap();
      setSuccessMessage('Item agregado al carrito exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error agregando al carrito:', error);
    }
  };

  const stats = {
    totalServices: services.length,
    totalPlans: services.reduce((acc, service) => acc + (service.planes?.length || 0), 0),
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Sistema de Suscripciones
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Los mejores servicios de streaming al mejor precio
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            icon={<Tv />} 
            label={`${stats.totalServices} Servicios`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`${stats.totalPlans} Planes Disponibles`} 
            color="secondary" 
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!isAuthenticated && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Inicia sesión para agregar servicios a tu carrito
        </Alert>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Services Grid */}
      <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
        Servicios Disponibles
      </Typography>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <Grid container spacing={3}>
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
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No hay servicios disponibles en este momento
          </Typography>
        </Box>
      )}

      {/* Features Section */}
      <Box sx={{ mt: 8, py: 4 }}>
        <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
          ¿Por qué elegirnos?
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <AddShoppingCart sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Compra Fácil
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Agrega tus servicios favoritos al carrito y gestiona tus suscripciones de forma sencilla
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <PlayCircleOutline sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Entrega Rápida
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recibe tus credenciales por WhatsApp, email o en tu panel personal en menos de 2 horas
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <MusicNote sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Soporte 24/7
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nuestro equipo está disponible para ayudarte cuando lo necesites
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage;