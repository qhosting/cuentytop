const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
require('dotenv').config();

// Importar configuración de base de datos
const { checkConnection } = require('./config/database');

// Importar servicio de backup
const { initBackupService } = require('./services/backupService');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const planRoutes = require('./routes/planRoutes');
const cartRoutes = require('./routes/cartRoutes');
const ordenRoutes = require('./routes/ordenRoutes');
const speiRoutes = require('./routes/speiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fase2Routes = require('./routes/fase2Routes');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// MIDDLEWARE DE SEGURIDAD
// ================================

// Helmet para headers de seguridad
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }
}));

// CORS
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(',');
        
        // Permitir requests sin origin (como apps móviles o Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por la política CORS'));
        }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por windowMs
    message: {
        success: false,
        mensaje: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api', limiter);

// Rate limiting más estricto para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 intentos de auth por ventana
    message: {
        success: false,
        mensaje: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.'
    }
});

app.use('/api/auth/', authLimiter);

// ================================
// MIDDLEWARE GENERAL
// ================================

// Compresión
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Parsear JSON con límite
app.use(express.json({ 
    limit: '10mb',
    strict: true
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Sanitización de datos
app.use(mongoSanitize());

// Custom XSS Sanitizer middleware
const sanitizeObject = (obj) => {
    if (typeof obj === 'string') return xss(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
};
app.use((req, res, next) => {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    next();
});

// Prevenir parameter pollution
app.use(hpp());

// Trust proxy (para deployments detrás de load balancer)
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// ================================
// RUTAS PRINCIPALES
// ================================

// Health Check
app.get('/health', async (req, res) => {
    try {
        const dbStatus = await checkConnection();
        
        res.json({
            success: true,
            mensaje: 'Sistema de Suscripciones Operativo',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            database: dbStatus ? 'Conectado' : 'Desconectado',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            }
        });
    } catch (error) {
        console.error('Error en health check:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error del sistema',
            timestamp: new Date().toISOString()
        });
    }
});

// API Info
app.get('/', (req, res) => {
    res.json({
        success: true,
        mensaje: 'Sistema de Gestión de Suscripciones',
        version: '2.0.0',
        description: 'API completa para gestión de suscripciones de servicios de streaming',
        endpoints: {
            auth: '/api/auth',
            servicios: '/api/servicios',
            planes: '/api/planes',
            carrito: '/api/cart',
            ordenes: '/api/ordenes',
            health: '/health'
        },
        documentation: 'https://github.com/tu-usuario/sistema-suscripciones',
        author: 'MiniMax Agent'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/planes', planRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/spei', speiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fase2', fase2Routes);

// ================================
// SERVIR ARCHIVOS ESTÁTICOS
// ================================

// Servir archivos estáticos del frontend (React SPA compilado en public)
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Cualquier ruta de cliente (no API/health) debe servir el index.html
app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================================
// MANEJO DE ERRORES
// ================================

// Ruta no encontrada (404)
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        mensaje: `Ruta ${req.originalUrl} no encontrada`,
        timestamp: new Date().toISOString()
    });
});

// Error handler global
app.use((error, req, res, next) => {
    console.error('Error global:', {
        mensaje: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Error de validación
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            mensaje: 'Error de validación',
            detalles: error.details || error.message
        });
    }

    // Error de base de datos
    if (error.code === '23505') { // Unique violation
        return res.status(409).json({
            success: false,
            mensaje: 'Recurso duplicado',
            detalles: 'El recurso ya existe'
        });
    }

    if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
            success: false,
            mensaje: 'Referencia inválida',
            detalles: 'El recurso referenciado no existe'
        });
    }

    // Error de JWT
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            mensaje: 'Token inválido'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            mensaje: 'Token expirado'
        });
    }

    // Error de sintaxis JSON
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            success: false,
            mensaje: 'JSON inválido en el cuerpo de la solicitud'
        });
    }

    // Error por defecto
    res.status(error.status || 500).json({
        success: false,
        mensaje: process.env.NODE_ENV === 'production' 
            ? 'Error interno del servidor' 
            : error.message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error
        }),
        timestamp: new Date().toISOString()
    });
});

// ================================
// FUNCIONES DE UTILIDAD
// ================================

// Limpiar códigos de verificación expirados cada hora
const PhoneVerification = require('./models/PhoneVerification');
setInterval(async () => {
    try {
        await PhoneVerification.limpiarCodigosExpirados();
    } catch (error) {
        console.error('Error limpiando códigos expirados:', error);
    }
}, 60 * 60 * 1000); // cada hora

// Limpiar carritos abandonados cada día
const ShoppingCart = require('./models/ShoppingCart');
setInterval(async () => {
    try {
        await ShoppingCart.limpiarAbandonados(7); // 7 días
    } catch (error) {
        console.error('Error limpiando carritos abandonados:', error);
    }
}, 24 * 60 * 60 * 1000); // cada día

// ================================
// INICIO DEL SERVIDOR
// ================================

const server = app.listen(PORT, async () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                SISTEMA DE SUSCRIPCIONES                  ║
    ║                     Versión 2.0.0                        ║
    ║                                                          ║
    ║  🚀 Servidor iniciado en puerto ${PORT}                  ║
    ║  📊 Entorno: ${process.env.NODE_ENV || 'development'}                      ║
    ║  🗄️  Base de datos: ${process.env.DB_NAME || 'suscripciones_db'}              ║
    ║  🔗 API URL: http://localhost:${PORT}/api                ║
    ║  💊 Health Check: http://localhost:${PORT}/health        ║
    ║                                                          ║
    ║  Desarrollado por: MiniMax Agent                         ║
    ╚══════════════════════════════════════════════════════════╝
    `);

    // Verificar conexión a la base de datos
    const dbConnected = await checkConnection();
    if (!dbConnected) {
        console.error('⚠️  ADVERTENCIA: No se pudo conectar a la base de datos');
        process.exit(1);
    }

    // Inicializar servicio de backup automático
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_BACKUPS === 'true') {
        initBackupService();
    }

    // Registrar inicio en logs
    console.log(`✅ Sistema iniciado exitosamente - ${new Date().toISOString()}`);
});

// ================================
// MANEJO DE SEÑALES DEL SISTEMA
// ================================

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 ${signal} recibido. Cerrando servidor gracefully...`);
    
    server.close(() => {
        console.log('🔌 Servidor HTTP cerrado.');
        
        // Cerrar conexiones de base de datos
        const { closePool } = require('./config/database');
        closePool().then(() => {
            console.log('🗄️  Conexiones de base de datos cerradas.');
            process.exit(0);
        });
    });
};

// Manejo de señales
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Rejection no manejada en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('🚨 Excepción no capturada:', error);
    gracefulShutdown('uncaughtException');
});

// ================================
// EXPORTAR PARA TESTING
// ================================

module.exports = app;