const ServicePlan = require('../models/ServicePlan');

class PlanController {
    // Obtener todos los planes activos (público)
    static async obtenerActivos(req, res) {
        try {
            const planes = await ServicePlan.obtenerActivos();
            res.json({
                success: true,
                datos: planes
            });
        } catch (error) {
            console.error('Error en obtenerActivos:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo catálogo de planes'
            });
        }
    }

    // Obtener planes activos de un servicio (público)
    static async obtenerPorServicio(req, res) {
        try {
            const { servicio_id } = req.params;
            const planes = await ServicePlan.obtenerPorServicio(servicio_id);
            res.json({
                success: true,
                datos: planes
            });
        } catch (error) {
            console.error('Error en obtenerPorServicio:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo planes del servicio'
            });
        }
    }

    // Buscar plan por ID
    static async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const plan = await ServicePlan.buscarPorId(id);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Plan no encontrado'
                });
            }
            res.json({
                success: true,
                datos: plan
            });
        } catch (error) {
            console.error('Error en buscarPorId:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Crear nuevo plan (admin)
    static async crear(req, res) {
        try {
            const { servicio_id, duracion_meses, nombre_plan, costo, margen, orden } = req.body;
            if (!servicio_id || !duracion_meses || !nombre_plan || costo === undefined || margen === undefined) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Todos los campos son obligatorios'
                });
            }

            const plan = await ServicePlan.crear({ servicio_id, duracion_meses, nombre_plan, costo, margen, orden });
            res.status(201).json({
                success: true,
                mensaje: 'Plan creado con éxito',
                datos: plan
            });
        } catch (error) {
            console.error('Error en crear plan:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno al crear plan',
                error: error.message
            });
        }
    }

    // Actualizar plan (admin)
    static async actualizar(req, res) {
        try {
            const { id } = req.params;
            const { nombre_plan, costo, margen, activo, orden } = req.body;

            const plan = await ServicePlan.actualizar(id, { nombre_plan, costo, margen, activo, orden });
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Plan no encontrado'
                });
            }

            res.json({
                success: true,
                mensaje: 'Plan actualizado con éxito',
                datos: plan
            });
        } catch (error) {
            console.error('Error en actualizar plan:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno al actualizar plan',
                error: error.message
            });
        }
    }

    // Eliminar plan (admin)
    static async eliminar(req, res) {
        try {
            const { id } = req.params;
            const plan = await ServicePlan.eliminar(id);
            res.json({
                success: true,
                mensaje: 'Plan eliminado con éxito',
                datos: plan
            });
        } catch (error) {
            console.error('Error en eliminar plan:', error);
            res.status(400).json({
                success: false,
                mensaje: error.message
            });
        }
    }
}

module.exports = PlanController;
