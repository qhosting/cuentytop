const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación y permisos de administrador
router.use(authenticateToken);
router.use(isAdmin);

// Dashboard principal
router.get('/dashboard', AdminController.getDashboard);

// Gestión de usuarios
router.get('/usuarios', AdminController.getUsuarios);
router.get('/usuarios/:id', AdminController.getUsuarioDetalle);
router.put('/usuarios/:id', AdminController.updateUsuario);

// Configuración de Chatwoot
router.get('/chatwoot/config', AdminController.getChatwootConfig);
router.post('/chatwoot/config', AdminController.configureChatwoot);

// Reportes
router.get('/reportes', AdminController.getReportes);

module.exports = router;
