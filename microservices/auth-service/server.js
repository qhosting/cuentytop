// ============================================================================
// CUENTY AUTH SERVICE - Microservicio de Autenticacion
// ============================================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const twilio = require('twilio');
const speakeasy = require('speakeasy');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================================================
// DATABASE & CACHE CONNECTIONS
// ============================================================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const redis = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
});

redis.on('error', (err) => console.error('Redis Error:', err));
redis.connect();

// Twilio client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generar token JWT
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );
}

/**
 * Verificar token JWT
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Middleware de autenticacion
 */
async function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Token no proporcionado' }
        });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado' }
        });
    }
    
    // Check if token is blacklisted
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
        return res.status(401).json({
            error: { code: 'TOKEN_REVOKED', message: 'Token revocado' }
        });
    }
    
    req.user = decoded;
    next();
}

/**
 * Enviar codigo 2FA via SMS/WhatsApp
 */
async function send2FACode(phone, code, method = 'sms') {
    try {
        const message = `Tu codigo de verificacion CUENTY es: ${code}. Valido por 10 minutos.`;
        
        if (method === 'whatsapp') {
            await twilioClient.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: `whatsapp:${phone}`
            });
        } else {
            await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error sending 2FA code:', error);
        return false;
    }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check
 */
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        await redis.ping();
        
        res.json({
            status: 'healthy',
            service: 'auth-service',
            version: '3.0.0',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

/**
 * POST /register - Registrar nuevo usuario
 */
app.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('phone').matches(/^\+52[0-9]{10}$/)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: errors.array() }
        });
    }
    
    const { email, password, name, phone } = req.body;
    
    try {
        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR phone = $2',
            [email, phone]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                error: { code: 'USER_EXISTS', message: 'Usuario ya existe' }
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const result = await pool.query(
            `INSERT INTO users (email, password, name, phone, role, created_at)
             VALUES ($1, $2, $3, $4, 'customer', NOW())
             RETURNING id, email, name, phone, role, created_at`,
            [email, hashedPassword, name, phone]
        );
        
        const user = result.rows[0];
        
        // Generate token
        const token = generateToken(user);
        
        // Log audit trail
        await pool.query(
            `INSERT INTO audit_trails (user_id, action_type, action_name, resource_type, ip_address)
             VALUES ($1, 'CREATE', 'user_registered', 'users', $2)`,
            [user.id, req.ip]
        );
        
        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role
            },
            expiresIn: '24h'
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al registrar usuario' }
        });
    }
});

/**
 * POST /login - Iniciar sesion
 */
app.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' }
        });
    }
    
    const { email, password } = req.body;
    
    try {
        // Get user
        const result = await pool.query(
            'SELECT id, email, password, name, phone, role FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' }
            });
        }
        
        const user = result.rows[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' }
            });
        }
        
        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );
        
        // Generate token
        const token = generateToken(user);
        
        // Store session in Redis
        await redis.setEx(`session:${user.id}`, 86400, token);
        
        // Log audit trail
        await pool.query(
            `INSERT INTO audit_trails (user_id, action_type, action_name, ip_address)
             VALUES ($1, 'LOGIN', 'user_logged_in', $2)`,
            [user.id, req.ip]
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role
            },
            expiresIn: '24h'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al iniciar sesión' }
        });
    }
});

/**
 * POST /logout - Cerrar sesion
 */
app.post('/logout', authMiddleware, async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    try {
        // Blacklist token
        await redis.setEx(`blacklist:${token}`, 86400, 'true');
        
        // Remove session
        await redis.del(`session:${req.user.id}`);
        
        // Log audit trail
        await pool.query(
            `INSERT INTO audit_trails (user_id, action_type, action_name)
             VALUES ($1, 'LOGOUT', 'user_logged_out')`,
            [req.user.id]
        );
        
        res.json({ message: 'Sesión cerrada exitosamente' });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al cerrar sesión' }
        });
    }
});

/**
 * POST /2fa/send - Enviar codigo 2FA
 */
app.post('/2fa/send', authMiddleware, async (req, res) => {
    const { method = 'sms' } = req.body;
    
    try {
        // Get user phone
        const result = await pool.query(
            'SELECT phone FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' }
            });
        }
        
        const { phone } = result.rows[0];
        
        // Generate 6-digit code
        const code = speakeasy.totp({
            secret: process.env.JWT_SECRET,
            encoding: 'base32',
            step: 600 // 10 minutes
        });
        
        // Store code in Redis with 10 min expiry
        await redis.setEx(`2fa:${req.user.id}`, 600, code);
        
        // Send code
        const sent = await send2FACode(phone, code, method);
        
        if (!sent) {
            return res.status(500).json({
                error: { code: 'SEND_FAILED', message: 'Error al enviar código' }
            });
        }
        
        res.json({
            message: 'Código enviado exitosamente',
            method,
            expiresIn: 600
        });
        
    } catch (error) {
        console.error('2FA send error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al enviar código 2FA' }
        });
    }
});

/**
 * POST /2fa/verify - Verificar codigo 2FA
 */
app.post('/2fa/verify', authMiddleware, [
    body('code').isLength({ min: 6, max: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Código inválido' }
        });
    }
    
    const { code } = req.body;
    
    try {
        // Get stored code
        const storedCode = await redis.get(`2fa:${req.user.id}`);
        
        if (!storedCode) {
            return res.status(400).json({
                error: { code: 'CODE_EXPIRED', message: 'Código expirado o inválido' }
            });
        }
        
        if (code !== storedCode) {
            return res.status(400).json({
                error: { code: 'INVALID_CODE', message: 'Código incorrecto' }
            });
        }
        
        // Delete code after successful verification
        await redis.del(`2fa:${req.user.id}`);
        
        // Update 2FA verification status
        await pool.query(
            'UPDATE two_factor_auth SET verified_at = NOW(), is_verified = true WHERE user_id = $1',
            [req.user.id]
        );
        
        res.json({
            message: 'Código verificado exitosamente',
            verified: true
        });
        
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al verificar código 2FA' }
        });
    }
});

/**
 * GET /me - Obtener usuario autenticado
 */
app.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name, phone, role, created_at, last_login FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' }
            });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al obtener usuario' }
        });
    }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        }
    });
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await pool.end();
    await redis.quit();
    process.exit(0);
});
