const pool = require('../config/database').pool;
const axios = require('axios');

class ChatwootService {
    constructor() {
        this.config = null;
        this.axiosInstance = null;
    }
    
    // Cargar configuración de Chatwoot
    async loadConfig() {
        try {
            const result = await pool.query(
                'SELECT * FROM chatwoot_config WHERE activo = TRUE LIMIT 1'
            );
            
            if (result.rows.length > 0) {
                this.config = result.rows[0];
                
                // Configurar cliente axios
                if (this.config.api_access_token) {
                    this.axiosInstance = axios.create({
                        baseURL: `${this.config.base_url}/api/v1`,
                        headers: {
                            'api_access_token': this.config.api_access_token,
                            'Content-Type': 'application/json'
                        }
                    });
                }
                
                return this.config;
            }
            
            return null;
        } catch (error) {
            console.error('Error cargando configuración de Chatwoot:', error);
            return null;
        }
    }
    
    // Obtener o crear contacto en Chatwoot
    async getOrCreateContact(usuario) {
        try {
            await this.loadConfig();
            
            if (!this.axiosInstance) {
                throw new Error('Chatwoot no configurado');
            }
            
            // Buscar si el contacto ya existe
            const searchResponse = await this.axiosInstance.get(
                `/accounts/${this.config.account_id}/contacts/search`,
                {
                    params: {
                        q: usuario.telefono
                    }
                }
            );
            
            if (searchResponse.data.payload && searchResponse.data.payload.length > 0) {
                const contact = searchResponse.data.payload[0];
                
                // Guardar sesión en base de datos
                await this.saveSession(usuario.id, contact.id, null);
                
                return contact;
            }
            
            // Crear nuevo contacto
            const createResponse = await this.axiosInstance.post(
                `/accounts/${this.config.account_id}/contacts`,
                {
                    name: usuario.nombre,
                    phone_number: usuario.telefono,
                    email: usuario.email || null,
                    custom_attributes: {
                        user_id: usuario.id,
                        telefono: usuario.telefono
                    }
                }
            );
            
            const newContact = createResponse.data.payload.contact;
            
            // Guardar sesión en base de datos
            await this.saveSession(usuario.id, newContact.id, null);
            
            return newContact;
        } catch (error) {
            console.error('Error obteniendo/creando contacto en Chatwoot:', error);
            throw error;
        }
    }
    
    // Crear conversación
    async createConversation(usuarioId, mensaje = null) {
        try {
            await this.loadConfig();
            
            if (!this.axiosInstance) {
                throw new Error('Chatwoot no configurado');
            }
            
            // Obtener usuario
            const usuarioResult = await pool.query(
                'SELECT * FROM usuarios WHERE id = $1',
                [usuarioId]
            );
            
            if (usuarioResult.rows.length === 0) {
                throw new Error('Usuario no encontrado');
            }
            
            const usuario = usuarioResult.rows[0];
            
            // Obtener o crear contacto
            const contact = await this.getOrCreateContact(usuario);
            
            // Crear conversación
            const conversationResponse = await this.axiosInstance.post(
                `/accounts/${this.config.account_id}/conversations`,
                {
                    source_id: contact.id,
                    inbox_id: this.config.inbox_id,
                    contact_id: contact.id,
                    status: 'open'
                }
            );
            
            const conversation = conversationResponse.data;
            
            // Actualizar sesión con conversation_id
            await this.saveSession(usuarioId, contact.id, conversation.id);
            
            // Si hay un mensaje inicial, enviarlo
            if (mensaje) {
                await this.sendMessage(conversation.id, mensaje);
            }
            
            return conversation;
        } catch (error) {
            console.error('Error creando conversación en Chatwoot:', error);
            throw error;
        }
    }
    
