// ============================================================================
// CUENTY ANALYTICS SERVICE - Microservicio de Analytics
// Events + Reports + ML Predictions + Google Analytics 4
// ============================================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('redis');
const axios = require('axios');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3005;

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
});

const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => console.error('Redis Error:', err));
redis.connect();

// ============================================================================
// GOOGLE ANALYTICS 4 INTEGRATION
// ============================================================================

/**
 * Enviar evento a Google Analytics 4
 */
async function sendToGA4(event) {
    if (!process.env.GA4_MEASUREMENT_ID || !process.env.GA4_API_SECRET) {
        return false;
    }
    
    try {
        await axios.post(
            `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
            {
                client_id: event.sessionId || 'anonymous',
                events: [{
                    name: event.eventName,
                    params: {
                        ...event.properties,
                        event_category: event.eventType,
                        page_location: event.pageUrl,
                        engagement_time_msec: event.properties.duration || 0
                    }
                }]
            }
        );
        
        return true;
    } catch (error) {
        console.error('GA4 Error:', error);
        return false;
    }
}

// ============================================================================
// ML PREDICTIONS
// ============================================================================

/**
 * Predecir churn de usuarios usando modelo simple
 */
async function predictChurn(userId) {
    try {
        // Get user behavior data
        const result = await pool.query(
            `SELECT 
                COUNT(*) as sessions_count,
                AVG(time_on_site) as avg_time_on_site,
                SUM(CASE WHEN conversion = true THEN 1 ELSE 0 END) as conversions,
                MAX(session_start) as last_session,
                MIN(session_start) as first_session
             FROM user_behavior
             WHERE user_id = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return { churnProbability: 0.5, confidenceScore: 0.3 };
        }
        
        const data = result.rows[0];
        
        // Simple churn prediction model
        const daysSinceLastSession = (Date.now() - new Date(data.last_session).getTime()) / (1000 * 60 * 60 * 24);
        const avgTimeOnSite = parseFloat(data.avg_time_on_site) || 0;
        const conversions = parseInt(data.conversions) || 0;
        
        let churnScore = 0;
        
        // Factor 1: Days since last session (40% weight)
        if (daysSinceLastSession > 30) churnScore += 0.4;
        else if (daysSinceLastSession > 14) churnScore += 0.2;
        else churnScore += 0.05;
        
        // Factor 2: Average time on site (30% weight)
        if (avgTimeOnSite < 60) churnScore += 0.3;
        else if (avgTimeOnSite < 300) churnScore += 0.15;
        else churnScore += 0.05;
        
        // Factor 3: Conversions (30% weight)
        if (conversions === 0) churnScore += 0.3;
        else if (conversions < 2) churnScore += 0.15;
        else churnScore += 0.05;
        
        // Store prediction
        await pool.query(
            `INSERT INTO predictions 
             (prediction_type, target_entity, target_id, predicted_value, confidence_score, model_version)
             VALUES ('churn', 'user', $1, $2, $3, '1.0')`,
            [userId, churnScore, 0.75]
        );
        
        return {
            userId,
            churnProbability: Math.round(churnScore * 100) / 100,
            confidenceScore: 0.75,
            factors: {
                daysSinceLastSession: Math.round(daysSinceLastSession),
                avgTimeOnSite: Math.round(avgTimeOnSite),
                conversions
            }
        };
        
    } catch (error) {
        console.error('Churn Prediction Error:', error);
        return null;
    }
}

/**
 * Predecir revenue del proximo mes
 */
