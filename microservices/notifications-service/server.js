const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});

app.get('/health', async (req, res) => {
    res.json({ status: 'healthy', service: 'notifications-service', version: '3.0.0' });
});

app.post('/send/sms', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        
        await pool.query(
            'INSERT INTO notifications (type, recipient, message, status) VALUES ($1, $2, $3, $4)',
            ['sms', phone, message, 'sent']
        );
        
        res.json({ message: 'SMS enviado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: { code: 'SMS_ERROR', message: error.message } });
    }
});

app.post('/send/whatsapp', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        await twilioClient.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${phone}`
        });
        
        await pool.query(
            'INSERT INTO notifications (type, recipient, message, status) VALUES ($1, $2, $3, $4)',
            ['whatsapp', phone, message, 'sent']
        );
        
        res.json({ message: 'WhatsApp enviado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: { code: 'WHATSAPP_ERROR', message: error.message } });
    }
});

app.post('/send/email', async (req, res) => {
    try {
        const { email, subject, body } = req.body;
        
        await emailTransporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject,
            html: body
        });
        
        await pool.query(
            'INSERT INTO notifications (type, recipient, message, status) VALUES ($1, $2, $3, $4)',
            ['email', email, subject, 'sent']
        );
        
        res.json({ message: 'Email enviado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: { code: 'EMAIL_ERROR', message: error.message } });
    }
});

app.listen(PORT, () => console.log(`Notifications Service running on port ${PORT}`));

process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});