    // Enviar mensaje
    async sendMessage(conversationId, mensaje, privado = false) {
        try {
            await this.loadConfig();
            
            if (!this.axiosInstance) {
                throw new Error('Chatwoot no configurado');
            }
            
            const response = await this.axiosInstance.post(
                `/accounts/${this.config.account_id}/conversations/${conversationId}/messages`,
                {
                    content: mensaje,
                    message_type: privado ? 'private' : 'outgoing',
                    private: privado
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Error enviando mensaje en Chatwoot:', error);
            throw error;
        }
    }
    
    // Enviar mensaje de orden creada
    async notifyOrderCreated(usuarioId, orden) {
        try {
            const mensaje = `
¡Nueva orden creada! 🎉

Orden: ${orden.numero_orden}
Total: $${orden.total} MXN
Estado: ${orden.estado}

Te mantendremos informado sobre el progreso de tu orden.
            `.trim();
            
            // Buscar conversación existente o crear una nueva
            const session = await this.getSession(usuarioId);
            
            let conversationId;
            
            if (session && session.conversation_id) {
                conversationId = session.conversation_id;
            } else {
                const conversation = await this.createConversation(usuarioId, mensaje);
                conversationId = conversation.id;
            }
            
            if (conversationId) {
                await this.sendMessage(conversationId, mensaje);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error notificando orden en Chatwoot:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Enviar mensaje de pago recibido
    async notifyPaymentReceived(usuarioId, orden) {
        try {
            const mensaje = `
¡Pago confirmado! ✅

Orden: ${orden.numero_orden}
Monto: $${orden.total} MXN

Estamos procesando tu pedido. Recibirás tus credenciales pronto.
            `.trim();
            
            const session = await this.getSession(usuarioId);
            
            if (session && session.conversation_id) {
                await this.sendMessage(session.conversation_id, mensaje);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error notificando pago en Chatwoot:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Guardar/actualizar sesión
    async saveSession(usuarioId, contactId, conversationId) {
        try {
            const existing = await pool.query(
                'SELECT id FROM chatwoot_sessions WHERE usuario_id = $1',
                [usuarioId]
            );
            
            if (existing.rows.length > 0) {
                await pool.query(`
                    UPDATE chatwoot_sessions
                    SET contact_id = $1,
                        conversation_id = COALESCE($2, conversation_id),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE usuario_id = $3
                `, [contactId, conversationId, usuarioId]);
            } else {
                await pool.query(`
                    INSERT INTO chatwoot_sessions (usuario_id, contact_id, conversation_id)
                    VALUES ($1, $2, $3)
                `, [usuarioId, contactId, conversationId]);
            }
        } catch (error) {
            console.error('Error guardando sesión de Chatwoot:', error);
        }
    }
    
    // Obtener sesión
    async getSession(usuarioId) {
        try {
            const result = await pool.query(
                'SELECT * FROM chatwoot_sessions WHERE usuario_id = $1',
                [usuarioId]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error obteniendo sesión de Chatwoot:', error);
            return null;
        }
    }
    
    // Obtener widget config
    async getWidgetConfig() {
        try {
            await this.loadConfig();
            
            if (!this.config) {
                return null;
            }
            
            return {
                websiteToken: this.config.website_token,
                baseUrl: this.config.base_url
            };
        } catch (error) {
            console.error('Error obteniendo configuración del widget:', error);
            return null;
        }
    }
    
    // Configurar Chatwoot
    async configureService(websiteToken, apiAccessToken, accountId, inboxId, baseUrl) {
        try {
            // Verificar si ya existe una configuración
            const existing = await pool.query(
                'SELECT id FROM chatwoot_config WHERE activo = TRUE LIMIT 1'
            );
            
            if (existing.rows.length > 0) {
                // Actualizar
                await pool.query(`
                    UPDATE chatwoot_config
                    SET website_token = $1,
                        api_access_token = $2,
                        account_id = $3,
                        inbox_id = $4,
                        base_url = $5,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $6
                `, [websiteToken, apiAccessToken, accountId, inboxId, baseUrl, existing.rows[0].id]);
            } else {
                // Crear nuevo
                await pool.query(`
                    INSERT INTO chatwoot_config (
                        website_token,
                        api_access_token,
                        account_id,
                        inbox_id,
                        base_url
                    )
                    VALUES ($1, $2, $3, $4, $5)
                `, [websiteToken, apiAccessToken, accountId, inboxId, baseUrl]);
            }
            
            // Recargar configuración
            await this.loadConfig();
            
            return { success: true };
        } catch (error) {
            console.error('Error configurando Chatwoot:', error);
            throw error;
        }
    }
}

module.exports = new ChatwootService();