async function predictRevenue() {
    try {
        // Get revenue history from last 6 months
        const result = await pool.query(
            `SELECT 
                DATE_TRUNC('month', created_at) as month,
                SUM(total_amount) as revenue
             FROM orders
             WHERE status = 'completed'
               AND created_at >= NOW() - INTERVAL '6 months'
             GROUP BY DATE_TRUNC('month', created_at)
             ORDER BY month ASC`
        );
        
        if (result.rows.length < 3) {
            return { predictedRevenue: 0, confidenceScore: 0.2 };
        }
        
        // Simple linear regression
        const revenues = result.rows.map(r => parseFloat(r.revenue));
        const n = revenues.length;
        
        // Calculate trend
        const avgRevenue = revenues.reduce((a, b) => a + b, 0) / n;
        const trend = (revenues[n - 1] - revenues[0]) / n;
        
        // Predict next month
        const predictedRevenue = avgRevenue + trend;
        
        await pool.query(
            `INSERT INTO predictions 
             (prediction_type, predicted_value, confidence_score, model_version)
             VALUES ('revenue', $1, $2, '1.0')`,
            [predictedRevenue, 0.65]
        );
        
        return {
            predictedRevenue: Math.round(predictedRevenue * 100) / 100,
            confidenceScore: 0.65,
            historicalAverage: Math.round(avgRevenue * 100) / 100,
            trend: Math.round(trend * 100) / 100
        };
        
    } catch (error) {
        console.error('Revenue Prediction Error:', error);
        return null;
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
            service: 'analytics-service',
            version: '3.0.0',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

/**
 * POST /events - Registrar evento de analytics
 */
app.post('/events', [
    body('eventType').notEmpty(),
    body('eventName').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' }
        });
    }
    
    const {
        eventType,
        eventName,
        userId,
        sessionId,
        properties = {},
        pageUrl,
        referrer
    } = req.body;
    
    try {
        // Parse user agent
        const ua = UAParser(req.headers['user-agent']);
        const deviceType = ua.device.type || 'desktop';
        const browser = ua.browser.name;
        const os = ua.os.name;
        
        // Get geo location from IP
        const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
        const geo = geoip.lookup(ip) || {};
        
        // Store event
        await pool.query(
            `INSERT INTO analytics_events 
             (event_type, event_name, user_id, session_id, properties, page_url, referrer,
              device_type, browser, os, ip_address, country, state, city)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                eventType,
                eventName,
                userId,
                sessionId,
                JSON.stringify(properties),
                pageUrl,
                referrer,
                deviceType,
                browser,
                os,
                ip,
                geo.country,
                geo.region,
                geo.city
            ]
        );
        
        // Send to Google Analytics 4
        sendToGA4({
            eventType,
            eventName,
            userId,
            sessionId,
            properties,
            pageUrl
        });
        
        // Update user behavior if user session
        if (userId && sessionId) {
            const exists = await pool.query(
                'SELECT id FROM user_behavior WHERE session_id = $1',
                [sessionId]
            );
            
            if (exists.rows.length === 0) {
                // Create new session
                await pool.query(
                    `INSERT INTO user_behavior 
                     (user_id, session_id, entry_page, device_type, browser, os,
                      country, state, city, referrer_source)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [userId, sessionId, pageUrl, deviceType, browser, os, geo.country, geo.region, geo.city, referrer]
                );
            } else {
                // Update existing session
                await pool.query(
                    `UPDATE user_behavior 
                     SET pages_visited = pages_visited + 1,
                         exit_page = $1,
                         session_end = NOW()
                     WHERE session_id = $2`,
                    [pageUrl, sessionId]
                );
            }
        }
        
        res.status(201).json({ message: 'Evento registrado exitosamente' });
        
    } catch (error) {
        console.error('Event Tracking Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al registrar evento' }
        });
    }
});

/**
 * GET /dashboard - Obtener metricas del dashboard
 */
app.get('/dashboard', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();
    
    try {
        // Get realtime stats
        const stats = await pool.query(
            `SELECT * FROM dashboard_realtime_stats 
             WHERE hour >= $1 AND hour <= $2 
             ORDER BY hour DESC`,
            [start, end]
        );
        
        // Get state metrics
        const stateMetrics = await pool.query('SELECT * FROM state_metrics LIMIT 10');
        
        // Get conversion funnel
        const funnel = await pool.query(
            `SELECT * FROM conversion_funnel 
             WHERE date >= $1 AND date <= $2 
             ORDER BY date DESC 
             LIMIT 30`,
            [start, end]
        );
        
        // Get revenue by service
        const revenue = await pool.query('SELECT * FROM revenue_by_service LIMIT 10');
        
        // Calculate totals
        const totals = await pool.query(
            `SELECT
                COUNT(DISTINCT user_id) as total_users,
                COUNT(*) FILTER (WHERE event_type = 'payment_completed') as total_payments,
                SUM((properties->>'amount')::decimal) FILTER (WHERE event_type = 'payment_completed') as total_revenue
             FROM analytics_events
             WHERE created_at >= $1 AND created_at <= $2`,
            [start, end]
        );
        
        res.json({
            period: { startDate: start, endDate: end },
            totals: totals.rows[0],
            realtimeStats: stats.rows,
            topStates: stateMetrics.rows,
            conversionFunnel: funnel.rows,
            revenueByService: revenue.rows
        });
        
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al obtener métricas' }
        });
    }
});

