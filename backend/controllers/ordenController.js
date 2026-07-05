const Orden = require('../models/Orden');
const ShoppingCart = require('../models/ShoppingCart');

class OrdenController {
    // Crear una orden a partir del carrito actual del usuario
    static async crearOrden(req, res) {
        try {
            const userId = req.user.userId;
            const { notas } = req.body;

            // 1. Obtener totales del carrito
            const cartTotal = await ShoppingCart.obtenerTotal(userId);
            if (!cartTotal || cartTotal.total_items === 0) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'No hay artículos en tu carrito de compras para crear una orden.'
                });
            }

            // 2. Crear la orden
            const orden = await Orden.crear({
                usuario_id: userId,
                total: cartTotal.total,
                notas
            });

            // 3. Migrar items del carrito a la orden
            await ShoppingCart.migrarItemsAOrden(userId, orden.id);

            res.status(201).json({
                success: true,
                mensaje: 'Orden creada exitosamente',
                orden
            });

        } catch (error) {
            console.error('Error creando orden:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno al procesar la orden',
                error: error.message
            });
        }
    }

    // Obtener todas las órdenes del usuario autenticado
    static async obtenerMisOrdenes(req, res) {
        try {
            const userId = req.user.userId;
            const ordenes = await Orden.obtenerPorUsuario(userId);

            res.json({
                success: true,
                ordenes
            });
        } catch (error) {
            console.error('Error obteniendo órdenes:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Obtener detalles completos de una orden específica
    static async obtenerDetalleOrden(req, res) {
        try {
            const userId = req.user.userId;
            const userTipo = req.user.tipo;
            const { id } = req.params;

            const orden = await Orden.obtenerDetalle(id);
            if (!orden) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Orden no encontrada'
                });
            }

            // Validar que la orden pertenezca al usuario (o sea administrador)
            if (orden.usuario_id !== userId && userTipo !== 'admin') {
                return res.status(403).json({
                    success: false,
                    mensaje: 'No tienes permiso para ver esta orden'
                });
            }

            res.json({
                success: true,
                orden
            });
        } catch (error) {
            console.error('Error obteniendo detalles de orden:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar estado de una orden (solo administrador)
    static async actualizarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            const estadosValidos = ['pending', 'pending_payment', 'paid', 'processing', 'delivered', 'cancelled'];
            if (!estado || !estadosValidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Estado inválido proporcionado'
                });
            }

            const orden = await Orden.actualizarEstado(id, estado);
            if (!orden) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Orden no encontrada'
                });
            }

            res.json({
                success: true,
                mensaje: 'Estado de la orden actualizado',
                orden
            });
        } catch (error) {
            console.error('Error actualizando estado de orden:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = OrdenController;
