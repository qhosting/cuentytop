const pool = require('../config/database').pool;

class SpeiService {
    // Generar transacción SPEI para una orden
    static async createTransaction(ordenId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Obtener información de la orden
            const ordenResult = await client.query(
                'SELECT id, numero_orden, total, usuario_id FROM ordenes WHERE id = $1',
                [ordenId]
            );
            
            if (ordenResult.rows.length === 0) {
                throw new Error('Orden no encontrada');
            }
            
            const orden = ordenResult.rows[0];
            
            // Obtener cuenta SPEI activa prioritaria
            const cuentaResult = await client.query(
                'SELECT * FROM spei_accounts WHERE activo = TRUE ORDER BY prioridad DESC LIMIT 1'
            );
            
            if (cuentaResult.rows.length === 0) {
                throw new Error('No hay cuentas SPEI configuradas');
            }
            
            const cuenta = cuentaResult.rows[0];
            
            // Generar referencia SPEI única
            const referenciaResult = await client.query(
                'SELECT generate_spei_reference($1) as referencia',
                [ordenId]
            );
            const referencia = referenciaResult.rows[0].referencia;
            
            // Crear transacción SPEI
            const transactionResult = await client.query(`
                INSERT INTO spei_transactions (
                    orden_id, 
                    referencia_spei, 
                    clabe_destino, 
                    banco_destino, 
                    titular_destino, 
                    monto, 
                    concepto
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                ordenId,
                referencia,
                cuenta.clabe,
                cuenta.banco,
                cuenta.titular,
                orden.total,
                `Orden ${orden.numero_orden}`
            ]);
            
            const transaction = transactionResult.rows[0];
            
            // Actualizar orden con método de pago
            await client.query(
                'UPDATE ordenes SET metodo_pago = $1, estado = $2 WHERE id = $3',
                ['spei', 'pending_payment', ordenId]
            );
            
            await client.query('COMMIT');
            
            return {
                ...transaction,
                banco: cuenta.banco,
                titular: cuenta.titular,
                clabe: cuenta.clabe,
                numero_cuenta: cuenta.numero_cuenta
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creando transacción SPEI:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Obtener transacción SPEI por referencia
    static async getByReference(referencia) {
        try {
            const result = await pool.query(
                'SELECT * FROM spei_transactions WHERE referencia_spei = $1',
                [referencia]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo transacción SPEI:', error);
            throw error;
        }
    }
    
    // Obtener transacción SPEI por orden
    static async getByOrderId(ordenId) {
        try {
            const result = await pool.query(
                'SELECT * FROM spei_transactions WHERE orden_id = $1 ORDER BY created_at DESC LIMIT 1',
                [ordenId]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo transacción SPEI:', error);
            throw error;
        }
    }
    
    // Confirmar pago SPEI
    static async confirmPayment(referencia, webhookData = {}) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Obtener transacción
            const transactionResult = await client.query(
                'SELECT * FROM spei_transactions WHERE referencia_spei = $1',
                [referencia]
            );
            
            if (transactionResult.rows.length === 0) {
                throw new Error('Transacción SPEI no encontrada');
            }
            
            const transaction = transactionResult.rows[0];
            
            // Actualizar transacción
            await client.query(`
                UPDATE spei_transactions 
                SET estado = $1, 
                    fecha_pago = $2,
                    tracking_key = $3,
                    banco_origen = $4,
                    cuenta_origen = $5,
                    rastreo_bancario = $6,
                    webhook_data = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE referencia_spei = $8
            `, [
                'completed',
                webhookData.fecha_pago || new Date(),
                webhookData.tracking_key || null,
                webhookData.banco_origen || null,
                webhookData.cuenta_origen || null,
                webhookData.rastreo_bancario || null,
                JSON.stringify(webhookData),
                referencia
            ]);
            
            // Actualizar orden
            await client.query(`
                UPDATE ordenes 
                SET estado = $1, 
                    paid_at = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, ['paid', new Date(), transaction.orden_id]);
            
            // Obtener información de la orden
            const ordenResult = await client.query(`
                SELECT o.*, u.nombre, u.telefono, u.email
                FROM ordenes o
                JOIN usuarios u ON o.usuario_id = u.id
                WHERE o.id = $1
            `, [transaction.orden_id]);
            
            const orden = ordenResult.rows[0];
            
            await client.query('COMMIT');
            
            return {
                transaction,
                orden
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error confirmando pago SPEI:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Cancelar transacción SPEI
    static async cancelTransaction(referencia, motivo = '') {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const result = await client.query(
                'UPDATE spei_transactions SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE referencia_spei = $2 RETURNING orden_id',
                ['cancelled', referencia]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Transacción SPEI no encontrada');
            }
            
            const ordenId = result.rows[0].orden_id;
            
            // Actualizar orden
            await client.query(
                'UPDATE ordenes SET estado = $1, notas = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                ['cancelled', motivo, ordenId]
            );
            
            await client.query('COMMIT');
            
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error cancelando transacción SPEI:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Registrar webhook
    static async registerWebhook(referencia, evento, payload, ipOrigen = null, userAgent = null) {
        try {
            const result = await pool.query(`
                INSERT INTO spei_webhooks (
                    referencia_spei,
                    evento,
                    payload,
                    ip_origen,
                    user_agent
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [referencia, evento, JSON.stringify(payload), ipOrigen, userAgent]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error registrando webhook SPEI:', error);
            throw error;
        }
    }
    
    // Procesar webhook
    static async processWebhook(webhookId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Obtener webhook
            const webhookResult = await client.query(
                'SELECT * FROM spei_webhooks WHERE id = $1 AND procesado = FALSE',
                [webhookId]
            );
            
            if (webhookResult.rows.length === 0) {
                throw new Error('Webhook no encontrado o ya procesado');
            }
            
            const webhook = webhookResult.rows[0];
            const payload = webhook.payload;
            
            // Confirmar pago si el evento es de confirmación
            if (webhook.evento === 'payment.confirmed') {
                await this.confirmPayment(webhook.referencia_spei, payload);
            }
            
            // Marcar webhook como procesado
            await client.query(
                'UPDATE spei_webhooks SET procesado = TRUE, processed_at = CURRENT_TIMESTAMP WHERE id = $1',
                [webhookId]
            );
            
            await client.query('COMMIT');
            
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error procesando webhook SPEI:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Obtener estadísticas SPEI
    static async getStatistics(fechaInicio = null, fechaFin = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) FILTER (WHERE estado = 'pending') as pendientes,
                    COUNT(*) FILTER (WHERE estado = 'completed') as completados,
                    COUNT(*) FILTER (WHERE estado = 'failed') as fallidos,
                    COUNT(*) FILTER (WHERE estado = 'cancelled') as cancelados,
                    SUM(monto) FILTER (WHERE estado = 'completed') as total_recaudado,
                    AVG(monto) FILTER (WHERE estado = 'completed') as ticket_promedio,
                    COUNT(*) as total_transacciones
                FROM spei_transactions
                WHERE 1=1
            `;
            
            const params = [];
            
            if (fechaInicio) {
                params.push(fechaInicio);
                query += ` AND created_at >= $${params.length}`;
            }
            
            if (fechaFin) {
                params.push(fechaFin);
                query += ` AND created_at <= $${params.length}`;
            }
            
            const result = await pool.query(query, params);
            
            return result.rows[0];
        } catch (error) {
            console.error('Error obteniendo estadísticas SPEI:', error);
            throw error;
        }
    }
    
    // Listar transacciones SPEI con filtros
    static async list(filters = {}) {
        try {
            let query = `
                SELECT 
                    st.*,
                    o.numero_orden,
                    o.estado as orden_estado,
                    u.nombre as usuario_nombre,
                    u.telefono as usuario_telefono
                FROM spei_transactions st
                JOIN ordenes o ON st.orden_id = o.id
                JOIN usuarios u ON o.usuario_id = u.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.estado) {
                params.push(filters.estado);
                query += ` AND st.estado = $${params.length}`;
            }
            
            if (filters.fecha_inicio) {
                params.push(filters.fecha_inicio);
                query += ` AND st.created_at >= $${params.length}`;
            }
            
            if (filters.fecha_fin) {
                params.push(filters.fecha_fin);
                query += ` AND st.created_at <= $${params.length}`;
            }
            
            if (filters.referencia) {
                params.push(`%${filters.referencia}%`);
                query += ` AND st.referencia_spei ILIKE $${params.length}`;
            }
            
            query += ' ORDER BY st.created_at DESC';
            
            if (filters.limit) {
                params.push(filters.limit);
                query += ` LIMIT $${params.length}`;
            }
            
            if (filters.offset) {
                params.push(filters.offset);
                query += ` OFFSET $${params.length}`;
            }
            
            const result = await pool.query(query, params);
            
            return result.rows;
        } catch (error) {
            console.error('Error listando transacciones SPEI:', error);
            throw error;
        }
    }
}

module.exports = SpeiService;
