const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect();

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', service: 'subscriptions-service', version: '3.0.0' });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

app.get('/', async (req, res) => {
    try {
        const { provider, page = 1, limit = 20 } = req.query;
        let query = 'SELECT * FROM services WHERE 1=1';
        const params = [];
        
        if (provider) {
            params.push(provider);
            query += ` AND provider = $${params.length}`;
        }
        
        query += ` ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, (page - 1) * limit);
        
        const result = await pool.query(query, params);
        res.json({ subscriptions: result.rows, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

app.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Suscripción no encontrada' } });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

app.post('/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        await pool.query(
            'INSERT INTO subscriptions (user_id, service_id, status, start_date) VALUES ($1, $2, $3, NOW())',
            [userId, id, 'active']
        );
        
        res.json({ message: 'Suscripción activada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
});

app.listen(PORT, () => console.log(`Subscriptions Service running on port ${PORT}`));

process.on('SIGTERM', async () => {
    await pool.end();
    await redis.quit();
    process.exit(0);
});
