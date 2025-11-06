/**
 * SERVICIO DE AUTENTICACIÓN 2FA MÉXICO
 * Sistema de autenticación de dos factores vía SMS y WhatsApp con Twilio
 * Incluye códigos de respaldo de emergencia
 */

const pool = require('../config/database');
const crypto = require('crypto');

class TwoFactorService {
  
  /**
   * Genera un código 2FA de 6 dígitos
   */
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Genera códigos de respaldo de emergencia
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Activa 2FA para un usuario
   */
  async activate2FA(usuarioId, metodo, telefono) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verificar si ya existe el método
      const existingMethod = await client.query(
        'SELECT * FROM two_factor_methods WHERE usuario_id = $1 AND metodo = $2',
        [usuarioId, metodo]
      );

      let methodResult;
      
      if (existingMethod.rows.length > 0) {
        // Actualizar método existente
        methodResult = await client.query(
          `UPDATE two_factor_methods 
           SET activado = TRUE, telefono = $2, fecha_activacion = CURRENT_TIMESTAMP
           WHERE usuario_id = $1 AND metodo = $3
           RETURNING *`,
          [usuarioId, telefono, metodo]
        );
      } else {
        // Crear nuevo método
        methodResult = await client.query(
          `INSERT INTO two_factor_methods (usuario_id, metodo, telefono, activado, fecha_activacion)
           VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
           RETURNING *`,
          [usuarioId, metodo, telefono]
        );
      }

      // Generar códigos de respaldo
      const backupCodes = this.generateBackupCodes(10);
      
      // Eliminar códigos antiguos no usados
      await client.query(
        'DELETE FROM backup_codes WHERE usuario_id = $1 AND usado = FALSE',
        [usuarioId]
      );

