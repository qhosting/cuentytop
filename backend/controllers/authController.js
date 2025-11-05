const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const PhoneVerification = require('../models/PhoneVerification');

class AuthController {
    // Solicitar código de verificación
    static async solicitarCodigo(req, res) {
        try {
            const { telefono } = req.body;

            // Validar teléfono
            if (!telefono || !/^\+?[\d\s-()]{10,}$/.test(telefono)) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Número de teléfono inválido'
                });
            }

            // Verificar intentos y bloqueo
            const verificacionBloqueo = await PhoneVerification.verificarIntentos(telefono);
            if (verificacionBloqueo.bloqueado) {
                return res.status(429).json({
                    success: false,
                    mensaje: verificacionBloqueo.mensaje,
                    tiempoRestante: verificacionBloqueo.tiempoRestante
                });
            }

            // Verificar si ya tiene código válido
            const codigoValido = await PhoneVerification.tieneCodigoValido(telefono);
            if (codigoValido) {
                const tiempoRestante = Math.ceil((codigoValido.expires_at - new Date()) / (60 * 1000));
                return res.status(400).json({
                    success: false,
                    mensaje: `Ya tienes un código válido. Expira en ${tiempoRestante} minutos`
                });
            }

            // Generar nuevo código
            const verificacion = await PhoneVerification.generarCodigo(telefono);

            // TODO: Enviar SMS/WhatsApp aquí
            // await this.enviarSMS(telefono, verificacion.codigo);
            
            console.log(`📱 Código de verificación para ${telefono}: ${verificacion.codigo}`);

            res.json({
                success: true,
                mensaje: 'Código de verificación enviado',
                tiempo_expiracion: 10, // minutos
                // En desarrollo, mostrar código (eliminar en producción)
                ...(process.env.NODE_ENV !== 'production' && { codigo_temporal: verificacion.codigo })
            });

        } catch (error) {
            console.error('Error solicitando código:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Verificar código
    static async verificarCodigo(req, res) {
        try {
            const { telefono, codigo, nombre, email } = req.body;

            // Validaciones
            if (!telefono || !codigo) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Teléfono y código son requeridos'
                });
            }

            // Verificar código
            const resultado = await PhoneVerification.verificarCodigo(telefono, codigo);
            
            if (!resultado.valido) {
                return res.status(400).json({
                    success: false,
                    mensaje: resultado.mensaje
                });
            }

            // Buscar o crear usuario
            let usuario = await Usuario.buscarPorTelefono(telefono);
            
            if (!usuario) {
                // Crear nuevo usuario
                usuario = await Usuario.crear({
                    telefono,
                    nombre: nombre || 'Usuario',
                    email: email || null
                });
            }

            // Generar JWT token
            const token = jwt.sign(
                { 
                    userId: usuario.id, 
                    telefono: usuario.telefono,
                    tipo: 'user'
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Actualizar último login
            await Usuario.actualizarUltimoLogin(usuario.id);

            res.json({
                success: true,
                mensaje: 'Verificación exitosa',
                token,
                usuario: {
                    id: usuario.id,
                    uuid: usuario.uuid,
                    telefono: usuario.telefono,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    verified: usuario.verified,
                    delivery_preference: usuario.delivery_preference
                }
            });

        } catch (error) {
            console.error('Error verificando código:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Obtener perfil de usuario
    static async obtenerPerfil(req, res) {
        try {
            const userId = req.user.userId;
            const usuario = await Usuario.buscarPorId(userId);

            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                usuario: {
                    id: usuario.id,
                    uuid: usuario.uuid,
                    telefono: usuario.telefono,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    verified: usuario.verified,
                    delivery_preference: usuario.delivery_preference,
                    created_at: usuario.created_at,
                    last_login: usuario.last_login
                }
            });

        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Actualizar perfil
    static async actualizarPerfil(req, res) {
        try {
            const userId = req.user.userId;
            const { nombre, email, delivery_preference } = req.body;

            // Validaciones
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Email inválido'
                });
            }

            if (delivery_preference && !['whatsapp', 'email', 'website'].includes(delivery_preference)) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Método de entrega inválido'
                });
            }

            // Actualizar perfil
            const usuario = await Usuario.actualizarPerfil(userId, {
                nombre,
                email,
                delivery_preference
            });

            res.json({
                success: true,
                mensaje: 'Perfil actualizado exitosamente',
                usuario: {
                    id: usuario.id,
                    uuid: usuario.uuid,
                    telefono: usuario.telefono,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    verified: usuario.verified,
                    delivery_preference: usuario.delivery_preference,
                    updated_at: usuario.updated_at
                }
            });

        } catch (error) {
            console.error('Error actualizando perfil:', error);
            res.status(500).json({
                success: false,
                mensaje: error.message || 'Error interno del servidor'
            });
        }
    }

    // Cerrar sesión
    static async cerrarSesion(req, res) {
        try {
            const { telefono } = req.user;

            // Invalidar códigos de verificación
            if (telefono) {
                await PhoneVerification.invalidarCodigos(telefono);
            }

            res.json({
                success: true,
                mensaje: 'Sesión cerrada exitosamente'
            });

        } catch (error) {
            console.error('Error cerrando sesión:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor'
            });
        }
    }

    // Reenviar código
    static async reenviarCodigo(req, res) {
        try {
            const { telefono } = req.body;

            if (!telefono) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Número de teléfono requerido'
                });
            }

            const verificacion = await PhoneVerification.reenviarCodigo(telefono);

            // TODO: Enviar SMS/WhatsApp aquí
            console.log(`📱 Nuevo código para ${telefono}: ${verificacion.codigo}`);

            res.json({
                success: true,
                mensaje: 'Nuevo código de verificación enviado',
                tiempo_expiracion: 10,
                // En desarrollo, mostrar código (eliminar en producción)
                ...(process.env.NODE_ENV !== 'production' && { codigo_temporal: verificacion.codigo })
            });

        } catch (error) {
            console.error('Error reenviando código:', error);
            res.status(400).json({
                success: false,
                mensaje: error.message || 'Error reenviando código'
            });
        }
    }

    // Verificar token (middleware helper)
    static verificarToken(req, res, next) {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({
                    success: false,
                    mensaje: 'Token de acceso requerido'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    mensaje: 'Token expirado'
                });
            }
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    mensaje: 'Token inválido'
                });
            }

            res.status(401).json({
                success: false,
                mensaje: 'Error de autenticación'
            });
        }
    }

    // Token opcional (no falla si no hay token)
    static async tokenOpcional(req, res, next) {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');

            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
            }

            next();

        } catch (error) {
            // Continuar sin usuario autenticado
            next();
        }
    }

    // Función auxiliar para enviar SMS (placeholder)
    static async enviarSMS(telefono, codigo) {
        try {
            // TODO: Implementar con Twilio o WhatsApp Business API
            console.log(`Enviando SMS a ${telefono}: Tu código es ${codigo}`);
            
            // Ejemplo con Twilio:
            // const twilio = require('twilio');
            // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            // 
            // await client.messages.create({
            //     body: `Tu código de verificación CUENTY es: ${codigo}. Válido por 10 minutos.`,
            //     from: process.env.TWILIO_PHONE_NUMBER,
            //     to: telefono
            // });

        } catch (error) {
            console.error('Error enviando SMS:', error);
            throw new Error('Error enviando código de verificación');
        }
    }

    // Middleware para verificar admin
    static verificarAdmin(req, res, next) {
        try {
            if (req.user.tipo !== 'admin') {
                return res.status(403).json({
                    success: false,
                    mensaje: 'Acceso denegado. Se requieren privilegios de administrador'
                });
            }
            next();

        } catch (error) {
            res.status(403).json({
                success: false,
                mensaje: 'Error verificando permisos de administrador'
            });
        }
    }
}

module.exports = AuthController;