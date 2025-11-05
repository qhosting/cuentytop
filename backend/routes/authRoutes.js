const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Middleware para validación
const { body, param } = require('express-validator');

// ================================
// RUTAS DE AUTENTICACIÓN DE USUARIO
// ================================

/**
 * @route   POST /api/auth/user/phone/request-code
 * @desc    Solicitar código de verificación por teléfono
 * @access  Público
 */
router.post('/phone/request-code', [
    body('telefono')
        .notEmpty()
        .withMessage('El número de teléfono es requerido')
        .matches(/^\+?[\d\s-()]{10,}$/)
        .withMessage('Formato de teléfono inválido')
], AuthController.solicitarCodigo);

/**
 * @route   POST /api/auth/user/phone/verify-code
 * @desc    Verificar código de teléfono y hacer login/registro
 * @access  Público
 */
router.post('/phone/verify-code', [
    body('telefono')
        .notEmpty()
        .withMessage('El número de teléfono es requerido')
        .matches(/^\+?[\d\s-()]{10,}$/)
        .withMessage('Formato de teléfono inválido'),
    body('codigo')
        .isLength({ min: 6, max: 6 })
        .withMessage('El código debe tener 6 dígitos')
        .isNumeric()
        .withMessage('El código debe ser numérico'),
    body('nombre')
        .optional()
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Formato de email inválido')
], AuthController.verificarCodigo);

/**
 * @route   POST /api/auth/user/phone/resend-code
 * @desc    Reenviar código de verificación
 * @access  Público
 */
router.post('/phone/resend-code', [
    body('telefono')
        .notEmpty()
        .withMessage('El número de teléfono es requerido')
        .matches(/^\+?[\d\s-()]{10,}$/)
        .withMessage('Formato de teléfono inválido')
], AuthController.reenviarCodigo);

/**
 * @route   GET /api/auth/user/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Privado
 */
router.get('/profile', 
    AuthController.verificarToken,
    AuthController.obtenerPerfil
);

/**
 * @route   PUT /api/auth/user/profile
 * @desc    Actualizar perfil del usuario
 * @access  Privado
 */
router.put('/profile', [
    AuthController.verificarToken,
    body('nombre')
        .optional()
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Formato de email inválido'),
    body('delivery_preference')
        .optional()
        .isIn(['whatsapp', 'email', 'website'])
        .withMessage('Método de entrega debe ser: whatsapp, email o website')
], AuthController.actualizarPerfil);

/**
 * @route   POST /api/auth/user/logout
 * @desc    Cerrar sesión del usuario
 * @access  Privado
 */
router.post('/logout', 
    AuthController.verificarToken,
    AuthController.cerrarSesion
);

/**
 * @route   GET /api/auth/user/verify-token
 * @desc    Verificar si el token es válido
 * @access  Privado
 */
router.get('/verify-token', 
    AuthController.verificarToken,
    (req, res) => {
        res.json({
            success: true,
            mensaje: 'Token válido',
            user: {
                id: req.user.userId,
                telefono: req.user.telefono,
                tipo: req.user.tipo
            }
        });
    }
);

// ================================
// RUTAS DE ADMINISTRACIÓN
// ================================

/**
 * @route   POST /api/auth/admin/login
 * @desc    Login de administrador
 * @access  Privado (Admin)
 */
router.post('/admin/login', [
    body('username')
        .notEmpty()
        .withMessage('El nombre de usuario es requerido'),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
], async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // TODO: Implementar autenticación de admin con bcrypt
        // Por ahora, usar credenciales hardcodeadas
        
        if (username === 'admin' && password === 'admin123') {
            const jwt = require('jsonwebtoken');
            
            const token = jwt.sign(
                { 
                    userId: 1, 
                    username: 'admin',
                    tipo: 'admin'
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                success: true,
                mensaje: 'Login exitoso',
                token,
                admin: {
                    id: 1,
                    username: 'admin',
                    nombre: 'Administrador del Sistema'
                }
            });
        } else {
            res.status(401).json({
                success: false,
                mensaje: 'Credenciales inválidas'
            });
        }
    } catch (error) {
        console.error('Error en login admin:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error interno del servidor'
        });
    }
});

/**
 * @route   GET /api/auth/admin/verify-admin
 * @desc    Verificar token de administrador
 * @access  Privado (Admin)
 */
router.get('/admin/verify-admin', 
    AuthController.verificarToken,
    AuthController.verificarAdmin,
    (req, res) => {
        res.json({
            success: true,
            mensaje: 'Token de administrador válido',
            admin: {
                id: req.user.userId,
                username: req.user.username,
                tipo: req.user.tipo
            }
        });
    }
);

// ================================
// RUTAS DE UTILIDADES
// ================================

/**
 * @route   GET /api/auth/health
 * @desc    Verificar estado del servicio de autenticación
 * @access  Público
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        mensaje: 'Servicio de autenticación operativo',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

/**
 * @route   GET /api/auth/stats
 * @desc    Obtener estadísticas de autenticación
 * @access  Privado (Admin)
 */
router.get('/stats', 
    AuthController.verificarToken,
    AuthController.verificarAdmin,
    async (req, res) => {
        try {
            const PhoneVerification = require('../models/PhoneVerification');
            const Usuario = require('../models/Usuario');
            
            const statsVerificacion = await PhoneVerification.obtenerEstadisticas();
            const statsUsuarios = await Usuario.obtenerEstadisticas();
            
            res.json({
                success: true,
                estadisticas: {
                    verificaciones: statsVerificacion,
                    usuarios: statsUsuarios
                }
            });
        } catch (error) {
            console.error('Error obteniendo stats:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error obteniendo estadísticas'
            });
        }
    }
);

// ================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ================================

// Manejo de errores de validación
router.use((error, req, res, next) => {
    if (error.name === 'ValidationError') {
        const errors = error.errors.map(err => ({
            campo: err.param,
            mensaje: err.msg
        }));
        
        return res.status(400).json({
            success: false,
            mensaje: 'Error de validación',
            errores: errors
        });
    }
    
    // Si es un error de JWT
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            mensaje: 'Token inválido o expirado'
        });
    }
    
    next(error);
});

// ================================
// EXPORTAR RUTAS
// ================================

module.exports = router;