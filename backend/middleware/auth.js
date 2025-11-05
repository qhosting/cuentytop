const jwt = require('jsonwebtoken');
const pool = require('../config/database').pool;

// Middleware para autenticar token JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                mensaje: 'Token de autenticación requerido'
            });
        }
        
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    mensaje: 'Token inválido o expirado'
                });
            }
            
            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Error en authenticateToken:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error de autenticación'
        });
    }
};

// Middleware para verificar si el usuario es administrador
const isAdmin = async (req, res, next) => {
    try {
        // Verificar si el usuario es administrador
        const result = await pool.query(
            'SELECT * FROM admin_users WHERE id = $1 AND active = TRUE',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(403).json({
                success: false,
                mensaje: 'Acceso denegado. Se requieren permisos de administrador.'
            });
        }
        
        req.admin = result.rows[0];
        next();
    } catch (error) {
        console.error('Error en isAdmin:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error verificando permisos'
        });
    }
};

// Middleware para verificar propiedad de recurso
const isOwner = (resourceType) => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params.id;
            const userId = req.user.id;
            
            let query;
            
            switch (resourceType) {
                case 'orden':
                    query = 'SELECT usuario_id FROM ordenes WHERE id = $1';
                    break;
                case 'carrito':
                    query = 'SELECT usuario_id FROM shopping_cart WHERE id = $1';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        mensaje: 'Tipo de recurso no válido'
                    });
            }
            
            const result = await pool.query(query, [resourceId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'Recurso no encontrado'
                });
            }
            
            if (result.rows[0].usuario_id !== userId) {
                return res.status(403).json({
                    success: false,
                    mensaje: 'No tienes permiso para acceder a este recurso'
                });
            }
            
            next();
        } catch (error) {
            console.error('Error en isOwner:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error verificando propiedad del recurso'
            });
        }
    };
};

module.exports = {
    authenticateToken,
    isAdmin,
    isOwner
};
