const pool = require('../config/database').pool;
const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
    constructor() {
        // Configurar transporter de email
        this.emailTransporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
        // Configurar cliente Twilio
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
        }
    }
    
    // Enviar notificación
    async send(tipo, usuarioId, destinatario, variables = {}) {
        try {
            // Obtener template
            const template = await this.getTemplate(tipo);
            
            if (!template || !template.activo) {
                throw new Error(`Template no encontrado o inactivo: ${tipo}`);
            }
            
            // Obtener preferencia del usuario
            const usuario = await this.getUsuario(usuarioId);
            const canal = usuario ? (usuario.delivery_preference || 'whatsapp') : 'email';
            
            // Registrar notificación en la base de datos
            const notificationId = await this.createNotification(
                usuarioId,
                tipo,
                canal,
                destinatario,
                template.asunto,
                ''
            );
            
            try {
                let resultado;
                
                // Enviar según el canal
                switch (canal) {
                    case 'email':
                        resultado = await this.sendEmail(
                            destinatario,
                            template.asunto,
                            template.template_email,
                            variables
                        );
                        break;
                        
                    case 'sms':
                        resultado = await this.sendSMS(
                            destinatario,
                            template.template_sms,
                            variables
                        );
                        break;
                        
                    case 'whatsapp':
                        resultado = await this.sendWhatsApp(
                            destinatario,
                            template.template_whatsapp,
                            variables
                        );
                        break;
                        
                    default:
                        throw new Error(`Canal no soportado: ${canal}`);
                }
                
                // Actualizar notificación como enviada
                await this.updateNotificationStatus(
                    notificationId,
                    'sent',
                    null,
                    resultado
                );
                
                return {
                    success: true,
                    notificationId,
                    canal,
                    resultado
                };
            } catch (error) {
                // Actualizar notificación como fallida
                await this.updateNotificationStatus(
                    notificationId,
                    'failed',
                    error.message
                );
                
                throw error;
            }
        } catch (error) {
            console.error('Error enviando notificación:', error);
            throw error;
        }
    }
    
    // Enviar email
    async sendEmail(destinatario, asunto, template, variables) {
        try {
            const mensaje = this.replaceVariables(template, variables);
            
            const info = await this.emailTransporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME || 'Sistema de Suscripciones'}" <${process.env.EMAIL_USER}>`,
                to: destinatario,
                subject: asunto,
                text: mensaje,
                html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${mensaje}</pre>`
            });
            
            return {
                messageId: info.messageId,
                response: info.response
            };
        } catch (error) {
            console.error('Error enviando email:', error);
            throw new Error(`Error enviando email: ${error.message}`);
        }
    }
    
    // Enviar SMS
    async sendSMS(destinatario, template, variables) {
        try {
            if (!this.twilioClient) {
                throw new Error('Twilio no configurado');
            }
            
            const mensaje = this.replaceVariables(template, variables);
            
            // Formatear número de teléfono para México
            const telefono = this.formatPhoneNumber(destinatario);
            
            const message = await this.twilioClient.messages.create({
                body: mensaje,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: telefono
            });
            
            return {
                sid: message.sid,
                status: message.status
            };
        } catch (error) {
            console.error('Error enviando SMS:', error);
            throw new Error(`Error enviando SMS: ${error.message}`);
        }
    }
    
    // Enviar WhatsApp
    async sendWhatsApp(destinatario, template, variables) {
        try {
            if (!this.twilioClient) {
                throw new Error('Twilio no configurado');
            }
            
            const mensaje = this.replaceVariables(template, variables);
            
            // Formatear número de teléfono para México
            const telefono = this.formatPhoneNumber(destinatario);
            
            const message = await this.twilioClient.messages.create({
                body: mensaje,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${telefono}`
            });
            
            return {
                sid: message.sid,
                status: message.status
            };
        } catch (error) {
            console.error('Error enviando WhatsApp:', error);
            throw new Error(`Error enviando WhatsApp: ${error.message}`);
        }
    }
    
    // Notificación de verificación
    async sendVerification(telefono, codigo) {
        return this.send('verification', null, telefono, { codigo });
    }
    
    // Notificación de orden creada
    async sendOrderCreated(ordenId) {
        try {
            const orden = await this.getOrdenDetallada(ordenId);
            
            return this.send(
                'order_created',
                orden.usuario_id,
                orden.email || orden.telefono,
                {
                    numero_orden: orden.numero_orden,
                    total: orden.total,
                    instrucciones_pago: orden.instrucciones_pago || ''
                }
            );
        } catch (error) {
            console.error('Error enviando notificación de orden creada:', error);
            throw error;
        }
    }
    
    // Notificación de pago pendiente con datos SPEI
    async sendPaymentPending(ordenId, speiData) {
        try {
            const orden = await this.getOrdenDetallada(ordenId);
            
            return this.send(
                'payment_pending',
                orden.usuario_id,
                orden.email || orden.telefono,
                {
                    numero_orden: orden.numero_orden,
                    total: orden.total,
                    banco: speiData.banco,
                    clabe: speiData.clabe,
                    titular: speiData.titular,
                    referencia: speiData.referencia,
                    concepto: speiData.concepto
                }
            );
        } catch (error) {
            console.error('Error enviando notificación de pago pendiente:', error);
            throw error;
        }
    }
    
    // Notificación de pago recibido
    async sendPaymentReceived(ordenId) {
        try {
            const orden = await this.getOrdenDetallada(ordenId);
            const spei = await this.getSpeiByOrderId(ordenId);
            
            return this.send(
                'payment_received',
                orden.usuario_id,
                orden.email || orden.telefono,
                {
                    numero_orden: orden.numero_orden,
                    monto: spei ? spei.monto : orden.total
                }
            );
        } catch (error) {
            console.error('Error enviando notificación de pago recibido:', error);
            throw error;
        }
    }
    
    // Notificación de credenciales entregadas
    async sendCredentialsDelivered(orderItemId) {
        try {
            const item = await this.getOrderItemDetallado(orderItemId);
            const credenciales = await this.getCredenciales(orderItemId);
            
            return this.send(
                'credentials_delivered',
                item.usuario_id,
                item.email || item.telefono,
                {
                    numero_orden: item.numero_orden,
                    servicio: item.servicio_nombre,
                    plan: item.nombre_plan,
                    usuario: credenciales.email,
                    password: credenciales.password
                }
            );
        } catch (error) {
            console.error('Error enviando notificación de credenciales:', error);
            throw error;
        }
    }
    
    // Notificación de orden cancelada
    async sendOrderCancelled(ordenId, motivo = '') {
        try {
            const orden = await this.getOrdenDetallada(ordenId);
            
            return this.send(
                'order_cancelled',
                orden.usuario_id,
                orden.email || orden.telefono,
                {
                    numero_orden: orden.numero_orden,
                    motivo: motivo || 'Sin especificar'
                }
            );
        } catch (error) {
            console.error('Error enviando notificación de orden cancelada:', error);
            throw error;
        }
    }
    
    // Alerta administrativa
    async sendAdminAlert(mensaje, detalles = '') {
        try {
            const admins = await this.getAdminEmails();
            
            const promises = admins.map(admin => 
                this.send(
                    'admin_alert',
                    null,
                    admin.email,
                    {
                        mensaje,
                        detalles,
                        fecha: new Date().toLocaleString('es-MX')
                    }
                )
            );
            
            return Promise.all(promises);
        } catch (error) {
            console.error('Error enviando alerta administrativa:', error);
            throw error;
        }
    }
    
    // Utilidades
    
    replaceVariables(template, variables) {
        let mensaje = template;
        
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            mensaje = mensaje.replace(regex, value);
        }
        
        return mensaje;
    }
    
    formatPhoneNumber(telefono) {
        // Formatear teléfono para México (+52)
        let formatted = telefono.replace(/\D/g, '');
        
        if (formatted.startsWith('52')) {
            return `+${formatted}`;
        } else if (formatted.length === 10) {
            return `+52${formatted}`;
        } else {
            return `+${formatted}`;
        }
    }
    
    // Métodos de base de datos
    
    async getTemplate(tipo) {
        try {
            const result = await pool.query(
                'SELECT * FROM notification_templates WHERE tipo = $1',
                [tipo]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo template:', error);
            return null;
        }
    }
    
    async getUsuario(usuarioId) {
        if (!usuarioId) return null;
        
        try {
            const result = await pool.query(
                'SELECT * FROM usuarios WHERE id = $1',
                [usuarioId]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return null;
        }
    }
    
    async createNotification(usuarioId, tipo, canal, destinatario, asunto, mensaje) {
        try {
            const result = await pool.query(`
                INSERT INTO notifications (
                    usuario_id,
                    tipo,
                    canal,
                    destinatario,
                    asunto,
                    mensaje
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [usuarioId, tipo, canal, destinatario, asunto, mensaje]);
            
            return result.rows[0].id;
        } catch (error) {
            console.error('Error creando notificación:', error);
            throw error;
        }
    }
    
    async updateNotificationStatus(notificationId, estado, errorMensaje = null, datos = null) {
        try {
            await pool.query(`
                UPDATE notifications
                SET estado = $1,
                    error_mensaje = $2,
                    datos = $3,
                    sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
                    intentos = intentos + 1
                WHERE id = $4
            `, [estado, errorMensaje, datos ? JSON.stringify(datos) : null, notificationId]);
        } catch (error) {
            console.error('Error actualizando estado de notificación:', error);
        }
    }
    
    async getOrdenDetallada(ordenId) {
        try {
            const result = await pool.query(`
                SELECT o.*, u.nombre, u.telefono, u.email
                FROM ordenes o
                JOIN usuarios u ON o.usuario_id = u.id
                WHERE o.id = $1
            `, [ordenId]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo orden:', error);
            throw error;
        }
    }
    
    async getSpeiByOrderId(ordenId) {
        try {
            const result = await pool.query(
                'SELECT * FROM spei_transactions WHERE orden_id = $1 ORDER BY created_at DESC LIMIT 1',
                [ordenId]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo transacción SPEI:', error);
            return null;
        }
    }
    
    async getOrderItemDetallado(orderItemId) {
        try {
            const result = await pool.query(`
                SELECT 
                    oi.*,
                    s.nombre as servicio_nombre,
                    sp.nombre_plan,
                    o.numero_orden,
                    o.usuario_id,
                    u.nombre,
                    u.telefono,
                    u.email
                FROM order_items oi
                JOIN servicios s ON oi.servicio_id = s.id
                JOIN service_plans sp ON oi.plan_id = sp.id
                JOIN ordenes o ON oi.orden_id = o.id
                JOIN usuarios u ON o.usuario_id = u.id
                WHERE oi.id = $1
            `, [orderItemId]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo order item:', error);
            throw error;
        }
    }
    
    async getCredenciales(orderItemId) {
        try {
            const result = await pool.query(
                'SELECT email, password_encrypted as password FROM inventario_cuentas WHERE assigned_order_item_id = $1',
                [orderItemId]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo credenciales:', error);
            return null;
        }
    }
    
    async getAdminEmails() {
        try {
            const result = await pool.query(
                'SELECT email FROM admin_users WHERE active = TRUE AND email IS NOT NULL'
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error obteniendo emails de administradores:', error);
            return [];
        }
    }
}

module.exports = new NotificationService();
