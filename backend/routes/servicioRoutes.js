const express = require('express');
const router = express.Router();
const ServicioController = require('../controllers/servicioController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Rutas públicas
router.get('/', ServicioController.obtenerActivos);
router.get('/categorias', ServicioController.obtenerCategorias);
router.get('/:id', ServicioController.buscarPorId);

// Rutas de administración (requieren ser administrador)
router.use(authenticateToken, isAdmin);
router.post('/', ServicioController.crear);
router.put('/:id', ServicioController.actualizar);
router.delete('/:id', ServicioController.eliminar);

module.exports = router;