      // Insertar nuevos códigos de respaldo
      for (const code of backupCodes) {
        await client.query(
          'INSERT INTO backup_codes (usuario_id, codigo) VALUES ($1, $2)',
          [usuarioId, code]
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        method: methodResult.rows[0],
        backupCodes: backupCodes
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error activando 2FA:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Desactiva 2FA para un usuario
   */
  async deactivate2FA(usuarioId, metodo) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE two_factor_methods 
         SET activado = FALSE, fecha_desactivacion = CURRENT_TIMESTAMP
         WHERE usuario_id = $1 AND metodo = $2
         RETURNING *`,
        [usuarioId, metodo]
      );

      await client.query('COMMIT');

      return {
        success: true,
        method: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error desactivando 2FA:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Envía código 2FA al usuario
   */
  async sendCode(usuarioId, metodo, proposito = 'login', ipAddress = null, userAgent = null) {
    const client = await pool.connect();
    
    try {
      // Obtener información del usuario y método 2FA
      const userMethod = await client.query(
        `SELECT tfm.*, u.telefono as user_telefono, u.nombre
         FROM two_factor_methods tfm
         JOIN usuarios u ON tfm.usuario_id = u.id
         WHERE tfm.usuario_id = $1 AND tfm.metodo = $2 AND tfm.activado = TRUE`,
        [usuarioId, metodo]
      );

      if (userMethod.rows.length === 0) {
        throw new Error('Método 2FA no activado para este usuario');
      }

      const { telefono, nombre } = userMethod.rows[0];
      
      // Generar código de 6 dígitos
      const codigo = this.generateCode();
      
      // Establecer expiración a 5 minutos
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Guardar código en base de datos
      const codeResult = await client.query(
        `INSERT INTO two_factor_codes 
         (usuario_id, codigo, metodo, proposito, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [usuarioId, codigo, metodo, proposito, expiresAt, ipAddress, userAgent]
      );

      // Enviar código vía Twilio (SMS o WhatsApp)
      const notificationService = require('./notificationService');
      
      let mensaje;
      if (proposito === 'login') {
        mensaje = `Tu código de verificación CUENTY es: ${codigo}. Válido por 5 minutos. No lo compartas con nadie.`;
      } else if (proposito === 'transaction') {
        mensaje = `Código de confirmación para tu transacción: ${codigo}. Expira en 5 minutos.`;
      } else {
        mensaje = `Tu código de verificación CUENTY es: ${codigo}. Válido por 5 minutos.`;
      }

      const canal = metodo === 'sms' ? 'sms' : 'whatsapp';
      
      await notificationService.sendNotification({
        usuarioId,
        tipo: '2fa',
        canal,
        destinatario: telefono,
        mensaje,
        datos: { codigo, proposito }
      });

      return {
        success: true,
        codeId: codeResult.rows[0].id,
        expiresAt,
        message: `Código enviado vía ${metodo} a ${telefono}`
      };

    } catch (error) {
      console.error('Error enviando código 2FA:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica un código 2FA
   */
  async verifyCode(usuarioId, codigo, proposito = 'login') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar código válido
      const result = await client.query(
        `SELECT * FROM two_factor_codes
         WHERE usuario_id = $1 
         AND codigo = $2 
         AND proposito = $3
         AND verificado = FALSE
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC
         LIMIT 1`,
        [usuarioId, codigo, proposito]
      );

      if (result.rows.length === 0) {
        // Incrementar intentos fallidos
        await client.query(
          `UPDATE two_factor_codes
           SET intentos = intentos + 1
           WHERE usuario_id = $1 AND proposito = $2 AND verificado = FALSE`,
          [usuarioId, proposito]
        );
        
        await client.query('COMMIT');
        
        return {
          success: false,
          error: 'Código inválido o expirado'
        };
      }

      const codeRecord = result.rows[0];

      // Verificar número de intentos
      if (codeRecord.intentos >= 3) {
        await client.query('COMMIT');
        return {
          success: false,
          error: 'Demasiados intentos. Solicita un nuevo código.'
        };
      }

      // Marcar código como verificado
      await client.query(
        `UPDATE two_factor_codes
         SET verificado = TRUE, intentos = intentos + 1
         WHERE id = $1`,
        [codeRecord.id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Código verificado exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error verificando código 2FA:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica un código de respaldo
   */
  async verifyBackupCode(usuarioId, codigo) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT * FROM backup_codes
         WHERE usuario_id = $1 AND codigo = $2 AND usado = FALSE`,
        [usuarioId, codigo]
      );

      if (result.rows.length === 0) {
        await client.query('COMMIT');
        return {
          success: false,
          error: 'Código de respaldo inválido o ya utilizado'
        };
      }

      // Marcar código como usado
      await client.query(
        `UPDATE backup_codes
         SET usado = TRUE, fecha_uso = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [result.rows[0].id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Código de respaldo verificado exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error verificando código de respaldo:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene métodos 2FA activos de un usuario
   */
  async getUserMethods(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT * FROM two_factor_methods
         WHERE usuario_id = $1
         ORDER BY created_at DESC`,
        [usuarioId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo métodos 2FA:', error);
      throw error;
    }
  }

  /**
   * Obtiene códigos de respaldo disponibles
   */
  async getBackupCodes(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT codigo, usado, fecha_uso FROM backup_codes
         WHERE usuario_id = $1
         ORDER BY created_at DESC`,
        [usuarioId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo códigos de respaldo:', error);
      throw error;
    }
  }

  /**
   * Limpia códigos 2FA expirados
   */
  async cleanupExpiredCodes() {
    try {
      const result = await pool.query(
        `DELETE FROM two_factor_codes
         WHERE expires_at < CURRENT_TIMESTAMP
         AND verificado = FALSE`
      );

      return {
        success: true,
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error limpiando códigos expirados:', error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario tiene 2FA activado
   */
  async has2FAEnabled(usuarioId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM two_factor_methods
         WHERE usuario_id = $1 AND activado = TRUE`,
        [usuarioId]
      );

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error verificando estado 2FA:', error);
      throw error;
    }
  }

}

module.exports = new TwoFactorService();
