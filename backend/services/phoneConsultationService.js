/**
 * SERVICIO DE CONSULTAS POR TELÉFONO
 * Bot de consultas SMS/WhatsApp con derivación a agentes Chatwoot
 */

const pool = require('../config/database');
const notificationService = require('./notificationService');
const chatwootService = require('./chatwootService');

class PhoneConsultationService {

  /**
   * Procesa consulta entrante por SMS/WhatsApp
   */
  async processPhoneConsultation(telefono, mensaje, metodo = 'whatsapp') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar usuario por teléfono
      const userResult = await client.query(
        'SELECT * FROM usuarios WHERE telefono = $1',
        [telefono]
      );

      const usuarioId = userResult.rows.length > 0 ? userResult.rows[0].id : null;

      // Analizar tipo de consulta
      const tipoConsulta = this.analyzeQueryType(mensaje);

      // Crear registro de consulta
      const consultaResult = await client.query(
        `INSERT INTO phone_consultations
         (usuario_id, telefono, metodo, tipo_consulta, mensaje_usuario, estado)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [usuarioId, telefono, metodo, tipoConsulta, mensaje, 'processing']
      );

      const consultaId = consultaResult.rows[0].id;

      // Generar respuesta automática según tipo de consulta
      let respuestaBot = null;
      let derivarAgente = false;

      if (usuarioId) {
        switch (tipoConsulta) {
          case 'cuentas_activas':
            respuestaBot = await this.getActiveCuentasResponse(usuarioId);
            break;
          case 'estado_pago':
            respuestaBot = await this.getPaymentStatusResponse(usuarioId);
            break;
          case 'fecha_vencimiento':
            respuestaBot = await this.getExpirationDateResponse(usuarioId);
            break;
          default:
            derivarAgente = true;
            respuestaBot = 'Un momento, te estoy conectando con un agente de soporte...';
        }
      } else {
        derivarAgente = true;
        respuestaBot = 'No encontré tu registro. Un agente te atenderá en breve.';
      }

      // Actualizar consulta con respuesta
      await client.query(
        `UPDATE phone_consultations SET
         respuesta_bot = $2,
         derivado_agente = $3,
         estado = $4
         WHERE id = $1`,
        [consultaId, respuestaBot, derivarAgente, derivarAgente ? 'escalated' : 'resolved']
      );

      await client.query('COMMIT');

      // Enviar respuesta por SMS/WhatsApp
      await notificationService.sendNotification({
        usuarioId,
        tipo: 'general',
        canal: metodo,
        destinatario: telefono,
        mensaje: respuestaBot
      });

      // Si se deriva a agente, crear conversación en Chatwoot
      if (derivarAgente && usuarioId) {
        await this.createChatwootConversation(consultaId, usuarioId, telefono, mensaje, metodo);
      }

      return {
        success: true,
        consultaId,
        tipoConsulta,
        respuesta: respuestaBot,
        derivadoAgente: derivarAgente
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error procesando consulta telefónica:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Analiza mensaje para determinar tipo de consulta
   */
  analyzeQueryType(mensaje) {
    const mensajeLower = mensaje.toLowerCase();

    if (mensajeLower.includes('cuenta') && (mensajeLower.includes('activa') || mensajeLower.includes('servicios'))) {
      return 'cuentas_activas';
    }
    if (mensajeLower.includes('pago') || mensajeLower.includes('pagué') || mensajeLower.includes('transferencia')) {
      return 'estado_pago';
    }
    if (mensajeLower.includes('vence') || mensajeLower.includes('vencimiento') || mensajeLower.includes('renovar')) {
      return 'fecha_vencimiento';
    }
    if (mensajeLower.includes('problema') || mensajeLower.includes('error') || mensajeLower.includes('no funciona')) {
      return 'soporte_tecnico';
    }

    return 'general';
  }

  /**
   * Genera respuesta para consulta de cuentas activas
   */
  async getActiveCuentasResponse(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT 
          s.nombre as servicio,
          (o.delivered_at + (sp.duracion_meses || ' months')::interval) as fecha_vencimiento
         FROM order_items oi
         JOIN ordenes o ON oi.orden_id = o.id
         JOIN servicios s ON oi.servicio_id = s.id
         JOIN service_plans sp ON oi.plan_id = sp.id
         WHERE o.usuario_id = $1 
         AND o.estado = 'delivered'
         AND oi.credenciales_entregadas = TRUE
         AND (o.delivered_at + (sp.duracion_meses || ' months')::interval) > CURRENT_TIMESTAMP
         ORDER BY fecha_vencimiento ASC`,
        [usuarioId]
      );

      if (result.rows.length === 0) {
        return 'No tienes suscripciones activas en este momento. ¿Te gustaría renovar o adquirir un nuevo servicio?';
      }

      let respuesta = `Tienes ${result.rows.length} suscripción(es) activa(s):\n\n`;
      
