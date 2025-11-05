const express = require('express');
const router = express.Router();
const SpeiController = require('../controllers/speiController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Rutas públicas (webhook)
router.post('/webhook', SpeiController.webhook);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// Crear transacción SPEI
router.post('/transactions', SpeiController.createTransaction);

// Obtener transacción por referencia
router.get('/transactions/referencia/:referencia', SpeiController.getByReference);

// Obtener transacción por orden
router.get('/transactions/orden/:ordenId', SpeiController.getByOrderId);

// Rutas de administración
router.use(isAdmin);

// Confirmar pago manualmente
router.post('/transactions/:referencia/confirm', SpeiController.confirmPayment);

// Cancelar transacción
router.post('/transactions/:referencia/cancel', SpeiController.cancelTransaction);

// Listar transacciones con filtros
router.get('/transactions', SpeiController.list);

// Estadísticas SPEI
router.get('/statistics', SpeiController.getStatistics);

module.exports = router;
