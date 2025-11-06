const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const chatwootApi = axios.create({
    baseURL: process.env.CHATWOOT_API_URL,
    headers: { 'api_access_token': process.env.CHATWOOT_API_TOKEN }
});

app.get('/health', async (req, res) => {
    res.json({ status: 'healthy', service: 'chatwoot-service', version: '3.0.0' });
});

app.post('/conversations', async (req, res) => {
    try {
        const { contactId, message } = req.body;
        
        const response = await chatwootApi.post(`/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations`, {
            contact_id: contactId,
            inbox_id: 1
        });
        
        const conversationId = response.data.id;
        
        await chatwootApi.post(`/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`, {
            content: message,
            message_type: 'outgoing'
        });
        
        res.json({ conversationId, message: 'Conversación creada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: { code: 'CHATWOOT_ERROR', message: error.message } });
    }
});

app.post('/webhooks', async (req, res) => {
    try {
        const { event, data } = req.body;
        
        await pool.query(
            'INSERT INTO chatwoot_webhooks (event_type, payload) VALUES ($1, $2)',
            [event, JSON.stringify(data)]
        );
        
        res.json({ message: 'Webhook recibido' });
    } catch (error) {
        res.status(500).json({ error: { code: 'WEBHOOK_ERROR', message: error.message } });
    }
});

app.listen(PORT, () => console.log(`Chatwoot Service running on port ${PORT}`));

process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});
