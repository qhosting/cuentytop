// ============================================================================
// CUENTY PAYMENTS SERVICE - Microservicio de Pagos
// SPEI + CoDi + Integraciones Bancarias Mexicanas
// ============================================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('redis');
const axios = require('axios');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3002;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================================================
// DATABASE & CACHE
// ============================================================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
});

const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => console.error('Redis Error:', err));
redis.connect();

// ============================================================================
// BANKING INTEGRATIONS
// ============================================================================

/**
 * BBVA Open Banking Integration
 */
class BBVAIntegration {
    constructor() {
        this.clientId = process.env.BBVA_CLIENT_ID;
        this.clientSecret = process.env.BBVA_CLIENT_SECRET;
        this.apiUrl = process.env.BBVA_API_URL || 'https://api.bbva.com/v1';
        this.accessToken = null;
    }
    
    async authenticate() {
        try {
            const response = await axios.post(`${this.apiUrl}/oauth/token`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            });
            
            this.accessToken = response.data.access_token;
            await redis.setEx('bbva:token', 3600, this.accessToken);
            
            return true;
        } catch (error) {
            console.error('BBVA Auth Error:', error);
            return false;
        }
    }
    
    async getBalance(accountId) {
        if (!this.accessToken) await this.authenticate();
        
        try {
            const response = await axios.get(
                `${this.apiUrl}/accounts/${accountId}/balance`,
                { headers: { Authorization: `Bearer ${this.accessToken}` } }
            );
            
            return response.data;
        } catch (error) {
            console.error('BBVA Balance Error:', error);
            return null;
        }
    }
    
    async createSPEITransfer(data) {
        if (!this.accessToken) await this.authenticate();
        
        try {
            const response = await axios.post(
                `${this.apiUrl}/payments/spei`,
                {
                    amount: data.amount,
                    currency: 'MXN',
                    beneficiary_account: data.clabe,
                    reference: data.reference,
                    concept: data.concept
                },
                { headers: { Authorization: `Bearer ${this.accessToken}` } }
            );
            
            return response.data;
        } catch (error) {
            console.error('BBVA SPEI Error:', error);
            return null;
        }
    }
    
    async getTransactionHistory(accountId, startDate, endDate) {
        if (!this.accessToken) await this.authenticate();
        
        try {
            const response = await axios.get(
                `${this.apiUrl}/accounts/${accountId}/transactions`,
                {
                    headers: { Authorization: `Bearer ${this.accessToken}` },
                    params: { start_date: startDate, end_date: endDate }
                }
            );
            
            return response.data.transactions || [];
        } catch (error) {
            console.error('BBVA Transaction History Error:', error);
            return [];
        }
    }
}

/**
 * Santander API Integration
 */
class SantanderIntegration {
    constructor() {
        this.apiKey = process.env.SANTANDER_API_KEY;
        this.clientId = process.env.SANTANDER_CLIENT_ID;
        this.apiUrl = 'https://api.santander.com.mx/v1';
    }
    
    async createSPEIPayment(data) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/spei/payments`,
                {
                    amount: data.amount,
                    destination_clabe: data.clabe,
                    reference: data.reference,
                    concept: data.concept
                },
                {
                    headers: {
                        'X-API-Key': this.apiKey,
                        'X-Client-Id': this.clientId
                    }
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Santander SPEI Error:', error);
            return null;
        }
    }
    
    async getProgrammedPayments(accountId) {
        try {
            const response = await axios.get(
                `${this.apiUrl}/accounts/${accountId}/scheduled-payments`,
                {
                    headers: {
                        'X-API-Key': this.apiKey,
                        'X-Client-Id': this.clientId
                    }
                }
            );
            
            return response.data.payments || [];
        } catch (error) {
            console.error('Santander Scheduled Payments Error:', error);
            return [];
        }
    }
}

/**
 * Banorte API Integration
 */
class BanorteIntegration {
    constructor() {
        this.apiKey = process.env.BANORTE_API_KEY;
        this.apiUrl = 'https://api.banorte.com/v1';
    }
    
    async generateCoDiQR(data) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/codi/generate`,
                {
                    amount: data.amount,
                    reference: data.reference,
                    concept: data.concept,
                    expiry: data.expiry || 3600
                },
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );
            
            // Generate QR code image
            const qrData = response.data.qr_data;
            const qrImage = await QRCode.toDataURL(qrData);
            
            return {
                qr_code: qrImage,
                qr_data: qrData,
                reference: response.data.reference,
                expires_at: response.data.expires_at
            };
        } catch (error) {
            console.error('Banorte CoDi Error:', error);
            return null;
        }
    }
    
    async checkCoDiStatus(reference) {
        try {
            const response = await axios.get(
                `${this.apiUrl}/codi/status/${reference}`,
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );
            
            return response.data;
        } catch (error) {
            console.error('Banorte CoDi Status Error:', error);
            return null;
        }
    }
}

