const { query } = require('../config/database');

class Servicio {
    // Crear nuevo servicio
    static async crear({ nombre, descripcion, imagen_url, categoria, orden = 0 }) {
        const sql = `
            INSERT INTO servicios (nombre, descripcion, imagen_url, categoria, orden)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        try {
            const result = await query(sql, [nombre, descripcion, imagen_url, categoria, orden]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creando servicio: ${error.message}`);
        }
    }

    // Buscar servicio por ID
    static async buscarPorId(id) {
        const sql = `
            SELECT s.*, 
                   COUNT(sp.id) as total_planes,
                   COUNT(sp.id) FILTER (WHERE sp.activo = true) as planes_activos
            FROM servicios s
            LEFT JOIN service_plans sp ON s.id = sp.servicio_id
            WHERE s.id = $1
            GROUP BY s.id
        `;

        try {
            const result = await query(sql, [id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando servicio por ID: ${error.message}`);
        }
    }

    // Buscar servicio por nombre
    static async buscarPorNombre(nombre) {
        const sql = `SELECT * FROM servicios WHERE nombre ILIKE $1`;
        
        try {
            const result = await query(sql, [nombre]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando servicio por nombre: ${error.message}`);
        }
    }

    // Obtener todos los servicios activos
    static async obtenerActivos() {
        const sql = `
            SELECT s.*, 
                   COALESCE(json_agg(
                       json_build_object(
                           'id', sp.id,
                           'nombre_plan', sp.nombre_plan,
                           'duracion_meses', sp.duracion_meses,
                           'costo', sp.costo,
                           'margen', sp.margen,
                           'precio_venta', sp.precio_venta,
                           'activo', sp.activo,
                           'orden', sp.orden
                       ) ORDER BY sp.orden
                   ) FILTER (WHERE sp.id IS NOT NULL), '[]') as planes
            FROM servicios s
            LEFT JOIN service_plans sp ON s.id = sp.servicio_id AND sp.activo = true
            WHERE s.activo = true
            GROUP BY s.id
            ORDER BY s.orden, s.nombre
        `;

        try {
            const result = await query(sql);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo servicios activos: ${error.message}`);
        }
    }

    // Listar todos los servicios (admin)
    static async listar(filtros = {}) {
        let sql = `
            SELECT s.*, 
                   COUNT(sp.id) as total_planes,
                   COUNT(sp.id) FILTER (WHERE sp.activo = true) as planes_activos
            FROM servicios s
            LEFT JOIN service_plans sp ON s.id = sp.servicio_id
        `;
        
        const condiciones = [];
        const valores = [];
        let paramIndex = 1;

        // Filtros
        if (filtros.activo !== undefined) {
            condiciones.push(`s.activo = $${paramIndex}`);
            valores.push(filtros.activo);
            paramIndex++;
        }

        if (filtros.categoria) {
            condiciones.push(`s.categoria = $${paramIndex}`);
            valores.push(filtros.categoria);
            paramIndex++;
        }

        if (filtros.buscar) {
            condiciones.push(`(s.nombre ILIKE $${paramIndex} OR s.descripcion ILIKE $${paramIndex})`);
            valores.push(`%${filtros.buscar}%`);
            paramIndex++;
        }

        if (condiciones.length > 0) {
            sql += ` WHERE ${condiciones.join(' AND ')}`;
        }

        sql += ` GROUP BY s.id ORDER BY s.orden, s.nombre`;

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
            throw new Error(`Error listando servicios: ${error.message}`);
        }
    }

    // Actualizar servicio
    static async actualizar(id, { nombre, descripcion, imagen_url, categoria, activo, orden }) {
        const campos = [];
        const valores = [];
        let paramIndex = 1;

        if (nombre) {
            campos.push(`nombre = $${paramIndex}`);
            valores.push(nombre);
            paramIndex++;
        }

        if (descripcion !== undefined) {
            campos.push(`descripcion = $${paramIndex}`);
            valores.push(descripcion);
            paramIndex++;
        }

        if (imagen_url !== undefined) {
            campos.push(`imagen_url = $${paramIndex}`);
            valores.push(imagen_url);
            paramIndex++;
        }

        if (categoria) {
            campos.push(`categoria = $${paramIndex}`);
            valores.push(categoria);
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

        const sql = `UPDATE servicios SET ${campos.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        
        try {
            const result = await query(sql, valores);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error actualizando servicio: ${error.message}`);
        }
    }

    // Cambiar estado (activo/inactivo)
    static async cambiarEstado(id, activo) {
        const sql = `UPDATE servicios SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
        
        try {
            const result = await query(sql, [activo, id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error cambiando estado del servicio: ${error.message}`);
        }
    }

    // Eliminar servicio (solo si no tiene órdenes asociadas)
    static async eliminar(id) {
        // Verificar que no tenga órdenes
        const sqlOrdenes = `
            SELECT COUNT(*) as total 
            FROM order_items oi
            JOIN ordenes o ON oi.orden_id = o.id
            WHERE oi.servicio_id = $1 AND o.estado NOT IN ('cancelled')
        `;
        
        const resultOrdenes = await query(sqlOrdenes, [id]);
        
        if (parseInt(resultOrdenes.rows[0].total) > 0) {
            throw new Error('No se puede eliminar servicio con órdenes activas');
        }

        // Verificar inventario
        const sqlInventario = `SELECT COUNT(*) FROM inventario_cuentas WHERE servicio_id = $1 AND estado = 'available'`;
        const resultInventario = await query(sqlInventario, [id]);
        
        if (parseInt(resultInventario.rows[0].count) > 0) {
            throw new Error('No se puede eliminar servicio con inventario disponible');
        }

        // Eliminar servicio (los planes se eliminarán por CASCADE)
        const sql = `DELETE FROM servicios WHERE id = $1 RETURNING *`;
        
        try {
            const result = await query(sql, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error eliminando servicio: ${error.message}`);
        }
    }

    // Obtener servicios más vendidos
    static async obtenerMasVendidos(limite = 5) {
        const sql = `
            SELECT s.*, 
                   COUNT(oi.id) as total_vendidos,
                   SUM(oi.cantidad) as cantidad_total,
                   COALESCE(SUM(oi.subtotal), 0) as ingresos_totales
            FROM servicios s
            JOIN order_items oi ON s.id = oi.servicio_id
            JOIN ordenes o ON oi.orden_id = o.id
            WHERE o.estado IN ('paid', 'processing', 'delivered')
            GROUP BY s.id
            ORDER BY total_vendidos DESC, ingresos_totales DESC
            LIMIT $1
        `;

        try {
            const result = await query(sql, [limite]);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo servicios más vendidos: ${error.message}`);
        }
    }

    // Obtener categorías disponibles
    static async obtenerCategorias() {
        const sql = `
            SELECT categoria, COUNT(*) as total_servicios
            FROM servicios 
            WHERE activo = true
            GROUP BY categoria
            ORDER BY total_servicios DESC, categoria
        `;

        try {
            const result = await query(sql);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo categorías: ${error.message}`);
        }
    }

    // Reordenar servicios
    static async reordenar(ordenes) {
        // ordenes es un array de objetos {id, orden}
        const client = await require('../config/database').getClient();
        
        try {
            await client.query('BEGIN');
            
            for (const item of ordenes) {
                await client.query(
                    'UPDATE servicios SET orden = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [item.orden, item.id]
                );
            }
            
            await client.query('COMMIT');
            return { mensaje: 'Servicios reordenados exitosamente' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Error reordenando servicios: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // Obtener estadísticas
    static async obtenerEstadisticas() {
        const sql = `
            SELECT 
                COUNT(*) as total_servicios,
                COUNT(*) FILTER (WHERE activo = true) as servicios_activos,
                COUNT(*) FILTER (WHERE activo = false) as servicios_inactivos
            FROM servicios
        `;

        try {
            const result = await query(sql);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }
}

module.exports = Servicio;