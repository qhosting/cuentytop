/**
 * SERVICIO FISCAL MEXICANO
 * Gestión de RFC, IVA 16%, datos fiscales y promociones
 */

const pool = require('../config/database');

class TaxService {

  /**
   * Tasa de IVA en México
   */
  IVA_RATE = 0.16;

  /**
   * Valida formato de RFC mexicano
   */
  validateRFC(rfc) {
    // RFC Persona Física: 13 caracteres (AAAA######XXX)
    // RFC Persona Moral: 12 caracteres (AAA######XXX)
    const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcPattern.test(rfc);
  }

  /**
   * Agrega o actualiza datos fiscales de un usuario
   */
  async addTaxData(usuarioId, taxData) {
    const client = await pool.connect();
    
    try {
      const {
        rfc,
        razonSocial,
        regimenFiscal,
        codigoPostalFiscal,
        direccionFiscal,
        ciudadFiscal,
        estadoFiscal,
        usoCfdi,
        emailFacturacion,
        esPersonaMoral
      } = taxData;

      // Validar RFC
      if (!this.validateRFC(rfc)) {
        throw new Error('RFC inválido. Verifica el formato.');
      }

      await client.query('BEGIN');

      // Verificar si ya existe RFC para otro usuario
      const existingRFC = await client.query(
        'SELECT * FROM tax_data WHERE rfc = $1 AND usuario_id != $2',
        [rfc, usuarioId]
      );

      if (existingRFC.rows.length > 0) {
        throw new Error('Este RFC ya está registrado por otro usuario');
      }

      // Verificar si el usuario ya tiene datos fiscales
      const existing = await client.query(
        'SELECT * FROM tax_data WHERE usuario_id = $1',
        [usuarioId]
      );

      let result;

      if (existing.rows.length > 0) {
        // Actualizar datos existentes
        result = await client.query(
          `UPDATE tax_data SET
           rfc = $2,
           razon_social = $3,
           regimen_fiscal = $4,
           codigo_postal_fiscal = $5,
           direccion_fiscal = $6,
           ciudad_fiscal = $7,
           estado_fiscal = $8,
           uso_cfdi = $9,
           email_facturacion = $10,
           es_persona_moral = $11,
           validado = FALSE
           WHERE usuario_id = $1
           RETURNING *`,
          [usuarioId, rfc, razonSocial, regimenFiscal, codigoPostalFiscal, 
           direccionFiscal, ciudadFiscal, estadoFiscal, usoCfdi || 'G03', 
           emailFacturacion, esPersonaMoral || false]
        );
      } else {
        // Crear nuevos datos
        result = await client.query(
          `INSERT INTO tax_data 
           (usuario_id, rfc, razon_social, regimen_fiscal, codigo_postal_fiscal, 
            direccion_fiscal, ciudad_fiscal, estado_fiscal, uso_cfdi, email_facturacion, es_persona_moral)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [usuarioId, rfc, razonSocial, regimenFiscal, codigoPostalFiscal, 
           direccionFiscal, ciudadFiscal, estadoFiscal, usoCfdi || 'G03', 
           emailFacturacion, esPersonaMoral || false]
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        taxData: result.rows[0],
        message: 'Datos fiscales guardados exitosamente'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error guardando datos fiscales:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene datos fiscales de un usuario
   */
  async getTaxData(usuarioId) {
    try {
      const result = await pool.query(
        'SELECT * FROM tax_data WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 1',
        [usuarioId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error obteniendo datos fiscales:', error);
      throw error;
    }
  }

  /**
   * Calcula IVA y totales para el carrito
   */
  calculateTax(subtotal, descuento = 0) {
    const subtotalConDescuento = subtotal - descuento;
    const iva = subtotalConDescuento * this.IVA_RATE;
    const total = subtotalConDescuento + iva;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      descuento: parseFloat(descuento.toFixed(2)),
      subtotalConDescuento: parseFloat(subtotalConDescuento.toFixed(2)),
      iva: parseFloat(iva.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      tasaIva: this.IVA_RATE
    };
  }

  /**
   * Actualiza carrito con cálculos fiscales
   */
  async updateCartTax(usuarioId, taxDataId = null, aplicarFactura = false) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Obtener items del carrito
      const cartItems = await client.query(
        `SELECT sc.*, sp.precio_venta
         FROM shopping_cart sc
         JOIN service_plans sp ON sc.plan_id = sp.id
         WHERE sc.usuario_id = $1`,
        [usuarioId]
      );

      if (cartItems.rows.length === 0) {
        throw new Error('Carrito vacío');
      }

      // Calcular subtotal
      let subtotal = 0;
      for (const item of cartItems.rows) {
        subtotal += item.precio_venta * item.cantidad;
      }

      // Obtener descuento si hay código promocional
      let descuento = 0;
      const cartWithPromo = await client.query(
        'SELECT codigo_promocion FROM shopping_cart WHERE usuario_id = $1 AND codigo_promocion IS NOT NULL LIMIT 1',
        [usuarioId]
      );

      if (cartWithPromo.rows.length > 0) {
        const promoResult = await this.applyPromoCode(usuarioId, cartWithPromo.rows[0].codigo_promocion, subtotal);
        descuento = promoResult.descuento;
      }

      // Calcular IVA y total
      const calculations = this.calculateTax(subtotal, descuento);

      // Actualizar todos los items del carrito
      await client.query(
        `UPDATE shopping_cart SET
         tax_data_id = $2,
         subtotal = $3,
         iva = $4,
         total = $5,
         aplicar_factura = $6,
         descuento = $7
         WHERE usuario_id = $1`,
        [usuarioId, taxDataId, calculations.subtotal, calculations.iva, 
         calculations.total, aplicarFactura, descuento]
      );

      await client.query('COMMIT');

      return {
        success: true,
        calculations,
        itemCount: cartItems.rows.length
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error actualizando impuestos del carrito:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Valida y aplica código promocional
   */
  async applyPromoCode(usuarioId, codigo, subtotal) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar promoción activa
      const promoResult = await client.query(
        `SELECT * FROM promociones
         WHERE codigo = $1
         AND activo = TRUE
         AND fecha_inicio <= CURRENT_TIMESTAMP
         AND fecha_fin >= CURRENT_TIMESTAMP
         AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)`,
        [codigo.toUpperCase()]
      );

      if (promoResult.rows.length === 0) {
        throw new Error('Código promocional inválido o expirado');
      }

      const promo = promoResult.rows[0];

      // Verificar monto mínimo
      if (promo.monto_minimo && subtotal < promo.monto_minimo) {
        throw new Error(`Compra mínima de $${promo.monto_minimo} MXN requerida`);
      }

      // Calcular descuento
      let descuento = 0;
      if (promo.tipo_descuento === 'porcentaje') {
        descuento = subtotal * (promo.valor_descuento / 100);
      } else if (promo.tipo_descuento === 'monto_fijo') {
        descuento = promo.valor_descuento;
      }

      // Actualizar carrito con código promocional
      await client.query(
        `UPDATE shopping_cart SET
         codigo_promocion = $2,
         descuento = $3
         WHERE usuario_id = $1`,
        [usuarioId, codigo.toUpperCase(), descuento]
      );

      // Incrementar contador de usos
      await client.query(
        'UPDATE promociones SET usos_actuales = usos_actuales + 1 WHERE id = $1',
        [promo.id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        descuento,
        promocion: {
          codigo: promo.codigo,
          nombre: promo.nombre,
          descripcion: promo.descripcion,
          tipoDescuento: promo.tipo_descuento,
          valorDescuento: promo.valor_descuento
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error aplicando código promocional:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina código promocional del carrito
   */
  async removePromoCode(usuarioId) {
    try {
      await pool.query(
        `UPDATE shopping_cart SET
         codigo_promocion = NULL,
         descuento = 0
         WHERE usuario_id = $1`,
        [usuarioId]
      );

      return {
        success: true,
        message: 'Código promocional removido'
      };
    } catch (error) {
      console.error('Error removiendo código promocional:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva promoción
   */
  async createPromotion(promoData) {
    try {
      const {
        codigo,
        nombre,
        descripcion,
        tipoDescuento,
        valorDescuento,
        montoMinimo,
        fechaInicio,
        fechaFin,
        usosMaximos,
        serviciosAplicables
      } = promoData;

      const result = await pool.query(
        `INSERT INTO promociones
         (codigo, nombre, descripcion, tipo_descuento, valor_descuento, monto_minimo,
          fecha_inicio, fecha_fin, usos_maximos, servicios_aplicables, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
         RETURNING *`,
        [codigo.toUpperCase(), nombre, descripcion, tipoDescuento, valorDescuento,
         montoMinimo, fechaInicio, fechaFin, usosMaximos, serviciosAplicables]
      );

      return {
        success: true,
        promocion: result.rows[0]
      };
    } catch (error) {
      console.error('Error creando promoción:', error);
      throw error;
    }
  }

  /**
   * Obtiene promociones activas
   */
  async getActivePromotions() {
    try {
      const result = await pool.query(
        `SELECT * FROM promociones
         WHERE activo = TRUE
         AND fecha_inicio <= CURRENT_TIMESTAMP
         AND fecha_fin >= CURRENT_TIMESTAMP
         ORDER BY created_at DESC`
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo promociones:', error);
      throw error;
    }
  }

  /**
   * Desactiva una promoción
   */
  async deactivatePromotion(promoId) {
    try {
      const result = await pool.query(
        'UPDATE promociones SET activo = FALSE WHERE id = $1 RETURNING *',
        [promoId]
      );

      return {
        success: true,
        promocion: result.rows[0]
      };
    } catch (error) {
      console.error('Error desactivando promoción:', error);
      throw error;
    }
  }

  /**
   * Valida código postal mexicano
   */
  validateCodigoPostal(cp) {
    // Código postal mexicano: 5 dígitos
    return /^\d{5}$/.test(cp);
  }

  /**
   * Obtiene estadísticas fiscales
   */
  async getTaxStatistics() {
    const client = await pool.connect();
    
    try {
      // Total de usuarios con datos fiscales
      const usersWithTax = await client.query(
        'SELECT COUNT(*) as total FROM tax_data WHERE validado = TRUE'
      );

      // Distribución por régimen fiscal
      const byRegimen = await client.query(
        `SELECT regimen_fiscal, COUNT(*) as cantidad
         FROM tax_data
         GROUP BY regimen_fiscal
         ORDER BY cantidad DESC`
      );

      // Promociones más usadas
      const topPromos = await client.query(
        `SELECT codigo, nombre, usos_actuales, usos_maximos
         FROM promociones
         WHERE activo = TRUE
         ORDER BY usos_actuales DESC
         LIMIT 10`
      );

      return {
        totalUsuariosFiscales: parseInt(usersWithTax.rows[0].total),
        distribucionRegimen: byRegimen.rows,
        promocionesPopulares: topPromos.rows
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas fiscales:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = new TaxService();