// Initialize banking integrations
const bbva = new BBVAIntegration();
const santander = new SantanderIntegration();
const banorte = new BanorteIntegration();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generar referencia SPEI unica
 */
function generateSPEIReference() {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SPEI${timestamp}${random}`;
}

/**
 * Generar CLABE ficticia (para testing)
 */
function generateCLABE() {
    const bankCode = '012'; // BBVA
    const branchCode = '001';
    const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(11, '0');
    const checkDigit = calculateCLABECheckDigit(bankCode + branchCode + accountNumber);
    return bankCode + branchCode + accountNumber + checkDigit;
}

/**
 * Calcular digito verificador CLABE
 */
function calculateCLABECheckDigit(clabe17) {
    const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
    let sum = 0;
    
    for (let i = 0; i < 17; i++) {
        sum += parseInt(clabe17[i]) * weights[i];
    }
    
    const mod = sum % 10;
    return mod === 0 ? '0' : (10 - mod).toString();
}

/**
 * Reconciliacion automatica de pagos
 */
async function autoReconcilePayment(bankReference, amount) {
    try {
        // Buscar pago pendiente
        const result = await pool.query(
            `SELECT id, order_id FROM payments 
             WHERE reference = $1 AND status = 'pending' AND amount = $2`,
            [bankReference, amount]
        );
        
        if (result.rows.length > 0) {
            const payment = result.rows[0];
            
            // Actualizar estado del pago
            await pool.query(
                'UPDATE payments SET status = $1, confirmed_at = NOW() WHERE id = $2',
                ['completed', payment.id]
            );
            
            // Crear registro de conciliacion
            await pool.query(
                `INSERT INTO transaction_reconciliation 
                 (payment_id, bank_reference, amount_expected, amount_received, 
                  reconciliation_status, reconciliation_method, reconciliation_date)
                 VALUES ($1, $2, $3, $4, 'matched', 'webhook_auto', CURRENT_DATE)`,
                [payment.id, bankReference, amount, amount]
            );
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Auto Reconciliation Error:', error);
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
            service: 'payments-service',
            version: '3.0.0',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

/**
 * POST /spei/generate - Generar referencia SPEI
 */
app.post('/spei/generate', [
    body('orderId').isInt(),
    body('amount').isFloat({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: errors.array() }
        });
    }
    
    const { orderId, amount } = req.body;
    
    try {
        // Generate unique reference
        const reference = generateSPEIReference();
        const clabe = generateCLABE();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
        
        // Create SPEI transaction
        await pool.query(
            `INSERT INTO spei_transactions 
             (order_id, reference, clabe, amount, expires_at, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [orderId, reference, clabe, amount, expiresAt]
        );
        
        // Create payment record
        await pool.query(
            `INSERT INTO payments 
             (order_id, amount, currency, payment_method, reference, status)
             VALUES ($1, $2, 'MXN', 'spei', $3, 'pending')`,
            [orderId, amount, reference]
        );
        
        res.json({
            reference,
            clabe,
            amount,
            currency: 'MXN',
            expiresAt,
            instructions: {
                banco: 'BBVA',
                beneficiario: 'CUENTY SA DE CV',
                concepto: `Pago orden ${orderId}`,
                referencia: reference
            }
        });
        
    } catch (error) {
        console.error('SPEI Generate Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al generar referencia SPEI' }
        });
    }
});

/**
 * POST /codi/generate - Generar QR CoDi
 */
