const Servicio = require('../models/Servicio');

class ServicioController {
    // Obtener todos los servicios activos (público)
    static async obtenerActivos(req, res) {
        try {
            const servicios = await Servicio.obtenerActivos();
            res.json({
                success: true,
                datos: servicios
            });
        } catch (error) {
            console.error('Error en obtenerActivos:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo catálogo de servicios'
            });
        }
    }

    // Obtener todas las categorías (público)
    static async obtenerCategorias(req, res) {
        try {
            const categorias = await Servicio.obtenerCategorias();
            res.json({
                success: true,
                datos: categorias
            });
        } catch (error) {
            console.error('Error en obtenerCategorias:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo categorías'
            });
        }
    }

    // Buscar servicio por ID
    static async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const servicio = await Servicio.buscarPorId(id);
            if (!servicio) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Servicio no encontrado'
                });
            }
            res.json({
                success: true,
                datos: servicio
            });
        } catch (error) {
            console.error('Error en buscarPorId:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Crear nuevo servicio (admin)
    static async crear(req, res) {
        try {
            const { nombre, descripcion, imagen_url, categoria, orden } = req.body;
            if (!nombre || !categoria) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Nombre y categoría son campos obligatorios'
                });
            }

            const servicio = await Servicio.crear({ nombre, descripcion, imagen_url, categoria, orden });
            res.status(201).json({
                success: true,
                mensaje: 'Servicio creado con éxito',
                datos: servicio
            });
        } catch (error) {
            console.error('Error en crear servicio:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno al crear servicio',
                error: error.message
            });
        }
    }

    // Actualizar servicio (admin)
    static async actualizar(req, res) {
        try {
            const { id } = req.params;
            const { nombre, descripcion, imagen_url, categoria, activo, orden } = req.body;

            const servicio = await Servicio.actualizar(id, { nombre, descripcion, imagen_url, categoria, activo, orden });
            if (!servicio) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Servicio no encontrado'
                });
            }

            res.json({
                success: true,
                mensaje: 'Servicio actualizado con éxito',
                datos: servicio
            });
        } catch (error) {
            console.error('Error en actualizar servicio:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno al actualizar servicio',
                error: error.message
            });
        }
    }

    // Eliminar servicio (admin)
    static async eliminar(req, res) {
        try {
            const { id } = req.params;
            const servicio = await Servicio.eliminar(id);
            res.json({
                success: true,
                mensaje: 'Servicio eliminado con éxito',
                datos: servicio
            });
        } catch (error) {
            console.error('Error en eliminar servicio:', error);
            res.status(400).json({
                success: false,
                mensaje: error.message
            });
        }
    }
}

module.exports = ServicioController;
