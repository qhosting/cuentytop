const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/planController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Rutas públicas
router.get('/', PlanController.obtenerActivos);
router.get('/servicio/:servicio_id', PlanController.obtenerPorServicio);
router.get('/:id', PlanController.buscarPorId);

// Rutas de administración (requieren ser administrador)
router.use(authenticateToken, isAdmin);
router.post('/', PlanController.crear);
router.put('/:id', PlanController.actualizar);
router.delete('/:id', PlanController.eliminar);

module.exports = router;
