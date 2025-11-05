const { query } = require('../config/database');

class ShoppingCart {
    // Agregar item al carrito
    static async agregarItem(usuario_id, servicio_id, plan_id, cantidad) {
        const sql = `
            INSERT INTO shopping_cart (usuario_id, servicio_id, plan_id, cantidad)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (usuario_id, servicio_id, plan_id)
            DO UPDATE SET 
                cantidad = shopping_cart.cantidad + $4,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        try {
            const result = await query(sql, [usuario_id, servicio_id, plan_id, cantidad]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error agregando item al carrito: ${error.message}`);
        }
    }

    // Obtener carrito de usuario con detalles
    static async obtenerPorUsuario(usuario_id) {
        const sql = `
            SELECT sc.*, 
                   s.id as servicio_id, s.nombre as servicio_nombre, s.categoria, s.imagen_url,
                   sp.id as plan_id, sp.nombre_plan, sp.duracion_meses, sp.precio_venta
            FROM shopping_cart sc
            JOIN servicios s ON sc.servicio_id = s.id
            JOIN service_plans sp ON sc.plan_id = sp.id
            WHERE sc.usuario_id = $1 AND s.activo = true AND sp.activo = true
            ORDER BY sc.created_at
        `;

        try {
            const result = await query(sql, [usuario_id]);
            
            return result.rows.map(row => ({
                id: row.id,
                usuario_id: row.usuario_id,
                servicio_id: row.servicio_id,
                plan_id: row.plan_id,
                cantidad: row.cantidad,
                created_at: row.created_at,
                updated_at: row.updated_at,
                servicio: {
                    id: row.servicio_id,
                    nombre: row.servicio_nombre,
                    categoria: row.categoria,
                    imagen_url: row.imagen_url
                },
                plan: {
                    id: row.plan_id,
                    nombre_plan: row.nombre_plan,
                    duracion_meses: row.duracion_meses,
                    precio_venta: parseFloat(row.precio_venta)
                },
                subtotal: row.cantidad * parseFloat(row.precio_venta)
            }));
        } catch (error) {
            throw new Error(`Error obteniendo carrito: ${error.message}`);
        }
    }

    // Buscar item por ID
    static async buscarPorId(item_id) {
        const sql = `
            SELECT sc.*, 
                   s.id as servicio_id, s.nombre as servicio_nombre, s.categoria,
                   sp.id as plan_id, sp.nombre_plan, sp.duracion_meses, sp.precio_venta
            FROM shopping_cart sc
            JOIN servicios s ON sc.servicio_id = s.id
            JOIN service_plans sp ON sc.plan_id = sp.id
            WHERE sc.id = $1
        `;

        try {
            const result = await query(sql, [item_id]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                id: row.id,
                usuario_id: row.usuario_id,
                servicio_id: row.servicio_id,
                plan_id: row.plan_id,
                cantidad: row.cantidad,
                created_at: row.created_at,
                updated_at: row.updated_at,
                servicio: {
                    id: row.servicio_id,
                    nombre: row.servicio_nombre,
                    categoria: row.categoria
                },
                plan: {
                    id: row.plan_id,
                    nombre_plan: row.nombre_plan,
                    duracion_meses: row.duracion_meses,
                    precio_venta: parseFloat(row.precio_venta)
                }
            };
        } catch (error) {
            throw new Error(`Error buscando item: ${error.message}`);
        }
    }

    // Actualizar cantidad
    static async actualizarCantidad(item_id, nueva_cantidad) {
        const sql = `
            UPDATE shopping_cart 
            SET cantidad = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        try {
            const result = await query(sql, [nueva_cantidad, item_id]);
            
            if (result.rows.length === 0) {
                throw new Error('Item no encontrado');
            }

            return result.rows[0];
        } catch (error) {
            throw new Error(`Error actualizando cantidad: ${error.message}`);
        }
    }

    // Eliminar item
    static async eliminarItem(item_id) {
        const sql = `DELETE FROM shopping_cart WHERE id = $1`;

        try {
            const result = await query(sql, [item_id]);
            
            if (result.rowCount === 0) {
                throw new Error('Item no encontrado');
            }

            return { mensaje: 'Item eliminado exitosamente' };
        } catch (error) {
            throw new Error(`Error eliminando item: ${error.message}`);
        }
    }

    // Limpiar carrito completo
    static async limpiarCarrito(usuario_id) {
        const sql = `DELETE FROM shopping_cart WHERE usuario_id = $1`;

        try {
            const result = await query(sql, [usuario_id]);
            return { 
                mensaje: 'Carrito limpiado exitosamente',
                items_eliminados: result.rowCount 
            };
        } catch (error) {
            throw new Error(`Error limpiando carrito: ${error.message}`);
        }
    }

    // Contar items en carrito
    static async contarItems(usuario_id) {
        const sql = `
            SELECT 
                COUNT(*) as total_items,
                COUNT(DISTINCT servicio_id) as total_servicios
            FROM shopping_cart 
            WHERE usuario_id = $1
        `;

        try {
            const result = await query(sql, [usuario_id]);
            return {
                total_items: parseInt(result.rows[0].total_items),
                total_servicios: parseInt(result.rows[0].total_servicios)
            };
        } catch (error) {
            throw new Error(`Error contando items: ${error.message}`);
        }
    }

    // Obtener suma total del carrito
    static async obtenerTotal(usuario_id) {
        const sql = `
            SELECT 
                SUM(sc.cantidad * sp.precio_venta) as total,
                SUM(sc.cantidad) as total_items
            FROM shopping_cart sc
            JOIN service_plans sp ON sc.plan_id = sp.id
            WHERE sc.usuario_id = $1 AND sp.activo = true
        `;

        try {
            const result = await query(sql, [usuario_id]);
            const row = result.rows[0];
            
            return {
                total: parseFloat(row.total || 0),
                total_items: parseInt(row.total_items || 0)
            };
        } catch (error) {
            throw new Error(`Error calculando total: ${error.message}`);
        }
    }

    // Verificar si un servicio ya está en el carrito
    static async existeServicio(usuario_id, servicio_id) {
        const sql = `SELECT id, cantidad FROM shopping_cart WHERE usuario_id = $1 AND servicio_id = $2`;

        try {
            const result = await query(sql, [usuario_id, servicio_id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            throw new Error(`Error verificando servicio en carrito: ${error.message}`);
        }
    }

    // Obtener items del carrito para crear orden
    static async obtenerItemsParaOrden(usuario_id) {
        const sql = `
            SELECT sc.*, sp.precio_venta
            FROM shopping_cart sc
            JOIN service_plans sp ON sc.plan_id = sp.id
            WHERE sc.usuario_id = $1 AND sp.activo = true
        `;

        try {
            const result = await query(sql, [usuario_id]);
            return result.rows;
        } catch (error) {
            throw new Error(`Error obteniendo items para orden: ${error.message}`);
        }
    }

    // Migrar items del carrito a una orden
    static async migrarItemsAOrden(usuario_id, orden_id) {
        const client = await require('../config/database').getClient();
        
        try {
            await client.query('BEGIN');

            // Obtener items del carrito
            const carritoItems = await this.obtenerItemsParaOrden(usuario_id);

            if (carritoItems.length === 0) {
                throw new Error('No hay items en el carrito');
            }

            // Crear items de orden
            for (const item of carritoItems) {
                await client.query(`
                    INSERT INTO order_items (
                        orden_id, servicio_id, plan_id, cantidad, precio_unitario
                    ) VALUES ($1, $2, $3, $4, $5)
                `, [orden_id, item.servicio_id, item.plan_id, item.cantidad, item.precio_venta]);
            }

            // Limpiar carrito
            await client.query('DELETE FROM shopping_cart WHERE usuario_id = $1', [usuario_id]);

            await client.query('COMMIT');
            
            return {
                mensaje: 'Items migrados a orden exitosamente',
                items_migrados: carritoItems.length
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Error migrando items: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // Obtener estadísticas del carrito
    static async obtenerEstadisticas() {
        const sql = `
            SELECT 
                COUNT(DISTINCT usuario_id) as usuarios_con_carrito,
                SUM(cantidad) as total_items,
                SUM(cantidad * sp.precio_venta) as valor_total
            FROM shopping_cart sc
            JOIN service_plans sp ON sc.plan_id = sp.id
            WHERE sp.activo = true
        `;

        try {
            const result = await query(sql);
            return {
                usuarios_con_carrito: parseInt(result.rows[0].usuarios_con_carrito || 0),
                total_items: parseInt(result.rows[0].total_items || 0),
                valor_total: parseFloat(result.rows[0].valor_total || 0)
            };
        } catch (error) {
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }

    // Obtener carrito de múltiples usuarios (admin)
    static async listarCarritosAdmin(filtros = {}) {
        let sql = `
            SELECT sc.*, 
                   u.telefono as usuario_telefono, u.nombre as usuario_nombre,
                   s.nombre as servicio_nombre,
                   sp.nombre_plan, sp.precio_venta
            FROM shopping_cart sc
            JOIN usuarios u ON sc.usuario_id = u.id
            JOIN servicios s ON sc.servicio_id = s.id
            JOIN service_plans sp ON sc.plan_id = sp.id
        `;

        const condiciones = [];
        const valores = [];
        let paramIndex = 1;

        if (filtros.usuario_id) {
            condiciones.push(`sc.usuario_id = $${paramIndex}`);
            valores.push(filtros.usuario_id);
            paramIndex++;
        }

        if (filtros.servicio_id) {
            condiciones.push(`sc.servicio_id = $${paramIndex}`);
            valores.push(filtros.servicio_id);
            paramIndex++;
        }

        if (condiciones.length > 0) {
            sql += ` WHERE ${condiciones.join(' AND ')}`;
        }

        sql += ` ORDER BY sc.created_at DESC`;

        if (filtros.limit) {
            sql += ` LIMIT $${paramIndex}`;
            valores.push(parseInt(filtros.limit));
        }

        if (filtros.offset) {
            sql += ` OFFSET $${paramIndex + 1}`;
            valores.push(parseInt(filtros.offset));
        }

        try {
            const result = await query(sql, valores);
            return result.rows;
        } catch (error) {
            throw new Error(`Error listando carritos: ${error.message}`);
        }
    }

    // Limpiar carritos abandonados (items más viejos que X días)
    static async limpiarAbandonados(dias = 30) {
        const sql = `
            DELETE FROM shopping_cart 
            WHERE created_at < CURRENT_DATE - INTERVAL '${dias} days'
        `;

        try {
            const result = await query(sql);
            return {
                mensaje: `Carritos abandonados limpiados`,
                items_eliminados: result.rowCount
            };
        } catch (error) {
            throw new Error(`Error limpiando carritos abandonados: ${error.message}`);
        }
    }
}

module.exports = ShoppingCart;