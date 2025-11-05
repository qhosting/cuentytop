const ShoppingCart = require('../models/ShoppingCart');
const Servicio = require('../models/Servicio');
const ServicePlan = require('../models/ServicePlan');

class CartController {
    // Obtener carrito del usuario
    static async obtenerCarrito(req, res) {
        try {
            const userId = req.user.userId;

            const carrito = await ShoppingCart.obtenerPorUsuario(userId);

            // Calcular totales
            const total = carrito.reduce((sum, item) => sum + (item.subtotal || 0), 0);

            res.json({
                success: true,
                carrito: carrito.map(item => ({
                    id: item.id,
                    servicio: {
                        id: item.servicio.id,
                        nombre: item.servicio.nombre,
                        categoria: item.servicio.categoria,
                        imagen_url: item.servicio.imagen_url
                    },
                    plan: {
                        id: item.plan.id,
                        nombre_plan: item.plan.nombre_plan,
                        duracion_meses: item.plan.duracion_meses,
                        precio_venta: item.plan.precio_venta
                    },
                    cantidad: item.cantidad,
                    subtotal: item.cantidad * item.plan.precio_venta,
                    created_at: item.created_at
                })),
                total,
                total_items: carrito.reduce((sum, item) => sum + item.cantidad, 0)
            });

        } catch (error) {
            console.error('Error obteniendo carrito:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Agregar item al carrito
    static async agregarItem(req, res) {
        try {
            const userId = req.user.userId;
            const { servicio_id, plan_id, cantidad = 1 } = req.body;

            // Validaciones
            if (!servicio_id || !plan_id) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de servicio y plan son requeridos'
                });
            }

            if (cantidad < 1 || cantidad > 10) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'La cantidad debe estar entre 1 y 10'
                });
            }

            // Verificar que el servicio y plan existan y estén activos
            const servicio = await Servicio.buscarPorId(servicio_id);
            if (!servicio || !servicio.activo) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Servicio no disponible'
                });
            }

            const plan = await ServicePlan.buscarPorId(plan_id);
            if (!plan || !plan.activo || plan.servicio_id !== servicio_id) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Plan no disponible para este servicio'
                });
            }

            // Verificar disponibilidad
            const disponibilidad = await ServicePlan.verificarDisponibilidad(plan_id, cantidad);
            if (!disponible.suficiente) {
                return res.status(400).json({
                    success: false,
                    mensaje: `No hay suficiente inventario. Disponible: ${disponible.disponible}`,
                    disponible: disponible.disponible,
                    requerido: cantidad
                });
            }

            // Agregar al carrito
            const carritoItem = await ShoppingCart.agregarItem(userId, servicio_id, plan_id, cantidad);

            res.json({
                success: true,
                mensaje: 'Item agregado al carrito',
                item: {
                    id: carritoItem.id,
                    servicio: {
                        id: servicio.id,
                        nombre: servicio.nombre,
                        categoria: servicio.categoria
                    },
                    plan: {
                        id: plan.id,
                        nombre_plan: plan.nombre_plan,
                        duracion_meses: plan.duracion_meses,
                        precio_venta: plan.precio_venta
                    },
                    cantidad: carritoItem.cantidad,
                    subtotal: carritoItem.cantidad * plan.precio_venta
                }
            });

        } catch (error) {
            console.error('Error agregando item al carrito:', error);
            
            if (error.message.includes('único')) {
                res.status(400).json({
                    success: false,
                    mensaje: 'Este item ya está en tu carrito. Actualiza la cantidad en lugar de agregarlo de nuevo.'
                });
            } else {
                res.status(500).json({
                    success: false,
                    mensaje: 'Error interno del servidor'
                });
            }
        }
    }

    // Actualizar cantidad de item en el carrito
    static async actualizarItem(req, res) {
        try {
            const userId = req.user.userId;
            const { item_id } = req.params;
            const { cantidad } = req.body;

            if (!cantidad || cantidad < 0 || cantidad > 10) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'La cantidad debe estar entre 0 y 10'
                });
            }

            // Si cantidad es 0, eliminar item
            if (cantidad === 0) {
                return await CartController.eliminarItem(req, res);
            }

            // Obtener item del carrito
            const item = await ShoppingCart.buscarPorId(item_id);
            if (!item || item.usuario_id !== userId) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Item no encontrado en tu carrito'
                });
            }

            // Verificar disponibilidad para la nueva cantidad
            const diferenciaCantidad = cantidad - item.cantidad;
            if (diferenciaCantidad > 0) {
                const disponibilidad = await ServicePlan.verificarDisponibilidad(item.plan_id, diferenciaCantidad);
                if (!disponibilidad.suficiente) {
                    return res.status(400).json({
                        success: false,
                        mensaje: `No hay suficiente inventario. Disponible: ${disponibilidad.disponible}`,
                        disponible: disponibilidad.disponible,
                        requerido: cantidad
                    });
                }
            }

            // Actualizar cantidad
            const itemActualizado = await ShoppingCart.actualizarCantidad(item_id, cantidad);

            res.json({
                success: true,
                mensaje: 'Cantidad actualizada',
                item: {
                    id: itemActualizado.id,
                    cantidad: itemActualizado.cantidad,
                    subtotal: itemActualizado.cantidad * item.plan.precio_venta
                }
            });

        } catch (error) {
            console.error('Error actualizando item del carrito:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Eliminar item del carrito
    static async eliminarItem(req, res) {
        try {
            const userId = req.user.userId;
            const { item_id } = req.params;

            // Verificar que el item pertenece al usuario
            const item = await ShoppingCart.buscarPorId(item_id);
            if (!item || item.usuario_id !== userId) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Item no encontrado en tu carrito'
                });
            }

            // Eliminar item
            await ShoppingCart.eliminarItem(item_id);

            res.json({
                success: true,
                mensaje: 'Item eliminado del carrito'
            });

        } catch (error) {
            console.error('Error eliminando item del carrito:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Limpiar carrito completo
    static async limpiarCarrito(req, res) {
        try {
            const userId = req.user.userId;

            await ShoppingCart.limpiarCarrito(userId);

            res.json({
                success: true,
                mensaje: 'Carrito limpiado exitosamente'
            });

        } catch (error) {
            console.error('Error limpiando carrito:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Verificar disponibilidad de items en carrito
    static async verificarDisponibilidad(req, res) {
        try {
            const userId = req.user.userId;
            const carrito = await ShoppingCart.obtenerPorUsuario(userId);

            const disponibilidad = [];
            let disponibleTotal = true;

            for (const item of carrito) {
                const disp = await ServicePlan.verificarDisponibilidad(item.plan_id, item.cantidad);
                
                disponibilidad.push({
                    item_id: item.id,
                    servicio: item.servicio.nombre,
                    plan: item.plan.nombre_plan,
                    solicitado: item.cantidad,
                    disponible: disp.disponible,
                    suficiente: disp.suficiente,
                    faltante: disp.faltante
                });

                if (!disp.suficiente) {
                    disponibleTotal = false;
                }
            }

            res.json({
                success: true,
                disponible: disponibleTotal,
                disponibilidad,
                resumen: {
                    total_items: carrito.length,
                    items_con_stock: disponibilidad.filter(d => d.suficiente).length,
                    items_sin_stock: disponibilidad.filter(d => !d.suficiente).length
                }
            });

        } catch (error) {
            console.error('Error verificando disponibilidad:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Contar items en carrito
    static async contarItems(req, res) {
        try {
            const userId = req.user.userId;
            const conteo = await ShoppingCart.contarItems(userId);

            res.json({
                success: true,
                total_items: conteo.total_items,
                total_servicios: conteo.total_servicios
            });

        } catch (error) {
            console.error('Error contando items:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Obtener resumen del carrito
    static async obtenerResumen(req, res) {
        try {
            const userId = req.user.userId;
            const carrito = await ShoppingCart.obtenerPorUsuario(userId);

            // Agrupar por servicio
            const agrupado = {};
            let total = 0;
            let totalItems = 0;

            for (const item of carrito) {
                const servicioNombre = item.servicio.nombre;
                
                if (!agrupado[servicioNombre]) {
                    agrupado[servicioNombre] = {
                        servicio: item.servicio,
                        items: [],
                        total: 0,
                        total_items: 0
                    };
                }

                const subtotal = item.cantidad * item.plan.precio_venta;
                agrupado[servicioNombre].items.push({
                    plan: item.plan,
                    cantidad: item.cantidad,
                    subtotal
                });

                agrupado[servicioNombre].total += subtotal;
                agrupado[servicioNombre].total_items += item.cantidad;

                total += subtotal;
                totalItems += item.cantidad;
            }

            res.json({
                success: true,
                resumen: {
                    servicios: Object.keys(agrupado).length,
                    total_items: totalItems,
                    total: total,
                    detalle_servicios: Object.values(agrupado)
                }
            });

        } catch (error) {
            console.error('Error obteniendo resumen:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Middleware para verificar item del carrito
    static verificarItemCarrito(req, res, next) {
        // Esta función se puede usar como middleware adicional si es necesario
        next();
    }
}

module.exports = CartController;