const { query } = require('../config/database');

class ServicePlan {
    // Crear nuevo plan
    static async crear({ servicio_id, duracion_meses, nombre_plan, costo, margen, orden = 0 }) {
        const sql = `
            INSERT INTO service_plans (servicio_id, duracion_meses, nombre_plan, costo, margen, orden)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        try {
            const result = await query(sql, [servicio_id, duracion_meses, nombre_plan, costo, margen, orden]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creando plan: ${error.message}`);
        }
    }

    // Buscar plan por ID
    static async buscarPorId(id) {
        const sql = `
            SELECT sp.*, s.nombre as servicio_nombre, s.categoria
            FROM service_plans sp
            JOIN servicios s ON sp.servicio_id = s.id
            WHERE sp.id = $1
        `;

        try {
            const result = await query(sql, [id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando plan por ID: ${error.message}`);
        }
    }

    // Obtener planes activos por servicio
    static async obtenerPorServicio(servicio_id) {
        const sql = `
            SELECT *
            FROM service_plans 
            WHERE servicio_id = $1 AND activo = true
            ORDER BY orden, duracion_meses
        `;

        try {
            const result = await query(sql, [servicio_id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo planes por servicio: ${error.message}`);
        }
    }

    // Obtener todos los planes activos
    static async obtenerActivos() {
        const sql = `
            SELECT sp.*, s.nombre as servicio_nombre, s.categoria, s.imagen_url
            FROM service_plans sp
            JOIN servicios s ON sp.servicio_id = s.id
            WHERE sp.activo = true AND s.activo = true
            ORDER BY s.orden, sp.orden, sp.duracion_meses
        `;

        try {
            const result = await query(sql);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo planes activos: ${error.message}`);
        }
    }

    // Listar todos los planes (admin)
    static async listar(filtros = {}) {
        let sql = `
            SELECT sp.*, s.nombre as servicio_nombre, s.categoria, s.activo as servicio_activo,
                   COUNT(ic.id) as inventario_disponible
            FROM service_plans sp
            JOIN servicios s ON sp.servicio_id = s.id
            LEFT JOIN inventario_cuentas ic ON sp.id = ic.plan_id AND ic.estado = 'available'
        `;
        
        const condiciones = [];
        const valores = [];
        let paramIndex = 1;

        // Filtros
        if (filtros.activo !== undefined) {
            condiciones.push(`sp.activo = $${paramIndex}`);
            valores.push(filtros.activo);
            paramIndex++;
        }

        if (filtros.servicio_id) {
            condiciones.push(`sp.servicio_id = $${paramIndex}`);
            valores.push(filtros.servicio_id);
            paramIndex++;
        }

        if (filtros.duracion_meses) {
            condiciones.push(`sp.duracion_meses = $${paramIndex}`);
            valores.push(filtros.duracion_meses);
            paramIndex++;
        }

        if (filtros.buscar) {
            condiciones.push(`(sp.nombre_plan ILIKE $${paramIndex} OR s.nombre ILIKE $${paramIndex})`);
            valores.push(`%${filtros.buscar}%`);
            paramIndex++;
        }

        if (condiciones.length > 0) {
            sql += ` WHERE ${condiciones.join(' AND ')}`;
        }

        sql += ` GROUP BY sp.id, s.id ORDER BY s.orden, sp.orden, sp.duracion_meses`;

        // Paginación
        if (filtros.limit) {
            sql += ` LIMIT $${paramIndex}`;
            valores.push(parseInt(filtros.limit));
            paramIndex++;
        }

        if (filtros.offset) {
            sql += ` OFFSET $${paramIndex}`;
            valores.push(parseInt(filtros.offset));
        }

        try {
            const result = await query(sql, valores);
            return result.rows;
        } catch (error) {
            throw new Error(`Error listando planes: ${error.message}`);
        }
    }

    // Actualizar plan
    static async actualizar(id, { nombre_plan, costo, margen, activo, orden }) {
        const campos = [];
        const valores = [];
        let paramIndex = 1;

        if (nombre_plan) {
            campos.push(`nombre_plan = $${paramIndex}`);
            valores.push(nombre_plan);
            paramIndex++;
        }

        if (costo !== undefined) {
            if (costo < 0) {
                throw new Error('El costo no puede ser negativo');
            }
            campos.push(`costo = $${paramIndex}`);
            valores.push(costo);
            paramIndex++;
        }

        if (margen !== undefined) {
            if (margen < 0) {
                throw new Error('El margen no puede ser negativo');
            }
            campos.push(`margen = $${paramIndex}`);
            valores.push(margen);
            paramIndex++;
        }

        if (activo !== undefined) {
            campos.push(`activo = $${paramIndex}`);
            valores.push(activo);
            paramIndex++;
        }

        if (orden !== undefined) {
            campos.push(`orden = $${paramIndex}`);
            valores.push(orden);
            paramIndex++;
        }

        if (campos.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        campos.push(`updated_at = CURRENT_TIMESTAMP`);
        valores.push(id);

        const sql = `UPDATE service_plans SET ${campos.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        
        try {
            const result = await query(sql, valores);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error actualizando plan: ${error.message}`);
        }
    }

    // Cambiar estado (activo/inactivo)
    static async cambiarEstado(id, activo) {
        const sql = `UPDATE service_plans SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
        
        try {
            const result = await query(sql, [activo, id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error cambiando estado del plan: ${error.message}`);
        }
    }

    // Eliminar plan (solo si no tiene órdenes asociadas)
    static async eliminar(id) {
        // Verificar que no tenga órdenes
        const sqlOrdenes = `
            SELECT COUNT(*) as total 
            FROM order_items 
            WHERE plan_id = $1
        `;
        
        const resultOrdenes = await query(sqlOrdenes, [id]);
        
        if (parseInt(resultOrdenes.rows[0].total) > 0) {
            throw new Error('No se puede eliminar plan con órdenes asociadas');
        }

        // Verificar inventario disponible
        const sqlInventario = `
            SELECT COUNT(*) as total 
            FROM inventario_cuentas 
            WHERE plan_id = $1 AND estado = 'available'
        `;
        
        const resultInventario = await query(sqlInventario, [id]);
        
        if (parseInt(resultInventario.rows[0].total) > 0) {
            throw new Error('No se puede eliminar plan con inventario disponible');
        }

        // Eliminar plan
        const sql = `DELETE FROM service_plans WHERE id = $1 RETURNING *`;
        
        try {
            const result = await query(sql, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error eliminando plan: ${error.message}`);
        }
    }

    // Calcular precio de venta
    static calcularPrecioVenta(costo, margen) {
        return parseFloat(costo) + parseFloat(margen);
    }

    // Obtener planes por duración
    static async obtenerPorDuracion(duracion_meses) {
        const sql = `
            SELECT sp.*, s.nombre as servicio_nombre, s.categoria, s.imagen_url
            FROM service_plans sp
            JOIN servicios s ON sp.servicio_id = s.id
            WHERE sp.duracion_meses = $1 AND sp.activo = true AND s.activo = true
            ORDER BY s.orden, sp.precio_venta
        `;

        try {
            const result = await query(sql, [duracion_meses]);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo planes por duración: ${error.message}`);
        }
    }

    // Obtener inventario disponible por plan
    static async obtenerInventarioDisponible(plan_id) {
        const sql = `
            SELECT COUNT(*) as disponible
            FROM inventario_cuentas
            WHERE plan_id = $1 AND estado = 'available'
        `;

        try {
            const result = await query(sql, [plan_id]);
            return parseInt(result.rows[0].disponible);
        } catch (error) {
            throw new Error(`Error obteniendo inventario: ${error.message}`);
        }
    }

    // Verificar disponibilidad
    static async verificarDisponibilidad(plan_id, cantidad_requerida) {
        const disponible = await this.obtenerInventarioDisponible(plan_id);
        
        return {
            disponible,
            suficiente: disponible >= cantidad_requerida,
            faltante: Math.max(0, cantidad_requerida - disponible)
        };
    }

    // Obtener planes más vendidos
    static async obtenerMasVendidos(limite = 10) {
        const sql = `
            SELECT sp.*, s.nombre as servicio_nombre, s.categoria,
                   COUNT(oi.id) as total_vendidos,
                   SUM(oi.cantidad) as cantidad_total,
                   COALESCE(SUM(oi.subtotal), 0) as ingresos_totales
            FROM service_plans sp
            JOIN servicios s ON sp.servicio_id = s.id
            JOIN order_items oi ON sp.id = oi.plan_id
            JOIN ordenes o ON oi.orden_id = o.id
            WHERE o.estado IN ('paid', 'processing', 'delivered')
            GROUP BY sp.id, s.id
            ORDER BY total_vendidos DESC, ingresos_totales DESC
            LIMIT $1
        `;

        try {
            const result = await query(sql, [limite]);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo planes más vendidos: ${error.message}`);
        }
    }

    // Actualizar precios en lote
    static async actualizarPreciosLote(actualizaciones) {
        // actualizaciones es un array de objetos {id, costo, margen}
        const client = await require('../config/database').getClient();
        
        try {
            await client.query('BEGIN');
            
            for (const update of actualizaciones) {
                if (update.costo < 0 || update.margen < 0) {
                    throw new Error('Costo y margen deben ser valores positivos');
                }
                
                await client.query(
                    'UPDATE service_plans SET costo = $1, margen = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                    [update.costo, update.margen, update.id]
                );
            }
            
            await client.query('COMMIT');
            return { mensaje: `${actualizaciones.length} planes actualizados exitosamente` };
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Error actualizando precios en lote: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // Reordenar planes de un servicio
    static async reordenarPorServicio(servicio_id, ordenes) {
        // ordenes es un array de objetos {id, orden}
        const client = await require('../config/database').getClient();
        
        try {
            await client.query('BEGIN');
            
            for (const item of ordenes) {
                await client.query(
                    'UPDATE service_plans SET orden = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND servicio_id = $3',
                    [item.orden, item.id, servicio_id]
                );
            }
            
            await client.query('COMMIT');
            return { mensaje: 'Planes reordenados exitosamente' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Error reordenando planes: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // Obtener estadísticas
    static async obtenerEstadisticas() {
        const sql = `
            SELECT 
                COUNT(*) as total_planes,
                COUNT(*) FILTER (WHERE activo = true) as planes_activos,
                COUNT(*) FILTER (WHERE activo = false) as planes_inactivos,
                AVG(precio_venta) as precio_promedio,
                MIN(precio_venta) as precio_minimo,
                MAX(precio_venta) as precio_maximo
            FROM service_plans
        `;

        try {
            const result = await query(sql);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }
}

module.exports = ServicePlan;