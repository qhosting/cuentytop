const express = require('express');
const router = express.Router();
const OrdenController = require('../controllers/ordenController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Rutas protegidas para usuarios autenticados
router.use(authenticateToken);

router.post('/', OrdenController.crearOrden);
router.get('/mis-ordenes', OrdenController.obtenerMisOrdenes);
router.get('/:id', OrdenController.obtenerDetalleOrden);

// Rutas de administración
router.put('/:id/estado', isAdmin, OrdenController.actualizarEstado);

module.exports = router;
