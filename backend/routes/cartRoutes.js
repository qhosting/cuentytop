const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas del carrito requieren autenticación de usuario
router.use(authenticateToken);

router.get('/', CartController.obtenerCarrito);
router.post('/', CartController.agregarItem);
router.put('/:item_id', CartController.actualizarItem);
router.delete('/:item_id', CartController.eliminarItem);
router.delete('/', CartController.limpiarCarrito);

router.get('/verify', CartController.verificarDisponibilidad);
router.get('/count', CartController.contarItems);
router.get('/summary', CartController.obtenerResumen);

module.exports = router;
