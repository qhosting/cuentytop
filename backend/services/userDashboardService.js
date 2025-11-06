/**
 * SERVICIO DE DASHBOARD USUARIO MXN
 * Panel completo para usuarios con historial, suscripciones y perfil
 */

const pool = require('../config/database');

class UserDashboardService {

  /**
   * Obtiene resumen completo del dashboard del usuario
   */
  async getDashboardSummary(usuarioId) {
    const client = await pool.connect();
    
    try {
      // Obtener datos del usuario
      const userResult = await client.query(
        `SELECT u.*, up.nombre_completo, up.ciudad, up.estado, up.avatar_url
         FROM usuarios u
         LEFT JOIN user_profiles up ON u.id = up.usuario_id
         WHERE u.id = $1`,
        [usuarioId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const usuario = userResult.rows[0];

      // Estadísticas de órdenes
      const orderStats = await client.query(
        `SELECT 
          COUNT(*) as total_ordenes,
          COUNT(CASE WHEN estado = 'delivered' THEN 1 END) as ordenes_entregadas,
          COUNT(CASE WHEN estado = 'pending' OR estado = 'pending_payment' THEN 1 END) as ordenes_pendientes,
          SUM(CASE WHEN estado = 'delivered' THEN total ELSE 0 END) as total_gastado,
          AVG(CASE WHEN estado = 'delivered' THEN total ELSE NULL END) as ticket_promedio
         FROM ordenes
         WHERE usuario_id = $1`,
        [usuarioId]
      );

      // Suscripciones activas (órdenes entregadas)
      const activeSubs = await client.query(
        `SELECT 
          s.nombre as servicio,
          s.imagen_url,
          sp.nombre_plan,
          sp.duracion_meses,
          oi.precio_unitario,
          o.created_at as fecha_compra,
          o.delivered_at as fecha_activacion,
          (o.delivered_at + (sp.duracion_meses || ' months')::interval) as fecha_vencimiento
         FROM order_items oi
         JOIN ordenes o ON oi.orden_id = o.id
         JOIN servicios s ON oi.servicio_id = s.id
         JOIN service_plans sp ON oi.plan_id = sp.id
         WHERE o.usuario_id = $1 
         AND o.estado = 'delivered'
         AND oi.credenciales_entregadas = TRUE
         ORDER BY o.delivered_at DESC`,
        [usuarioId]
      );

      // Transacciones MXN (SPEI + CoDi)
      const transactions = await client.query(
        `SELECT * FROM transaction_summary_mxn
         WHERE telefono = (SELECT telefono FROM usuarios WHERE id = $1)
         ORDER BY created_at DESC
         LIMIT 10`,
        [usuarioId]
      );

      // Métodos 2FA activos
      const twoFactorMethods = await client.query(
        `SELECT metodo, telefono, activado, fecha_activacion
         FROM two_factor_methods
         WHERE usuario_id = $1`,
        [usuarioId]
      );

      // Datos fiscales
      const taxData = await client.query(
        `SELECT rfc, razon_social, codigo_postal_fiscal, validado
         FROM tax_data
         WHERE usuario_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [usuarioId]
      );

      return {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          nombreCompleto: usuario.nombre_completo,
          telefono: usuario.telefono,
          email: usuario.email,
          ciudad: usuario.ciudad,
          estado: usuario.estado,
          avatarUrl: usuario.avatar_url,
          verified: usuario.verified,
          createdAt: usuario.created_at
        },
        estadisticas: {
          totalOrdenes: parseInt(orderStats.rows[0].total_ordenes),
          ordenesEntregadas: parseInt(orderStats.rows[0].ordenes_entregadas),
          ordenesPendientes: parseInt(orderStats.rows[0].ordenes_pendientes),
          totalGastado: parseFloat(orderStats.rows[0].total_gastado || 0),
          ticketPromedio: parseFloat(orderStats.rows[0].ticket_promedio || 0)
        },
        suscripcionesActivas: activeSubs.rows,
        transaccionesRecientes: transactions.rows,
        metodos2FA: twoFactorMethods.rows,
        datosFiscales: taxData.rows.length > 0 ? taxData.rows[0] : null
      };

    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene historial completo de transacciones
   */
  async getTransactionHistory(usuarioId, filters = {}) {
    const client = await pool.connect();
    
    try {
      const { tipoPago, estado, fechaInicio, fechaFin, limit = 50, offset = 0 } = filters;

      let query = `
        SELECT * FROM transaction_summary_mxn
        WHERE telefono = (SELECT telefono FROM usuarios WHERE id = $1)
      `;
      
      const params = [usuarioId];
      let paramIndex = 2;

      if (tipoPago) {
        query += ` AND tipo_pago = $${paramIndex}`;
        params.push(tipoPago);
        paramIndex++;
      }

      if (estado) {
        query += ` AND estado = $${paramIndex}`;
        params.push(estado);
        paramIndex++;
      }

      if (fechaInicio) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(fechaInicio);
        paramIndex++;
      }

      if (fechaFin) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(fechaFin);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      // Contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total FROM transaction_summary_mxn
        WHERE telefono = (SELECT telefono FROM usuarios WHERE id = $1)
      `;
      const countResult = await client.query(countQuery, [usuarioId]);

      return {
        transacciones: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } catch (error) {
      console.error('Error obteniendo historial de transacciones:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene estado de suscripciones activas
   */
  async getActiveSubscriptions(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT 
          oi.id as item_id,
          s.id as servicio_id,
          s.nombre as servicio,
          s.imagen_url,
          s.categoria,
          sp.nombre_plan,
          sp.duracion_meses,
          oi.precio_unitario,
          o.numero_orden,
          o.created_at as fecha_compra,
          o.delivered_at as fecha_activacion,
          (o.delivered_at + (sp.duracion_meses || ' months')::interval) as fecha_vencimiento,
          CASE 
            WHEN (o.delivered_at + (sp.duracion_meses || ' months')::interval) < CURRENT_TIMESTAMP THEN 'vencida'
            WHEN (o.delivered_at + (sp.duracion_meses || ' months')::interval) < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'por_vencer'
            ELSE 'activa'
          END as estado_suscripcion,
          DATE_PART('day', (o.delivered_at + (sp.duracion_meses || ' months')::interval) - CURRENT_TIMESTAMP) as dias_restantes
         FROM order_items oi
         JOIN ordenes o ON oi.orden_id = o.id
         JOIN servicios s ON oi.servicio_id = s.id
         JOIN service_plans sp ON oi.plan_id = sp.id
         WHERE o.usuario_id = $1 
         AND o.estado = 'delivered'
         AND oi.credenciales_entregadas = TRUE
         ORDER BY fecha_vencimiento ASC`,
        [usuarioId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo suscripciones activas:', error);
      throw error;
    }
  }

  /**
   * Actualiza perfil del usuario
   */
  async updateUserProfile(usuarioId, profileData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Actualizar tabla usuarios
      if (profileData.nombre || profileData.email) {
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (profileData.nombre) {
          updateFields.push(`nombre = $${paramIndex}`);
          updateValues.push(profileData.nombre);
          paramIndex++;
        }

        if (profileData.email) {
          updateFields.push(`email = $${paramIndex}`);
          updateValues.push(profileData.email);
          paramIndex++;
        }

        updateValues.push(usuarioId);
        
        await client.query(
          `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          updateValues
        );
      }

      // Actualizar o crear user_profile
      const {
        nombreCompleto,
        fechaNacimiento,
        direccion,
        ciudad,
        estado,
        codigoPostal,
        avatarUrl,
        preferencias,
        idioma,
        timezone
      } = profileData;

      const profileExists = await client.query(
        'SELECT id FROM user_profiles WHERE usuario_id = $1',
        [usuarioId]
      );

      if (profileExists.rows.length > 0) {
        // Actualizar perfil existente
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (nombreCompleto !== undefined) {
          updateFields.push(`nombre_completo = $${paramIndex}`);
          updateValues.push(nombreCompleto);
          paramIndex++;
        }
        if (fechaNacimiento !== undefined) {
          updateFields.push(`fecha_nacimiento = $${paramIndex}`);
          updateValues.push(fechaNacimiento);
          paramIndex++;
        }
        if (direccion !== undefined) {
          updateFields.push(`direccion = $${paramIndex}`);
          updateValues.push(direccion);
          paramIndex++;
        }
        if (ciudad !== undefined) {
          updateFields.push(`ciudad = $${paramIndex}`);
          updateValues.push(ciudad);
          paramIndex++;
        }
        if (estado !== undefined) {
          updateFields.push(`estado = $${paramIndex}`);
          updateValues.push(estado);
          paramIndex++;
        }
        if (codigoPostal !== undefined) {
          updateFields.push(`codigo_postal = $${paramIndex}`);
          updateValues.push(codigoPostal);
          paramIndex++;
        }
        if (avatarUrl !== undefined) {
          updateFields.push(`avatar_url = $${paramIndex}`);
          updateValues.push(avatarUrl);
          paramIndex++;
        }
        if (preferencias !== undefined) {
          updateFields.push(`preferencias = $${paramIndex}`);
          updateValues.push(JSON.stringify(preferencias));
          paramIndex++;
        }
        if (idioma !== undefined) {
          updateFields.push(`idioma = $${paramIndex}`);
          updateValues.push(idioma);
          paramIndex++;
        }
        if (timezone !== undefined) {
          updateFields.push(`timezone = $${paramIndex}`);
          updateValues.push(timezone);
          paramIndex++;
        }

        if (updateFields.length > 0) {
          updateValues.push(usuarioId);
          await client.query(
            `UPDATE user_profiles SET ${updateFields.join(', ')} WHERE usuario_id = $${paramIndex}`,
            updateValues
          );
        }
      } else {
        // Crear nuevo perfil
        await client.query(
          `INSERT INTO user_profiles 
           (usuario_id, nombre_completo, fecha_nacimiento, direccion, ciudad, estado, codigo_postal, avatar_url, preferencias, idioma, timezone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [usuarioId, nombreCompleto, fechaNacimiento, direccion, ciudad, estado, codigoPostal, avatarUrl, 
           preferencias ? JSON.stringify(preferencias) : null, idioma || 'es-MX', timezone || 'America/Mexico_City']
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Perfil actualizado exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error actualizando perfil:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Crea una nueva sesión de usuario
   */
  async createUserSession(usuarioId, sessionToken, ipAddress, userAgent, deviceInfo) {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

      const result = await pool.query(
        `INSERT INTO user_sessions 
         (usuario_id, session_token, ip_address, user_agent, device_info, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [usuarioId, sessionToken, ipAddress, userAgent, deviceInfo ? JSON.stringify(deviceInfo) : null, expiresAt]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creando sesión:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial de sesiones del usuario
   */
  async getUserSessions(usuarioId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          id, ip_address, user_agent, device_info, login_at, logout_at, activo, created_at
         FROM user_sessions
         WHERE usuario_id = $1
         ORDER BY login_at DESC
         LIMIT $2`,
        [usuarioId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      throw error;
    }
  }

  /**
   * Cierra una sesión
   */
  async closeSession(sessionToken) {
    try {
      const result = await pool.query(
        `UPDATE user_sessions 
         SET activo = FALSE, logout_at = CURRENT_TIMESTAMP
         WHERE session_token = $1
         RETURNING *`,
        [sessionToken]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de uso del usuario
   */
  async getUserStatistics(usuarioId) {
    const client = await pool.connect();
    
    try {
      // Estadísticas por servicio
      const serviceStats = await client.query(
        `SELECT 
          s.nombre as servicio,
          COUNT(DISTINCT oi.id) as total_compras,
          SUM(oi.precio_unitario * oi.cantidad) as total_gastado_servicio
         FROM order_items oi
         JOIN ordenes o ON oi.orden_id = o.id
         JOIN servicios s ON oi.servicio_id = s.id
         WHERE o.usuario_id = $1 AND o.estado = 'delivered'
         GROUP BY s.nombre
         ORDER BY total_gastado_servicio DESC`,
        [usuarioId]
      );

      // Estadísticas mensuales
      const monthlyStats = await client.query(
        `SELECT 
          DATE_TRUNC('month', o.created_at) as mes,
          COUNT(*) as ordenes_mes,
          SUM(o.total) as total_mes
         FROM ordenes o
         WHERE o.usuario_id = $1
         GROUP BY DATE_TRUNC('month', o.created_at)
         ORDER BY mes DESC
         LIMIT 12`,
        [usuarioId]
      );

      return {
        porServicio: serviceStats.rows,
        porMes: monthlyStats.rows
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = new UserDashboardService();
