const { query } = require('../config/database');
const crypto = require('crypto');

class Orden {
    // Crear una nueva orden vacía (que luego se llenará con items)
    static async crear({ usuario_id, total, notas = null }) {
        // Generar número de orden único: CTY-YYYYMMDD-XXXX
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
        const numero_orden = `CTY-${dateStr}-${randomStr}`;

        // Obtener instrucciones de pago vigentes
        const instructionsResult = await query(
            'SELECT * FROM payment_instructions WHERE activo = true LIMIT 1'
        );
        
        let instrucciones_pago = '';
        if (instructionsResult.rows.length > 0) {
            const inst = instructionsResult.rows[0];
            instrucciones_pago = `Banco: ${inst.banco_nombre}\nTitular: ${inst.titular}\nCLABE: ${inst.clabe_interbancaria}\nCuenta: ${inst.numero_cuenta}\nConcepto: ${inst.concepto_pago}${numero_orden}\n\nInstrucciones:\n${inst.instrucciones}`;
        }

        const sql = `
            INSERT INTO ordenes (usuario_id, numero_orden, total, estado, notas, instrucciones_pago)
            VALUES ($1, $2, $3, 'pending', $4, $5)
            RETURNING *
        `;

        try {
            const result = await query(sql, [usuario_id, numero_orden, total, notas, instrucciones_pago]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creando orden: ${error.message}`);
        }
    }

    // Buscar orden por ID
    static async buscarPorId(id) {
        const sql = `SELECT * FROM ordenes WHERE id = $1`;
        try {
            const result = await query(sql, [id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando orden por ID: ${error.message}`);
        }
    }

    // Buscar orden por número de orden
    static async buscarPorNumero(numero_orden) {
        const sql = `SELECT * FROM ordenes WHERE numero_orden = $1`;
        try {
            const result = await query(sql, [numero_orden]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando orden por número: ${error.message}`);
        }
    }

    // Obtener órdenes de un usuario
    static async obtenerPorUsuario(usuario_id) {
        const sql = `
            SELECT o.*, 
                   COUNT(oi.id) as total_items
            FROM ordenes o
            LEFT JOIN order_items oi ON o.id = oi.orden_id
            WHERE o.usuario_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        try {
            const result = await query(sql, [usuario_id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo órdenes del usuario: ${error.message}`);
        }
    }

    // Obtener detalles completos de una orden (con items y servicios)
    static async obtenerDetalle(id) {
        try {
            const ordenSql = `
                SELECT o.*, u.nombre as usuario_nombre, u.telefono as usuario_telefono, u.email as usuario_email
                FROM ordenes o
                JOIN usuarios u ON o.usuario_id = u.id
                WHERE o.id = $1
            `;
            const ordenResult = await query(ordenSql, [id]);
            if (ordenResult.rows.length === 0) return null;

            const itemsSql = `
                SELECT oi.*, s.nombre as servicio_nombre, s.categoria, sp.nombre_plan, sp.duracion_meses
                FROM order_items oi
                JOIN servicios s ON oi.servicio_id = s.id
                JOIN service_plans sp ON oi.plan_id = sp.id
                WHERE oi.orden_id = $1
            `;
            const itemsResult = await query(itemsSql, [id]);

            return {
                ...ordenResult.rows[0],
                items: itemsResult.rows
            };
        } catch (error) {
            throw new Error(`Error obteniendo detalle de orden: ${error.message}`);
        }
    }

    // Actualizar estado de la orden
    static async actualizarEstado(id, estado) {
        const sql = `
            UPDATE ordenes 
            SET estado = $1, 
                updated_at = CURRENT_TIMESTAMP,
                paid_at = CASE WHEN $1 = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
                delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
            WHERE id = $2
            RETURNING *
        `;
        try {
            const result = await query(sql, [estado, id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error actualizando estado de la orden: ${error.message}`);
        }
    }
}

module.exports = Orden;
