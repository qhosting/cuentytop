/**
 * RUTAS FASE 2 - CUENTY
 * Todas las rutas de los nuevos sistemas
 */

const express = require('express');
const router = express.Router();
const fase2Controller = require('../controllers/fase2Controller');
const auth = require('../middleware/auth');

// ==================== RUTAS 2FA ====================

/**
 * @route   POST /api/fase2/2fa/activate
 * @desc    Activar autenticación de dos factores
 * @access  Private
 */
router.post('/2fa/activate', auth, fase2Controller.activate2FA);

/**
 * @route   POST /api/fase2/2fa/deactivate
 * @desc    Desactivar autenticación de dos factores
 * @access  Private
 */
router.post('/2fa/deactivate', auth, fase2Controller.deactivate2FA);

/**
 * @route   POST /api/fase2/2fa/send-code
 * @desc    Enviar código de verificación 2FA
 * @access  Private
 */
router.post('/2fa/send-code', auth, fase2Controller.send2FACode);

/**
 * @route   POST /api/fase2/2fa/verify-code
 * @desc    Verificar código 2FA
 * @access  Private
 */
router.post('/2fa/verify-code', auth, fase2Controller.verify2FACode);

/**
 * @route   GET /api/fase2/2fa/methods
 * @desc    Obtener métodos 2FA del usuario
 * @access  Private
 */
router.get('/2fa/methods', auth, fase2Controller.get2FAMethods);

// ==================== RUTAS DASHBOARD ====================

/**
 * @route   GET /api/fase2/dashboard
 * @desc    Obtener dashboard completo del usuario
 * @access  Private
 */
router.get('/dashboard', auth, fase2Controller.getDashboard);

/**
 * @route   GET /api/fase2/dashboard/transactions
 * @desc    Obtener historial de transacciones
 * @access  Private
 */
router.get('/dashboard/transactions', auth, fase2Controller.getTransactionHistory);

/**
 * @route   GET /api/fase2/dashboard/subscriptions
 * @desc    Obtener suscripciones activas
 * @access  Private
 */
router.get('/dashboard/subscriptions', auth, fase2Controller.getActiveSubscriptions);

/**
 * @route   PUT /api/fase2/dashboard/profile
 * @desc    Actualizar perfil del usuario
 * @access  Private
 */
router.put('/dashboard/profile', auth, fase2Controller.updateProfile);

// ==================== RUTAS FISCALES ====================

/**
 * @route   POST /api/fase2/tax/add
 * @desc    Agregar datos fiscales
 * @access  Private
 */
router.post('/tax/add', auth, fase2Controller.addTaxData);

/**
 * @route   GET /api/fase2/tax/data
 * @desc    Obtener datos fiscales del usuario
 * @access  Private
 */
router.get('/tax/data', auth, fase2Controller.getTaxData);

/**
 * @route   POST /api/fase2/tax/apply-promo
 * @desc    Aplicar código promocional
 * @access  Private
 */
router.post('/tax/apply-promo', auth, fase2Controller.applyPromoCode);

/**
 * @route   GET /api/fase2/tax/promotions
 * @desc    Obtener promociones activas
 * @access  Public
 */
router.get('/tax/promotions', fase2Controller.getActivePromotions);

// ==================== RUTAS CoDi ====================

/**
 * @route   POST /api/fase2/codi/create-account
 * @desc    Crear cuenta CoDi
 * @access  Private
 */
router.post('/codi/create-account', auth, fase2Controller.createCodiAccount);

/**
 * @route   POST /api/fase2/codi/generate-qr
 * @desc    Generar QR CoDi para pago
 * @access  Private
 */
router.post('/codi/generate-qr', auth, fase2Controller.generateCodiQR);

/**
 * @route   POST /api/fase2/codi/verify-payment
 * @desc    Verificar pago CoDi
 * @access  Public (webhook)
 */
router.post('/codi/verify-payment', fase2Controller.verifyCodiPayment);

/**
 * @route   GET /api/fase2/codi/transactions
 * @desc    Obtener transacciones CoDi del usuario
 * @access  Private
 */
router.get('/codi/transactions', auth, fase2Controller.getCodiTransactions);

// ==================== RUTAS CONSULTAS TELEFÓNICAS ====================

/**
 * @route   POST /api/fase2/phone-consultation/webhook
 * @desc    Webhook para consultas por SMS/WhatsApp (Twilio)
 * @access  Public (webhook)
 */
router.post('/phone-consultation/webhook', fase2Controller.phoneConsultationWebhook);

/**
 * @route   GET /api/fase2/phone-consultation/history
 * @desc    Obtener historial de consultas del usuario
 * @access  Private
 */
router.get('/phone-consultation/history', auth, fase2Controller.getUserConsultations);

// ==================== RUTAS PWA ====================

/**
 * @route   POST /api/fase2/pwa/register-push
 * @desc    Registrar token de notificación push
 * @access  Private
 */
router.post('/pwa/register-push', auth, fase2Controller.registerPushToken);

/**
 * @route   POST /api/fase2/pwa/test-push
 * @desc    Enviar notificación push de prueba
 * @access  Private
 */
router.post('/pwa/test-push', auth, fase2Controller.sendTestPushNotification);

/**
 * @route   POST /api/fase2/pwa/save-cache
 * @desc    Guardar datos en caché offline
 * @access  Private
 */
router.post('/pwa/save-cache', auth, fase2Controller.saveOfflineCache);

/**
 * @route   GET /api/fase2/pwa/get-cache
 * @desc    Obtener datos de caché offline
 * @access  Private
 */
router.get('/pwa/get-cache', auth, fase2Controller.getOfflineCache);

// ==================== RUTAS AUTOMATION (ADMIN) ====================

/**
 * @route   POST /api/fase2/automation/execute
 * @desc    Ejecutar workflow manualmente
 * @access  Private (Admin)
 */
router.post('/automation/execute', auth, fase2Controller.executeWorkflow);

/**
 * @route   GET /api/fase2/automation/workflows
 * @desc    Obtener todos los workflows
 * @access  Private (Admin)
 */
router.get('/automation/workflows', auth, fase2Controller.getAllWorkflows);

/**
 * @route   POST /api/fase2/automation/workflows
 * @desc    Crear nuevo workflow
 * @access  Private (Admin)
 */
router.post('/automation/workflows', auth, fase2Controller.createWorkflow);

/**
 * @route   PUT /api/fase2/automation/workflows/:workflowId
 * @desc    Activar/desactivar workflow
 * @access  Private (Admin)
 */
router.put('/automation/workflows/:workflowId', auth, fase2Controller.toggleWorkflow);

// ==================== RUTAS ESTADÍSTICAS ====================

/**
 * @route   GET /api/fase2/statistics
 * @desc    Obtener estadísticas consolidadas de todos los sistemas
 * @access  Private (Admin)
 */
router.get('/statistics', auth, fase2Controller.getStatistics);

module.exports = router;
