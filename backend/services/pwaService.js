/**
 * SERVICIO PWA (PROGRESSIVE WEB APP)
 * Gestión de notificaciones push y caché offline
 */

const pool = require('../config/database');
const webpush = require('web-push'); // npm install web-push

class PWAService {

  constructor() {
    // Configurar web-push con claves VAPID
    // En producción, estas claves deben estar en variables de entorno
    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY || 'GENERATE_VAPID_KEYS',
      privateKey: process.env.VAPID_PRIVATE_KEY || 'GENERATE_VAPID_KEYS'
    };

    if (vapidKeys.publicKey !== 'GENERATE_VAPID_KEYS') {
      webpush.setVapidDetails(
        'mailto:' + (process.env.CONTACT_EMAIL || 'admin@cuenty.mx'),
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );
    }
  }

  /**
   * Registra token de notificación push
   */
  async registerPushToken(usuarioId, subscription, deviceInfo = {}) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { endpoint, keys } = subscription;
      const token = endpoint; // Usar endpoint como identificador único

      // Verificar si el token ya existe
      const existing = await client.query(
        'SELECT * FROM push_tokens WHERE token = $1',
        [token]
      );

      let result;

      if (existing.rows.length > 0) {
        // Actualizar token existente
        result = await client.query(
          `UPDATE push_tokens SET
           usuario_id = $2,
           endpoint = $3,
           p256dh_key = $4,
           auth_key = $5,
           device_type = $6,
           browser = $7,
           activo = TRUE
           WHERE token = $1
           RETURNING *`,
          [token, usuarioId, endpoint, keys.p256dh, keys.auth, 
           deviceInfo.deviceType || 'unknown', deviceInfo.browser || 'unknown']
        );
      } else {
        // Crear nuevo token
        result = await client.query(
          `INSERT INTO push_tokens
           (usuario_id, token, endpoint, p256dh_key, auth_key, device_type, browser, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
           RETURNING *`,
          [usuarioId, token, endpoint, keys.p256dh, keys.auth,
           deviceInfo.deviceType || 'unknown', deviceInfo.browser || 'unknown']
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        token: result.rows[0],
        message: 'Token de notificación push registrado exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error registrando token push:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Envía notificación push a un usuario
   */
  async sendPushNotification(usuarioId, notificationData) {
    try {
      const { title, body, icon, url, data } = notificationData;

      // Obtener tokens activos del usuario
      const tokensResult = await pool.query(
        'SELECT * FROM push_tokens WHERE usuario_id = $1 AND activo = TRUE',
        [usuarioId]
      );

      if (tokensResult.rows.length === 0) {
        return {
          success: false,
          error: 'Usuario no tiene tokens de notificación registrados'
        };
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: icon || '/images/icon-192x192.png',
        url: url || '/',
        data: data || {}
      });

      const results = [];

      // Enviar a todos los dispositivos del usuario
      for (const token of tokensResult.rows) {
        try {
          const subscription = {
            endpoint: token.endpoint,
            keys: {
              p256dh: token.p256dh_key,
              auth: token.auth_key
            }
          };

          await webpush.sendNotification(subscription, payload);
          
          results.push({
            tokenId: token.id,
            success: true
          });

        } catch (error) {
          console.error(`Error enviando push a token ${token.id}:`, error);
          
          // Si el token es inválido, desactivarlo
          if (error.statusCode === 410) {
            await pool.query(
              'UPDATE push_tokens SET activo = FALSE WHERE id = $1',
              [token.id]
            );
          }

          results.push({
            tokenId: token.id,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: results.length - successCount,
        details: results
      };

    } catch (error) {
      console.error('Error enviando notificación push:', error);
      throw error;
    }
  }

  /**
   * Envía notificación push a múltiples usuarios
   */
  async sendPushNotificationToMultiple(usuarioIds, notificationData) {
    const results = [];

    for (const usuarioId of usuarioIds) {
      try {
        const result = await this.sendPushNotification(usuarioId, notificationData);
        results.push({
          usuarioId,
          ...result
        });
      } catch (error) {
        results.push({
          usuarioId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Desregistra token de notificación push
   */
  async unregisterPushToken(token) {
    try {
      const result = await pool.query(
        'UPDATE push_tokens SET activo = FALSE WHERE token = $1 RETURNING *',
        [token]
      );

      return {
        success: true,
        token: result.rows[0],
        message: 'Token desregistrado exitosamente'
      };
    } catch (error) {
      console.error('Error desregistrando token:', error);
      throw error;
    }
  }

  /**
   * Guarda datos en caché offline
   */
  async saveOfflineCache(usuarioId, cacheKey, cacheData, tipoRecurso, expiresIn = 86400) {
    try {
      const expiresAt = new Date(Date.now() + (expiresIn * 1000));

      const result = await pool.query(
        `INSERT INTO offline_cache
         (usuario_id, cache_key, cache_data, tipo_recurso, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (usuario_id, cache_key)
         DO UPDATE SET
           cache_data = EXCLUDED.cache_data,
           tipo_recurso = EXCLUDED.tipo_recurso,
           expires_at = EXCLUDED.expires_at,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [usuarioId, cacheKey, JSON.stringify(cacheData), tipoRecurso, expiresAt]
      );

      return {
        success: true,
        cache: result.rows[0]
      };
    } catch (error) {
      console.error('Error guardando caché offline:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos de caché offline
   */
  async getOfflineCache(usuarioId, cacheKey) {
    try {
      const result = await pool.query(
        `SELECT * FROM offline_cache
         WHERE usuario_id = $1 AND cache_key = $2
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [usuarioId, cacheKey]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].cache_data;
    } catch (error) {
      console.error('Error obteniendo caché offline:', error);
      throw error;
    }
  }

  /**
   * Limpia caché expirado
   */
  async cleanExpiredCache() {
    try {
      const result = await pool.query(
        'DELETE FROM offline_cache WHERE expires_at < CURRENT_TIMESTAMP'
      );

      return {
        success: true,
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error limpiando caché expirado:', error);
      throw error;
    }
  }

  /**
   * Obtiene todo el caché de un usuario
   */
  async getUserCache(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT * FROM offline_cache
         WHERE usuario_id = $1
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         ORDER BY created_at DESC`,
        [usuarioId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo caché del usuario:', error);
      throw error;
    }
  }

  /**
   * Elimina caché de un usuario
   */
  async clearUserCache(usuarioId, cacheKey = null) {
    try {
      let query;
      let params;

      if (cacheKey) {
        query = 'DELETE FROM offline_cache WHERE usuario_id = $1 AND cache_key = $2';
        params = [usuarioId, cacheKey];
      } else {
        query = 'DELETE FROM offline_cache WHERE usuario_id = $1';
        params = [usuarioId];
      }

      const result = await pool.query(query, params);

      return {
        success: true,
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error limpiando caché del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de PWA
   */
  async getPWAStatistics() {
    const client = await pool.connect();
    
    try {
      // Tokens de notificación
      const tokenStats = await client.query(
        `SELECT 
          COUNT(*) as total_tokens,
          COUNT(CASE WHEN activo = TRUE THEN 1 END) as tokens_activos,
          COUNT(DISTINCT usuario_id) as usuarios_con_push,
          device_type,
          COUNT(*) as cantidad_por_device
         FROM push_tokens
         GROUP BY device_type`
      );

      // Caché offline
      const cacheStats = await client.query(
        `SELECT 
          COUNT(*) as total_cache_entries,
          COUNT(DISTINCT usuario_id) as usuarios_con_cache,
          tipo_recurso,
          COUNT(*) as cantidad_por_tipo
         FROM offline_cache
         WHERE expires_at > CURRENT_TIMESTAMP OR expires_at IS NULL
         GROUP BY tipo_recurso`
      );

      return {
        tokens: tokenStats.rows,
        cache: cacheStats.rows
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas PWA:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = new PWAService();
