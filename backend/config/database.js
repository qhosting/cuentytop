const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'suscripciones_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    max: 20, // máximo de conexiones en el pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Manejo de eventos de conexión
pool.on('connect', (client) => {
    console.log('✅ Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err, client) => {
    console.error('❌ Error inesperado en el cliente de la base de datos', err);
    process.exit(-1);
});

// Función para ejecutar queries con manejo de errores
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`📊 Query ejecutada en ${duration}ms:`, { text, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Error en query:', { text, error: error.message });
        throw error;
    }
};

// Función para obtener un cliente del pool
const getClient = async () => {
    return await pool.connect();
};

// Función para transacciones
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Función para verificar la conexión
const checkConnection = async () => {
    try {
        const result = await query('SELECT NOW() as now');
        console.log('✅ Conexión a base de datos verificada:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        return false;
    }
};

// Función para cerrar el pool de conexiones
const closePool = async () => {
    try {
        await pool.end();
        console.log('🔌 Pool de conexiones cerrado');
    } catch (error) {
        console.error('❌ Error cerrando pool:', error.message);
    }
};

module.exports = {
    pool,
    query,
    getClient,
    transaction,
    checkConnection,
    closePool
};