      for (const cuenta of result.rows) {
        const fechaVenc = new Date(cuenta.fecha_vencimiento);
        const fechaStr = fechaVenc.toLocaleDateString('es-MX', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
        respuesta += `• ${cuenta.servicio} - Vence: ${fechaStr}\n`;
      }

      return respuesta;

    } catch (error) {
      console.error('Error generando respuesta de cuentas activas:', error);
      return 'Hubo un error al consultar tus cuentas. Un agente te ayudará en breve.';
    }
  }

  /**
   * Genera respuesta para consulta de estado de pago
   */
  async getPaymentStatusResponse(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT o.numero_orden, o.total, o.estado, o.created_at
         FROM ordenes o
         WHERE o.usuario_id = $1
         ORDER BY o.created_at DESC
         LIMIT 3`,
        [usuarioId]
      );

      if (result.rows.length === 0) {
        return 'No encontré órdenes recientes. ¿Necesitas ayuda con un nuevo pedido?';
      }

      let respuesta = 'Estado de tus órdenes recientes:\n\n';
      
      const estadosEspanol = {
        'pending': 'Pendiente',
        'pending_payment': 'Esperando pago',
        'paid': 'Pagada',
        'processing': 'En proceso',
        'delivered': 'Entregada',
        'cancelled': 'Cancelada'
      };

      for (const orden of result.rows) {
        respuesta += `• Orden #${orden.numero_orden} - $${orden.total} MXN\n`;
        respuesta += `  Estado: ${estadosEspanol[orden.estado] || orden.estado}\n\n`;
      }

      return respuesta;

    } catch (error) {
      console.error('Error generando respuesta de estado de pago:', error);
      return 'Hubo un error al consultar tus pagos. Un agente te ayudará en breve.';
    }
  }

  /**
   * Genera respuesta para consulta de fecha de vencimiento
   */
  async getExpirationDateResponse(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT 
          s.nombre as servicio,
          (o.delivered_at + (sp.duracion_meses || ' months')::interval) as fecha_vencimiento,
          DATE_PART('day', (o.delivered_at + (sp.duracion_meses || ' months')::interval) - CURRENT_TIMESTAMP) as dias_restantes
         FROM order_items oi
         JOIN ordenes o ON oi.orden_id = o.id
         JOIN servicios s ON oi.servicio_id = s.id
         JOIN service_plans sp ON oi.plan_id = sp.id
         WHERE o.usuario_id = $1 
         AND o.estado = 'delivered'
         AND oi.credenciales_entregadas = TRUE
         AND (o.delivered_at + (sp.duracion_meses || ' months')::interval) > CURRENT_TIMESTAMP
         ORDER BY fecha_vencimiento ASC`,
        [usuarioId]
      );

      if (result.rows.length === 0) {
        return 'No tienes suscripciones activas para renovar. ¿Te gustaría ver nuestros planes disponibles?';
      }

      let respuesta = 'Fechas de vencimiento de tus servicios:\n\n';
      
      for (const cuenta of result.rows) {
        const fechaVenc = new Date(cuenta.fecha_vencimiento);
        const fechaStr = fechaVenc.toLocaleDateString('es-MX', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
        const diasRestantes = Math.floor(cuenta.dias_restantes);
        
        respuesta += `• ${cuenta.servicio}\n`;
        respuesta += `  Vence: ${fechaStr} (${diasRestantes} días)\n\n`;
      }

      return respuesta;

    } catch (error) {
      console.error('Error generando respuesta de vencimiento:', error);
      return 'Hubo un error al consultar tus vencimientos. Un agente te ayudará en breve.';
    }
  }

  /**
   * Crea conversación en Chatwoot para derivación a agente
   */
  async createChatwootConversation(consultaId, usuarioId, telefono, mensaje, metodo) {
    try {
      // Crear conversación en Chatwoot
      const conversation = await chatwootService.createConversation({
        usuarioId,
        canal: metodo,
        mensaje
      });

      if (conversation.success) {
        // Actualizar consulta con ID de conversación Chatwoot
        await pool.query(
          `UPDATE phone_consultations SET
           datos_consulta = jsonb_set(
             COALESCE(datos_consulta, '{}'::jsonb),
             '{chatwoot_conversation_id}',
             $2::text::jsonb
           )
           WHERE id = $1`,
          [consultaId, conversation.conversationId]
        );

        // Crear sesión de chat
        await pool.query(
          `INSERT INTO chat_sessions
           (usuario_id, chatwoot_conversation_id, canal, estado, inbox_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [usuarioId, conversation.conversationId, metodo, 'open', conversation.inboxId || null]
        );
      }

      return conversation;

    } catch (error) {
      console.error('Error creando conversación Chatwoot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene historial de consultas del usuario
   */
  async getUserConsultations(usuarioId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM phone_consultations
         WHERE usuario_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [usuarioId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo consultas:', error);
      throw error;
    }
  }

  /**
   * Marca consulta como resuelta
   */
  async resolveConsultation(consultaId, satisfactionRating = null) {
    try {
      const result = await pool.query(
        `UPDATE phone_consultations SET
         estado = 'resolved',
         resuelto = TRUE,
         resolved_at = CURRENT_TIMESTAMP,
         satisfaction_rating = $2
         WHERE id = $1
         RETURNING *`,
        [consultaId, satisfactionRating]
      );

      return {
        success: true,
        consulta: result.rows[0]
      };
    } catch (error) {
      console.error('Error resolviendo consulta:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de consultas
   */
  async getConsultationStatistics() {
    const client = await pool.connect();
    
    try {
      // Estadísticas generales
      const generalStats = await client.query(
        `SELECT 
          COUNT(*) as total_consultas,
          COUNT(CASE WHEN derivado_agente = TRUE THEN 1 END) as derivadas_agente,
          COUNT(CASE WHEN resuelto = TRUE THEN 1 END) as resueltas,
          AVG(satisfaction_rating) as rating_promedio
         FROM phone_consultations`
      );

      // Por tipo de consulta
      const byType = await client.query(
        `SELECT 
          tipo_consulta,
          COUNT(*) as cantidad,
          COUNT(CASE WHEN derivado_agente = TRUE THEN 1 END) as derivadas
         FROM phone_consultations
         GROUP BY tipo_consulta
         ORDER BY cantidad DESC`
      );

      // Por método
      const byMethod = await client.query(
        `SELECT 
          metodo,
          COUNT(*) as cantidad
         FROM phone_consultations
         GROUP BY metodo`
      );

      return {
        general: generalStats.rows[0],
        porTipo: byType.rows,
        porMetodo: byMethod.rows
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas de consultas:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = new PhoneConsultationService();