app.post('/codi/generate', [
    body('orderId').isInt(),
    body('amount').isFloat({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' }
        });
    }
    
    const { orderId, amount } = req.body;
    
    try {
        const reference = generateSPEIReference();
        
        // Generate CoDi QR via Banorte
        const codiData = await banorte.generateCoDiQR({
            amount,
            reference,
            concept: `Orden ${orderId}`,
            expiry: 3600 // 1 hour
        });
        
        if (!codiData) {
            return res.status(500).json({
                error: { code: 'CODI_ERROR', message: 'Error al generar QR CoDi' }
            });
        }
        
        // Store CoDi transaction
        await pool.query(
            `INSERT INTO codi_transactions 
             (order_id, reference, qr_code, amount, expires_at, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [orderId, codiData.reference, codiData.qr_data, amount, codiData.expires_at]
        );
        
        res.json({
            qrCode: codiData.qr_code,
            reference: codiData.reference,
            amount,
            currency: 'MXN',
            expiresAt: codiData.expires_at
        });
        
    } catch (error) {
        console.error('CoDi Generate Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al generar QR CoDi' }
        });
    }
});

/**
 * POST /webhooks/bank - Webhook para notificaciones bancarias
 */
app.post('/webhooks/bank', async (req, res) => {
    const { bank_code, webhook_type, payload, signature } = req.body;
    
    try {
        // Store webhook
        const webhookResult = await pool.query(
            `INSERT INTO bank_webhooks 
             (bank_code, webhook_type, payload, signature, processing_status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING id`,
            [bank_code, webhook_type, JSON.stringify(payload), signature]
        );
        
        const webhookId = webhookResult.rows[0].id;
        
        // Process webhook asynchronously
        if (webhook_type === 'payment_confirmation') {
            const { reference, amount, transaction_id } = payload;
            
            // Auto-reconcile
            const reconciled = await autoReconcilePayment(reference, amount);
            
            if (reconciled) {
                await pool.query(
                    'UPDATE bank_webhooks SET processing_status = $1, processed_at = NOW() WHERE id = $2',
                    ['completed', webhookId]
                );
            } else {
                await pool.query(
                    'UPDATE bank_webhooks SET processing_status = $1, error_message = $2 WHERE id = $3',
                    ['failed', 'No matching payment found', webhookId]
                );
            }
        }
        
        res.json({ message: 'Webhook received', webhookId });
        
    } catch (error) {
        console.error('Bank Webhook Error:', error);
        res.status(500).json({
            error: { code: 'WEBHOOK_ERROR', message: 'Error procesando webhook bancario' }
        });
    }
});

/**
 * GET /banking/balance/:bank - Consultar saldo bancario
 */
app.get('/banking/balance/:bank', async (req, res) => {
    const { bank } = req.params;
    const { accountId } = req.query;
    
    try {
        let balance = null;
        
        if (bank === 'bbva') {
            balance = await bbva.getBalance(accountId);
        }
        
        if (!balance) {
            return res.status(404).json({
                error: { code: 'BALANCE_NOT_FOUND', message: 'No se pudo obtener saldo' }
            });
        }
        
        res.json(balance);
        
    } catch (error) {
        console.error('Balance Query Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al consultar saldo' }
        });
    }
});

/**
 * POST /reconciliation/auto - Reconciliacion automatica
 */
app.post('/reconciliation/auto', async (req, res) => {
    try {
        // Get unreconciled payments from last 7 days
        const result = await pool.query(
            `SELECT p.id, p.reference, p.amount, p.order_id
             FROM payments p
             LEFT JOIN transaction_reconciliation tr ON p.id = tr.payment_id
             WHERE p.status = 'pending' 
               AND p.created_at >= NOW() - INTERVAL '7 days'
               AND tr.id IS NULL`
        );
        
        const unreconciledPayments = result.rows;
        let reconciledCount = 0;
        
        // Try to reconcile with BBVA
        for (const payment of unreconciledPayments) {
            const transactions = await bbva.getTransactionHistory(
                'default_account',
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                new Date()
            );
            
            const match = transactions.find(t => 
                t.reference === payment.reference && 
                parseFloat(t.amount) === parseFloat(payment.amount)
            );
            
            if (match) {
                await autoReconcilePayment(payment.reference, payment.amount);
                reconciledCount++;
            }
        }
        
        res.json({
            message: 'Reconciliación completada',
            total: unreconciledPayments.length,
            reconciled: reconciledCount
        });
        
    } catch (error) {
        console.error('Auto Reconciliation Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error en reconciliación automática' }
        });
    }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
    console.log(`Payments Service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
    await pool.end();
    await redis.quit();
    process.exit(0);
});
