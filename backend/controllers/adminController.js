const pool = require('../config/database').pool;
const ChatwootService = require('../services/chatwootService');
const SpeiService = require('../services/speiService');
const NotificationService = require('../services/notificationService');

class AdminController {
    // Dashboard con estadísticas principales
    static async getDashboard(req, res) {
        try {
            const { fecha_inicio, fecha_fin } = req.query;
            
            // Estadísticas de órdenes
            let ordenesQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE estado = 'pending') as pendientes,
                    COUNT(*) FILTER (WHERE estado = 'pending_payment') as pago_pendiente,
                    COUNT(*) FILTER (WHERE estado = 'paid') as pagadas,
                    COUNT(*) FILTER (WHERE estado = 'processing') as procesando,
                    COUNT(*) FILTER (WHERE estado = 'delivered') as entregadas,
                    COUNT(*) FILTER (WHERE estado = 'cancelled') as canceladas,
                    SUM(total) FILTER (WHERE estado IN ('paid', 'processing', 'delivered')) as ingresos_confirmados,
                    SUM(total) FILTER (WHERE estado = 'pending_payment') as ingresos_pendientes,
                    AVG(total) as ticket_promedio
                FROM ordenes
                WHERE 1=1
            `;
            
            const params = [];
            
            if (fecha_inicio) {
                params.push(fecha_inicio);
                ordenesQuery += ` AND created_at >= $${params.length}`;
            }
            
            if (fecha_fin) {
                params.push(fecha_fin);
                ordenesQuery += ` AND created_at <= $${params.length}`;
            }
            
            const ordenesStats = await pool.query(ordenesQuery, params);
            
            // Estadísticas de usuarios
            const usuariosStats = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE verified = TRUE) as verificados,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as nuevos_mes
                FROM usuarios
            `);
            
            // Estadísticas SPEI
            const speiStats = await SpeiService.getStatistics(fecha_inicio, fecha_fin);
            
            // Servicios más vendidos
            const serviciosPopulares = await pool.query(`
                SELECT 
                    s.nombre,
                    COUNT(oi.id) as ventas,
                    SUM(oi.subtotal) as ingresos
                FROM order_items oi
                JOIN servicios s ON oi.servicio_id = s.id
                JOIN ordenes o ON oi.orden_id = o.id
                WHERE o.estado IN ('paid', 'processing', 'delivered')
                ${fecha_inicio ? `AND o.created_at >= $1` : ''}
                ${fecha_fin ? `AND o.created_at <= $${fecha_inicio ? '2' : '1'}` : ''}
                GROUP BY s.id, s.nombre
                ORDER BY ventas DESC
                LIMIT 5
            `, fecha_inicio && fecha_fin ? [fecha_inicio, fecha_fin] : fecha_inicio ? [fecha_inicio] : fecha_fin ? [fecha_fin] : []);
            
            // Últimas órdenes
            const ultimasOrdenes = await pool.query(`
                SELECT 
                    o.id,
                    o.numero_orden,
                    o.total,
                    o.estado,
                    o.created_at,
                    u.nombre as usuario_nombre,
                    u.telefono as usuario_telefono
                FROM ordenes o
                JOIN usuarios u ON o.usuario_id = u.id
                ORDER BY o.created_at DESC
                LIMIT 10
            `);
            
            // Notificaciones pendientes
            const notificacionesPendientes = await pool.query(`
                SELECT COUNT(*) as total
                FROM notifications
                WHERE estado IN ('pending', 'failed')
            `);
            
