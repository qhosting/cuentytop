/**
 * SERVICIO DE INTEGRACIÓN CoDi
 * Sistema de pagos digitales CoDi (Comisión Depósitos INEGI)
 * Incluye generación QR, tracking y conexión SPUS-COBIS
 */

const pool = require('../config/database');
const crypto = require('crypto');
const QRCode = require('qrcode'); // npm install qrcode

class CodiService {

  /**
   * Genera referencia única CoDi
   */
  generateCodiReference() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CODI${timestamp}${random}`;
  }

  /**
   * Genera número de cuenta CoDi
   */
  generateAccountNumber(tipoCuenta) {
    const prefix = tipoCuenta === 'moral' ? '90' : '91';
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${prefix}${random}`;
  }

  /**
   * Genera CLABE CoDi (18 dígitos)
   */
  generateClabeCodi(bancoClave = '012', numeroCuenta) {
    // CLABE: 3 dígitos banco + 3 dígitos plaza + 11 dígitos cuenta + 1 dígito verificador
    const plaza = '001'; // Plaza por defecto
    const cuenta = numeroCuenta.padStart(11, '0');
    
    // Calcular dígito verificador (algoritmo simplificado)
    const ponderacion = [3, 7, 1];
    const clabeBase = bancoClave + plaza + cuenta;
    let suma = 0;
    
    for (let i = 0; i < clabeBase.length; i++) {
      suma += parseInt(clabeBase[i]) * ponderacion[i % 3];
    }
    
    const verificador = (10 - (suma % 10)) % 10;
    
    return clabeBase + verificador;
  }

  /**
   * Crea cuenta CoDi para un usuario
   */
  async createCodiAccount(usuarioId, tipoCuenta = 'fisica') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Obtener datos del usuario
      const userResult = await client.query(
        `SELECT u.*, td.rfc, td.razon_social
         FROM usuarios u
         LEFT JOIN tax_data td ON u.id = td.usuario_id
         WHERE u.id = $1`,
        [usuarioId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const usuario = userResult.rows[0];

      // Verificar si ya tiene cuenta CoDi activa
      const existingAccount = await client.query(
        'SELECT * FROM codi_accounts WHERE usuario_id = $1 AND estado IN ($2, $3)',
        [usuarioId, 'active', 'pending']
      );

      if (existingAccount.rows.length > 0) {
        throw new Error('Usuario ya tiene una cuenta CoDi activa');
      }

      // Generar número de cuenta y CLABE
      const numeroCuenta = this.generateAccountNumber(tipoCuenta);
      const clabeCodi = this.generateClabeCodi('012', numeroCuenta);

      // Crear cuenta CoDi
      const result = await client.query(
        `INSERT INTO codi_accounts
         (usuario_id, tipo_cuenta, numero_cuenta, clabe_codi, banco, titular, rfc, estado, verificado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [usuarioId, tipoCuenta, numeroCuenta, clabeCodi, 'BBVA Bancomer',
         usuario.razon_social || usuario.nombre, usuario.rfc, 'pending', false]
      );

      await client.query('COMMIT');

      return {
        success: true,
        account: result.rows[0],
        message: 'Cuenta CoDi creada exitosamente. Pendiente de verificación.'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creando cuenta CoDi:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Genera transacción CoDi con QR
   */
  async createCodiTransaction(ordenId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Obtener datos de la orden
      const ordenResult = await client.query(
        `SELECT o.*, u.telefono, u.nombre
         FROM ordenes o
         JOIN usuarios u ON o.usuario_id = u.id
         WHERE o.id = $1`,
        [ordenId]
      );

      if (ordenResult.rows.length === 0) {
        throw new Error('Orden no encontrada');
      }

      const orden = ordenResult.rows[0];

      // Buscar cuenta CoDi del usuario
      const accountResult = await client.query(
        'SELECT * FROM codi_accounts WHERE usuario_id = $1 AND estado = $2 LIMIT 1',
        [orden.usuario_id, 'active']
      );

      let codiAccountId = null;
      if (accountResult.rows.length > 0) {
        codiAccountId = accountResult.rows[0].id;
      }

      // Generar referencia CoDi
      const referenciaCodi = this.generateCodiReference();

      // Datos para QR CoDi (formato CoDi estándar)
      const qrData = {
        version: '1.0.0',
        type: 'CoDi',
        reference: referenciaCodi,
        amount: parseFloat(orden.total),
        currency: 'MXN',
        concept: `Orden ${orden.numero_orden}`,
        beneficiary: {
          name: 'CUENTY',
          account: codiAccountId ? accountResult.rows[0].clabe_codi : 'CLABE_CUENTY'
        }
      };

      // Generar QR Code
      const qrCodeData = JSON.stringify(qrData);
      const qrImageUrl = await QRCode.toDataURL(qrCodeData);

      // Crear transacción CoDi
      const transactionResult = await client.query(
        `INSERT INTO codi_transactions
         (orden_id, codi_account_id, referencia_codi, qr_code_data, qr_image_url, monto, concepto, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [ordenId, codiAccountId, referenciaCodi, qrCodeData, qrImageUrl, 
         orden.total, `Orden ${orden.numero_orden}`, 'pending']
      );

      await client.query('COMMIT');

      return {
        success: true,
        transaction: transactionResult.rows[0],
        qrImage: qrImageUrl,
        expiresAt: transactionResult.rows[0].expires_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creando transacción CoDi:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica pago CoDi (webhook o polling)
   */
  async verifyCodiPayment(referenciaCodi, datosWebhook = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar transacción CoDi
      const transResult = await client.query(
        'SELECT * FROM codi_transactions WHERE referencia_codi = $1',
        [referenciaCodi]
      );

      if (transResult.rows.length === 0) {
        throw new Error('Transacción CoDi no encontrada');
      }

      const transaction = transResult.rows[0];

      // Verificar si ya está completada
      if (transaction.estado === 'completed') {
        return {
          success: true,
          alreadyProcessed: true,
          transaction
        };
      }

      // Verificar expiración
      if (new Date(transaction.expires_at) < new Date()) {
        await client.query(
          'UPDATE codi_transactions SET estado = $1 WHERE id = $2',
          ['expired', transaction.id]
        );
        await client.query('COMMIT');
        throw new Error('QR CoDi expirado. Genera uno nuevo.');
      }

      // Actualizar transacción como completada
      const updatedTrans = await client.query(
        `UPDATE codi_transactions SET
         estado = $1,
         fecha_pago = CURRENT_TIMESTAMP,
         webhook_data = $2,
         datos_spus_cobis = $3
         WHERE id = $4
         RETURNING *`,
        ['completed', datosWebhook ? JSON.stringify(datosWebhook) : null,
         datosWebhook ? JSON.stringify({ processed: true, timestamp: new Date() }) : null,
         transaction.id]
      );

      // Actualizar orden como pagada
      await client.query(
        `UPDATE ordenes SET
         estado = 'paid',
         paid_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [transaction.orden_id]
      );

      await client.query('COMMIT');

      // Disparar notificación de pago recibido
      const notificationService = require('./notificationService');
      await notificationService.sendPaymentConfirmation(transaction.orden_id, 'CoDi');

      return {
        success: true,
        transaction: updatedTrans.rows[0],
        message: 'Pago CoDi verificado exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error verificando pago CoDi:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene transacciones CoDi del usuario
   */
  async getUserCodiTransactions(usuarioId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT ct.*, o.numero_orden, o.total, o.estado as orden_estado
         FROM codi_transactions ct
         JOIN ordenes o ON ct.orden_id = o.id
         WHERE o.usuario_id = $1
         ORDER BY ct.created_at DESC
         LIMIT $2`,
        [usuarioId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo transacciones CoDi:', error);
      throw error;
    }
  }

  /**
   * Obtiene cuenta CoDi del usuario
   */
  async getUserCodiAccount(usuarioId) {
    try {
      const result = await pool.query(
        'SELECT * FROM codi_accounts WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 1',
        [usuarioId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error obteniendo cuenta CoDi:', error);
      throw error;
    }
  }

  /**
   * Verifica cuenta CoDi
   */
  async verifyCodiAccount(accountId, datosVerificacion) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE codi_accounts SET
         estado = 'active',
         verificado = TRUE,
         fecha_verificacion = CURRENT_TIMESTAMP,
         datos_verificacion = $2
         WHERE id = $1
         RETURNING *`,
        [accountId, JSON.stringify(datosVerificacion)]
      );

      await client.query('COMMIT');

      return {
        success: true,
        account: result.rows[0],
        message: 'Cuenta CoDi verificada exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error verificando cuenta CoDi:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene estadísticas CoDi
   */
  async getCodiStatistics() {
    const client = await pool.connect();
    
    try {
      // Total de cuentas CoDi
      const accountsCount = await client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'active' THEN 1 END) as activas,
          COUNT(CASE WHEN verificado = TRUE THEN 1 END) as verificadas
         FROM codi_accounts`
      );

      // Transacciones CoDi
      const transStats = await client.query(
        `SELECT 
          COUNT(*) as total_transacciones,
          COUNT(CASE WHEN estado = 'completed' THEN 1 END) as completadas,
          COUNT(CASE WHEN estado = 'pending' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'expired' THEN 1 END) as expiradas,
          SUM(CASE WHEN estado = 'completed' THEN monto ELSE 0 END) as monto_total
         FROM codi_transactions`
      );

      return {
        cuentas: accountsCount.rows[0],
        transacciones: transStats.rows[0]
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas CoDi:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = new CodiService();
