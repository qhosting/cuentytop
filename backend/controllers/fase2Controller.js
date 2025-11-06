/**
 * CONTROLADOR FASE 2 - CUENTY
 * Maneja todas las operaciones de los nuevos sistemas
 */

const twoFactorService = require('../services/twoFactorService');
const userDashboardService = require('../services/userDashboardService');
const taxService = require('../services/taxService');
const codiService = require('../services/codiService');
const phoneConsultationService = require('../services/phoneConsultationService');
const pwaService = require('../services/pwaService');
const automationService = require('../services/automationService');

class Fase2Controller {

  // ==================== 2FA ENDPOINTS ====================

  /**
   * Activa 2FA para el usuario
   */
  async activate2FA(req, res) {
    try {
      const { metodo, telefono } = req.body;
      const usuarioId = req.user.id;

      const result = await twoFactorService.activate2FA(usuarioId, metodo, telefono);
      
      res.json({
        success: true,
        data: result,
        message: 'Autenticación de dos factores activada exitosamente'
      });
    } catch (error) {
      console.error('Error activando 2FA:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Desactiva 2FA para el usuario
   */
  async deactivate2FA(req, res) {
    try {
      const { metodo } = req.body;
      const usuarioId = req.user.id;

      const result = await twoFactorService.deactivate2FA(usuarioId, metodo);
      
      res.json({
        success: true,
        data: result,
        message: 'Autenticación de dos factores desactivada'
      });
    } catch (error) {
      console.error('Error desactivando 2FA:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Envía código 2FA
   */
  async send2FACode(req, res) {
    try {
      const { metodo, proposito } = req.body;
      const usuarioId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await twoFactorService.sendCode(usuarioId, metodo, proposito, ipAddress, userAgent);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error enviando código 2FA:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Verifica código 2FA
   */
  async verify2FACode(req, res) {
    try {
      const { codigo, proposito } = req.body;
      const usuarioId = req.user.id;

      const result = await twoFactorService.verifyCode(usuarioId, codigo, proposito);
      
      res.json(result);
    } catch (error) {
      console.error('Error verificando código 2FA:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene métodos 2FA del usuario
   */
  async get2FAMethods(req, res) {
    try {
      const usuarioId = req.user.id;

      const methods = await twoFactorService.getUserMethods(usuarioId);
      
      res.json({
        success: true,
        data: methods
      });
    } catch (error) {
      console.error('Error obteniendo métodos 2FA:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== DASHBOARD ENDPOINTS ====================

  /**
   * Obtiene dashboard completo del usuario
   */
  async getDashboard(req, res) {
    try {
      const usuarioId = req.user.id;

      const dashboard = await userDashboardService.getDashboardSummary(usuarioId);
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene historial de transacciones
   */
  async getTransactionHistory(req, res) {
    try {
      const usuarioId = req.user.id;
      const filters = {
        tipoPago: req.query.tipo_pago,
        estado: req.query.estado,
        fechaInicio: req.query.fecha_inicio,
        fechaFin: req.query.fecha_fin,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const result = await userDashboardService.getTransactionHistory(usuarioId, filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene suscripciones activas
   */
  async getActiveSubscriptions(req, res) {
    try {
      const usuarioId = req.user.id;

      const subscriptions = await userDashboardService.getActiveSubscriptions(usuarioId);
      
      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      console.error('Error obteniendo suscripciones:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Actualiza perfil del usuario
   */
  async updateProfile(req, res) {
    try {
      const usuarioId = req.user.id;
      const profileData = req.body;

      const result = await userDashboardService.updateUserProfile(usuarioId, profileData);
      
      res.json(result);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== TAX/FISCAL ENDPOINTS ====================

  /**
   * Agrega datos fiscales
   */
  async addTaxData(req, res) {
    try {
      const usuarioId = req.user.id;
      const taxData = req.body;

      const result = await taxService.addTaxData(usuarioId, taxData);
      
      res.json(result);
    } catch (error) {
      console.error('Error agregando datos fiscales:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene datos fiscales del usuario
   */
  async getTaxData(req, res) {
    try {
      const usuarioId = req.user.id;

      const taxData = await taxService.getTaxData(usuarioId);
      
      res.json({
        success: true,
        data: taxData
      });
    } catch (error) {
      console.error('Error obteniendo datos fiscales:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Aplica código promocional
   */
  async applyPromoCode(req, res) {
    try {
      const usuarioId = req.user.id;
      const { codigo, subtotal } = req.body;

      const result = await taxService.applyPromoCode(usuarioId, codigo, subtotal);
      
      res.json(result);
    } catch (error) {
      console.error('Error aplicando código promocional:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene promociones activas
   */
  async getActivePromotions(req, res) {
    try {
      const promotions = await taxService.getActivePromotions();
      
      res.json({
        success: true,
        data: promotions
      });
    } catch (error) {
      console.error('Error obteniendo promociones:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== CoDi ENDPOINTS ====================

  /**
   * Crea cuenta CoDi para el usuario
   */
  async createCodiAccount(req, res) {
    try {
      const usuarioId = req.user.id;
      const { tipoCuenta } = req.body;

      const result = await codiService.createCodiAccount(usuarioId, tipoCuenta);
      
      res.json(result);
    } catch (error) {
      console.error('Error creando cuenta CoDi:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Genera transacción CoDi con QR
   */
  async generateCodiQR(req, res) {
    try {
      const { ordenId } = req.body;

      const result = await codiService.createCodiTransaction(ordenId);
      
      res.json(result);
    } catch (error) {
      console.error('Error generando QR CoDi:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Verifica pago CoDi
   */
  async verifyCodiPayment(req, res) {
    try {
      const { referenciaCodi } = req.body;

      const result = await codiService.verifyCodiPayment(referenciaCodi, req.body.datosWebhook);
      
      res.json(result);
    } catch (error) {
      console.error('Error verificando pago CoDi:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene transacciones CoDi del usuario
   */
  async getCodiTransactions(req, res) {
    try {
      const usuarioId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;

      const transactions = await codiService.getUserCodiTransactions(usuarioId, limit);
      
      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error obteniendo transacciones CoDi:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== PHONE CONSULTATION ENDPOINTS ====================

  /**
   * Webhook para consultas por teléfono (Twilio)
   */
  async phoneConsultationWebhook(req, res) {
    try {
      const { From, Body, MessagingServiceSid } = req.body;
      
      // Determinar método (SMS o WhatsApp)
      const metodo = From.includes('whatsapp') ? 'whatsapp' : 'sms';
      const telefono = From.replace('whatsapp:', '').replace('+', '');

      const result = await phoneConsultationService.processPhoneConsultation(
        telefono,
        Body,
        metodo
      );

      // Responder a Twilio con TwiML
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>${result.respuesta}</Message>
        </Response>`);
    } catch (error) {
      console.error('Error en webhook de consulta telefónica:', error);
      res.status(500).send('Error');
    }
  }

  /**
   * Obtiene consultas del usuario
   */
  async getUserConsultations(req, res) {
    try {
      const usuarioId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;

      const consultations = await phoneConsultationService.getUserConsultations(usuarioId, limit);
      
      res.json({
        success: true,
        data: consultations
      });
    } catch (error) {
      console.error('Error obteniendo consultas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== PWA ENDPOINTS ====================

  /**
   * Registra token de notificación push
   */
  async registerPushToken(req, res) {
    try {
      const usuarioId = req.user.id;
      const { subscription, deviceInfo } = req.body;

      const result = await pwaService.registerPushToken(usuarioId, subscription, deviceInfo);
      
      res.json(result);
    } catch (error) {
      console.error('Error registrando token push:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Envía notificación push de prueba
   */
  async sendTestPushNotification(req, res) {
    try {
      const usuarioId = req.user.id;

      const result = await pwaService.sendPushNotification(usuarioId, {
        title: 'Notificación de prueba',
        body: 'Esta es una notificación de prueba de CUENTY',
        icon: '/images/icon-192x192.png',
        url: '/'
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error enviando notificación push:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Guarda datos en caché offline
   */
  async saveOfflineCache(req, res) {
    try {
      const usuarioId = req.user.id;
      const { cacheKey, cacheData, tipoRecurso, expiresIn } = req.body;

      const result = await pwaService.saveOfflineCache(
        usuarioId,
        cacheKey,
        cacheData,
        tipoRecurso,
        expiresIn
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error guardando caché:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene datos de caché offline
   */
  async getOfflineCache(req, res) {
    try {
      const usuarioId = req.user.id;
      const { cacheKey } = req.query;

      const cacheData = await pwaService.getOfflineCache(usuarioId, cacheKey);
      
      if (cacheData) {
        res.json({
          success: true,
          data: cacheData
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Caché no encontrado o expirado'
        });
      }
    } catch (error) {
      console.error('Error obteniendo caché:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ==================== AUTOMATION ENDPOINTS (ADMIN) ====================

  /**
   * Ejecuta workflow manualmente
   */
  async executeWorkflow(req, res) {
    try {
      const { triggerEvento, triggerData } = req.body;

      const result = await automationService.executeWorkflow(triggerEvento, triggerData);
      
      res.json(result);
    } catch (error) {
      console.error('Error ejecutando workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene todos los workflows
   */
  async getAllWorkflows(req, res) {
    try {
      const workflows = await automationService.getAllWorkflows();
      
      res.json({
        success: true,
        data: workflows
      });
    } catch (error) {
      console.error('Error obteniendo workflows:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Crea nuevo workflow
   */
  async createWorkflow(req, res) {
    try {
      const workflowData = req.body;

      const result = await automationService.createWorkflow(workflowData);
      
      res.json(result);
    } catch (error) {
      console.error('Error creando workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Activa/desactiva workflow
   */
  async toggleWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const { activo } = req.body;

      const result = await automationService.toggleWorkflow(parseInt(workflowId), activo);
      
      res.json(result);
    } catch (error) {
      console.error('Error activando/desactivando workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas consolidadas
   */
  async getStatistics(req, res) {
    try {
      const [
        taxStats,
        codiStats,
        consultationStats,
        pwaStats,
        automationStats
      ] = await Promise.all([
        taxService.getTaxStatistics(),
        codiService.getCodiStatistics(),
        phoneConsultationService.getConsultationStatistics(),
        pwaService.getPWAStatistics(),
        automationService.getAutomationStatistics()
      ]);

      res.json({
        success: true,
        data: {
          fiscal: taxStats,
          codi: codiStats,
          consultas: consultationStats,
          pwa: pwaStats,
          automatizacion: automationStats
        }
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

}

module.exports = new Fase2Controller();