            res.json({
                success: true,
                data: {
                    ordenes: ordenesStats.rows[0],
                    usuarios: usuariosStats.rows[0],
                    spei: speiStats,
                    servicios_populares: serviciosPopulares.rows,
                    ultimas_ordenes: ultimasOrdenes.rows,
                    notificaciones_pendientes: notificacionesPendientes.rows[0].total
                }
            });
        } catch (error) {
            console.error('Error en getDashboard:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo dashboard',
                error: error.message
            });
        }
    }
    
    // Listar todos los usuarios con filtros
    static async getUsuarios(req, res) {
        try {
            const { verified, search, limit = 50, offset = 0 } = req.query;
            
            let query = `
                SELECT 
                    u.*,
                    COUNT(DISTINCT o.id) as total_ordenes,
                    SUM(o.total) FILTER (WHERE o.estado IN ('paid', 'processing', 'delivered')) as total_gastado
                FROM usuarios u
                LEFT JOIN ordenes o ON u.id = o.usuario_id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (verified !== undefined) {
                params.push(verified === 'true');
                query += ` AND u.verified = $${params.length}`;
            }
            
            if (search) {
                params.push(`%${search}%`);
                query += ` AND (u.nombre ILIKE $${params.length} OR u.telefono ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
            }
            
            query += ` GROUP BY u.id ORDER BY u.created_at DESC`;
            
            params.push(limit);
            query += ` LIMIT $${params.length}`;
            
            params.push(offset);
            query += ` OFFSET $${params.length}`;
            
            const result = await pool.query(query, params);
            
            // Contar total
            const countQuery = query.split('GROUP BY')[0].replace('SELECT u.*, COUNT(DISTINCT o.id) as total_ordenes, SUM(o.total) FILTER (WHERE o.estado IN (\'paid\', \'processing\', \'delivered\')) as total_gastado', 'SELECT COUNT(DISTINCT u.id)');
            const countResult = await pool.query(countQuery, params.slice(0, -2));
            
            res.json({
                success: true,
                data: result.rows,
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        } catch (error) {
            console.error('Error en getUsuarios:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo usuarios',
                error: error.message
            });
        }
    }
    
    // Obtener detalles de un usuario
    static async getUsuarioDetalle(req, res) {
        try {
            const { id } = req.params;
            
            // Información del usuario
            const usuarioResult = await pool.query(
                'SELECT * FROM usuarios WHERE id = $1',
                [id]
            );
            
            if (usuarioResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Usuario no encontrado'
                });
            }
            
            const usuario = usuarioResult.rows[0];
            
            // Órdenes del usuario
            const ordenesResult = await pool.query(`
                SELECT *
                FROM ordenes
                WHERE usuario_id = $1
                ORDER BY created_at DESC
            `, [id]);
            
            // Estadísticas
            const statsResult = await pool.query(`
                SELECT 
                    COUNT(*) as total_ordenes,
                    SUM(total) FILTER (WHERE estado IN ('paid', 'processing', 'delivered')) as total_gastado,
                    AVG(total) as ticket_promedio
                FROM ordenes
                WHERE usuario_id = $1
            `, [id]);
            
            res.json({
                success: true,
                data: {
                    usuario,
                    ordenes: ordenesResult.rows,
                    estadisticas: statsResult.rows[0]
                }
            });
        } catch (error) {
            console.error('Error en getUsuarioDetalle:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo detalles del usuario',
                error: error.message
            });
        }
    }
    
    // Actualizar usuario
    static async updateUsuario(req, res) {
        try {
            const { id } = req.params;
            const { nombre, email, delivery_preference } = req.body;
            
            const result = await pool.query(`
                UPDATE usuarios
                SET nombre = COALESCE($1, nombre),
                    email = COALESCE($2, email),
                    delivery_preference = COALESCE($3, delivery_preference),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `, [nombre, email, delivery_preference, id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Usuario no encontrado'
                });
            }
            
            res.json({
                success: true,
                mensaje: 'Usuario actualizado exitosamente',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error en updateUsuario:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error actualizando usuario',
                error: error.message
            });
        }
    }
    
    // Obtener configuración de Chatwoot
    static async getChatwootConfig(req, res) {
        try {
            const config = await ChatwootService.getWidgetConfig();
            
            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('Error en getChatwootConfig:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo configuración de Chatwoot',
                error: error.message
            });
        }
    }
    
    // Configurar Chatwoot
    static async configureChatwoot(req, res) {
        try {
            const { website_token, api_access_token, account_id, inbox_id, base_url } = req.body;
            
            if (!website_token) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'El website token es requerido'
                });
            }
            
            await ChatwootService.configureService(
                website_token,
                api_access_token,
                account_id,
                inbox_id,
                base_url || 'https://app.chatwoot.com'
            );
            
            res.json({
                success: true,
                mensaje: 'Chatwoot configurado exitosamente'
            });
        } catch (error) {
            console.error('Error en configureChatwoot:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error configurando Chatwoot',
                error: error.message
            });
        }
    }
    
    // Obtener reportes
    static async getReportes(req, res) {
        try {
            const { tipo, fecha_inicio, fecha_fin } = req.query;
            
            let data;
            
            switch (tipo) {
                case 'ventas':
                    data = await AdminController.getReporteVentas(fecha_inicio, fecha_fin);
                    break;
                    
                case 'usuarios':
                    data = await AdminController.getReporteUsuarios(fecha_inicio, fecha_fin);
                    break;
                    
                case 'servicios':
                    data = await AdminController.getReporteServicios(fecha_inicio, fecha_fin);
                    break;
                    
                default:
                    return res.status(400).json({
                        success: false,
                        mensaje: 'Tipo de reporte no válido'
                    });
            }
            
            res.json({
                success: true,
                tipo,
                data
            });
        } catch (error) {
            console.error('Error en getReportes:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error generando reporte',
                error: error.message
            });
        }
    }
    
    // Reporte de ventas
    static async getReporteVentas(fechaInicio, fechaFin) {
        const params = [];
        let whereClause = 'WHERE 1=1';
        
        if (fechaInicio) {
            params.push(fechaInicio);
            whereClause += ` AND created_at >= $${params.length}`;
        }
        
        if (fechaFin) {
            params.push(fechaFin);
            whereClause += ` AND created_at <= $${params.length}`;
        }
        
        const result = await pool.query(`
            SELECT 
                DATE(created_at) as fecha,
                COUNT(*) as total_ordenes,
                SUM(total) as ingresos,
                AVG(total) as ticket_promedio,
                COUNT(*) FILTER (WHERE estado = 'delivered') as entregadas,
                COUNT(*) FILTER (WHERE estado = 'cancelled') as canceladas
            FROM ordenes
            ${whereClause}
            GROUP BY DATE(created_at)
            ORDER BY fecha DESC
        `, params);
        
        return result.rows;
    }
    
    // Reporte de usuarios
    static async getReporteUsuarios(fechaInicio, fechaFin) {
        const params = [];
        let whereClause = 'WHERE 1=1';
        
        if (fechaInicio) {
            params.push(fechaInicio);
            whereClause += ` AND created_at >= $${params.length}`;
        }
        
        if (fechaFin) {
            params.push(fechaFin);
            whereClause += ` AND created_at <= $${params.length}`;
        }
        
        const result = await pool.query(`
            SELECT 
                DATE(created_at) as fecha,
                COUNT(*) as nuevos_usuarios,
                COUNT(*) FILTER (WHERE verified = TRUE) as verificados
            FROM usuarios
            ${whereClause}
            GROUP BY DATE(created_at)
            ORDER BY fecha DESC
        `, params);
        
        return result.rows;
    }
    
    // Reporte de servicios
    static async getReporteServicios(fechaInicio, fechaFin) {
        const params = [];
        let whereClause = 'WHERE o.estado IN (\'paid\', \'processing\', \'delivered\')';
        
        if (fechaInicio) {
            params.push(fechaInicio);
            whereClause += ` AND o.created_at >= $${params.length}`;
        }
        
        if (fechaFin) {
            params.push(fechaFin);
            whereClause += ` AND o.created_at <= $${params.length}`;
        }
        
        const result = await pool.query(`
            SELECT 
                s.nombre as servicio,
                sp.nombre_plan as plan,
                COUNT(oi.id) as ventas,
                SUM(oi.subtotal) as ingresos,
                AVG(oi.precio_unitario) as precio_promedio
            FROM order_items oi
            JOIN servicios s ON oi.servicio_id = s.id
            JOIN service_plans sp ON oi.plan_id = sp.id
            JOIN ordenes o ON oi.orden_id = o.id
            ${whereClause}
            GROUP BY s.id, s.nombre, sp.id, sp.nombre_plan
            ORDER BY ventas DESC
        `, params);
        
        return result.rows;
    }
}

module.exports = AdminController;
