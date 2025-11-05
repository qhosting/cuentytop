const SpeiService = require('../services/speiService');
const NotificationService = require('../services/notificationService');

class SpeiController {
    // Crear transacción SPEI para una orden
    static async createTransaction(req, res) {
        try {
            const { ordenId } = req.body;
            
            if (!ordenId) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'El ID de la orden es requerido'
                });
            }
            
            // Crear transacción SPEI
            const transaction = await SpeiService.createTransaction(ordenId);
            
            // Enviar notificación con instrucciones de pago
            try {
                await NotificationService.sendPaymentPending(ordenId, {
                    banco: transaction.banco,
                    clabe: transaction.clabe,
                    titular: transaction.titular,
                    referencia: transaction.referencia_spei,
                    concepto: transaction.concepto
                });
            } catch (notifError) {
                console.error('Error enviando notificación:', notifError);
            }
            
            res.json({
                success: true,
                mensaje: 'Transacción SPEI creada exitosamente',
                data: transaction
            });
        } catch (error) {
            console.error('Error en createTransaction:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error creando transacción SPEI',
                error: error.message
            });
        }
    }
    
    // Obtener transacción por referencia
    static async getByReference(req, res) {
        try {
            const { referencia } = req.params;
            
            const transaction = await SpeiService.getByReference(referencia);
            
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Transacción no encontrada'
                });
            }
            
            res.json({
                success: true,
                data: transaction
            });
        } catch (error) {
            console.error('Error en getByReference:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo transacción',
                error: error.message
            });
        }
    }
    
    // Obtener transacción por orden
    static async getByOrderId(req, res) {
        try {
            const { ordenId } = req.params;
            
            const transaction = await SpeiService.getByOrderId(ordenId);
            
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Transacción no encontrada'
                });
            }
            
            res.json({
                success: true,
                data: transaction
            });
        } catch (error) {
            console.error('Error en getByOrderId:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo transacción',
                error: error.message
            });
        }
    }
    
    // Confirmar pago manualmente (admin)
    static async confirmPayment(req, res) {
        try {
            const { referencia } = req.params;
            const webhookData = req.body || {};
            
            const result = await SpeiService.confirmPayment(referencia, webhookData);
            
            // Enviar notificación de pago recibido
            try {
                await NotificationService.sendPaymentReceived(result.orden.id);
            } catch (notifError) {
                console.error('Error enviando notificación:', notifError);
            }
            
            res.json({
                success: true,
                mensaje: 'Pago confirmado exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error en confirmPayment:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error confirmando pago',
                error: error.message
            });
        }
    }
    
    // Webhook para confirmación automática de pago
    static async webhook(req, res) {
        try {
            const payload = req.body;
            const ipOrigen = req.ip;
            const userAgent = req.get('User-Agent');
            
            // Extraer referencia del payload (ajustar según proveedor)
            const referencia = payload.referencia || payload.reference || payload.order_id;
            
            if (!referencia) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Referencia no encontrada en el webhook'
                });
            }
            
            // Registrar webhook
            const webhook = await SpeiService.registerWebhook(
                referencia,
                payload.evento || payload.event || 'payment.notification',
                payload,
                ipOrigen,
                userAgent
            );
            
            // Procesar webhook en segundo plano
            SpeiService.processWebhook(webhook.id)
                .then(() => console.log(`Webhook ${webhook.id} procesado exitosamente`))
                .catch(error => console.error(`Error procesando webhook ${webhook.id}:`, error));
            
            // Responder inmediatamente al proveedor
            res.json({
                success: true,
                mensaje: 'Webhook recibido',
                webhookId: webhook.id
            });
        } catch (error) {
            console.error('Error en webhook:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error procesando webhook',
                error: error.message
            });
        }
    }
    
    // Cancelar transacción
    static async cancelTransaction(req, res) {
        try {
            const { referencia } = req.params;
            const { motivo } = req.body;
            
            await SpeiService.cancelTransaction(referencia, motivo);
            
            res.json({
                success: true,
                mensaje: 'Transacción cancelada exitosamente'
            });
        } catch (error) {
            console.error('Error en cancelTransaction:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error cancelando transacción',
                error: error.message
            });
        }
    }
    
    // Obtener estadísticas SPEI
    static async getStatistics(req, res) {
        try {
            const { fecha_inicio, fecha_fin } = req.query;
            
            const stats = await SpeiService.getStatistics(fecha_inicio, fecha_fin);
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error en getStatistics:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo estadísticas',
                error: error.message
            });
        }
    }
    
    // Listar transacciones con filtros
    static async list(req, res) {
        try {
            const filters = {
                estado: req.query.estado,
                fecha_inicio: req.query.fecha_inicio,
                fecha_fin: req.query.fecha_fin,
                referencia: req.query.referencia,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };
            
            const transactions = await SpeiService.list(filters);
            
            res.json({
                success: true,
                data: transactions,
                filters
            });
        } catch (error) {
            console.error('Error en list:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error listando transacciones',
                error: error.message
            });
        }
    }
}

module.exports = SpeiController;