/**
 * GET /predictions/churn - Predecir churn de usuarios
 */
app.get('/predictions/churn', async (req, res) => {
    try {
        // Get active users
        const users = await pool.query(
            `SELECT DISTINCT user_id 
             FROM user_behavior 
             WHERE session_start >= NOW() - INTERVAL '90 days'
             LIMIT 100`
        );
        
        const predictions = [];
        
        for (const user of users.rows) {
            const prediction = await predictChurn(user.user_id);
            if (prediction && prediction.churnProbability > 0.5) {
                predictions.push(prediction);
            }
        }
        
        // Sort by churn probability
        predictions.sort((a, b) => b.churnProbability - a.churnProbability);
        
        res.json({
            predictions: predictions.slice(0, 50),
            total: predictions.length
        });
        
    } catch (error) {
        console.error('Churn Predictions Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al predecir churn' }
        });
    }
});

/**
 * GET /predictions/revenue - Predecir revenue
 */
app.get('/predictions/revenue', async (req, res) => {
    try {
        const prediction = await predictRevenue();
        
        if (!prediction) {
            return res.status(500).json({
                error: { code: 'PREDICTION_ERROR', message: 'Error al predecir revenue' }
            });
        }
        
        res.json(prediction);
        
    } catch (error) {
        console.error('Revenue Prediction Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al predecir revenue' }
        });
    }
});

/**
 * POST /reports/generate - Generar reporte personalizado
 */
app.post('/reports/generate', async (req, res) => {
    const { reportType, startDate, endDate, filters = {} } = req.body;
    
    try {
        let query;
        let params = [startDate, endDate];
        
        switch (reportType) {
            case 'sales':
                query = `
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as orders_count,
                        SUM(total_amount) as revenue,
                        AVG(total_amount) as avg_order_value
                    FROM orders
                    WHERE created_at >= $1 AND created_at <= $2
                      AND status = 'completed'
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `;
                break;
            
            case 'users':
                query = `
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as new_users,
                        COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '7 days') as active_users
                    FROM users
                    WHERE created_at >= $1 AND created_at <= $2
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `;
                break;
            
            case 'services':
                query = `
                    SELECT * FROM revenue_by_service
                `;
                params = [];
                break;
            
            default:
                return res.status(400).json({
                    error: { code: 'INVALID_REPORT_TYPE', message: 'Tipo de reporte inválido' }
                });
        }
        
        const result = await pool.query(query, params);
        
        res.json({
            reportType,
            period: { startDate, endDate },
            data: result.rows,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Report Generation Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al generar reporte' }
        });
    }
});

/**
 * POST /refresh-views - Refrescar vistas materializadas
 */
app.post('/refresh-views', async (req, res) => {
    try {
        await pool.query('SELECT refresh_all_materialized_views()');
        
        res.json({
            message: 'Vistas materializadas refrescadas exitosamente',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Refresh Views Error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Error al refrescar vistas' }
        });
    }
});

// ============================================================================
// BACKGROUND JOBS
// ============================================================================

/**
 * Refrescar vistas materializadas cada 5 minutos
 */
setInterval(async () => {
    try {
        await pool.query('SELECT refresh_all_materialized_views()');
        console.log('Materialized views refreshed');
    } catch (error) {
        console.error('Auto Refresh Error:', error);
    }
}, 5 * 60 * 1000);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
    console.log(`Analytics Service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
    await pool.end();
    await redis.quit();
    process.exit(0);
});
