const { google } = require('googleapis');
const cron = require('node-cron');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const moment = require('moment');

// Configuración
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const BACKUP_DIR = path.join(__dirname, '../backups');

// Asegurar que exista el directorio de backups
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Autenticación de Google Drive
const getDriveClient = () => {
    let auth;

    // Opción 1: Archivo JSON
    if (fs.existsSync('credentials.json')) {
        auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
    }
    // Opción 2: Variable de entorno (JSON string)
    else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
    } else {
        console.warn('⚠️ No se encontraron credenciales de Google Drive. Backups a la nube deshabilitados.');
        return null;
    }

    return google.drive({ version: 'v3', auth });
};

// Ejecutar comando shell como promesa con variables de entorno seguras
const execPromise = (command, env = {}) => {
    return new Promise((resolve, reject) => {
        exec(command, { env: { ...process.env, ...env } }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error ejecutando comando: ${command}`, stderr);
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
};

// Función principal de backup
const performBackup = async () => {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const pgDumpFile = path.join(BACKUP_DIR, `pg_dump_${timestamp}.sql`);
    const mongoDumpDir = path.join(BACKUP_DIR, `mongo_dump_${timestamp}`);
    const zipFile = path.join(BACKUP_DIR, `backup-${timestamp}.zip`);

    console.log(`[${timestamp}] 🚀 Iniciando proceso de backup...`);

    try {
        // 1. Dump PostgreSQL
        if (process.env.PG_URI || (process.env.DB_HOST && process.env.DB_NAME)) {
            console.log('📦 Creando dump de PostgreSQL...');

            let pgCmd;
            let env = {};

            if (process.env.PG_URI) {
                // Si existe PG_URI, usarlo directamente
                // pg_dump "postgres://user:pass@host:port/db" -f file
                pgCmd = `pg_dump "${process.env.PG_URI}" -F p -f "${pgDumpFile}"`;
            } else {
                // Usar variables individuales
                pgCmd = `pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -F p -f "${pgDumpFile}"`;
                env = { PGPASSWORD: process.env.DB_PASSWORD };
            }

            await execPromise(pgCmd, env);
        }

        // 2. Dump MongoDB (si aplica)
        if (process.env.MONGO_URI) {
            console.log('📦 Creando dump de MongoDB...');
            // mongodump --uri="mongodb://..." --out="dir"
            // Nota: mongodump maneja la URI de forma segura, pero mejor usar variables si es posible.
            // En este caso, la URI se pasa como argumento, lo cual es visible en ps aux.
            // Desafortunadamente mongodump no lee MONGO_URI de env directamente como standard,
            // pero podemos mitigar si usamos la version mas reciente que soporte stdin o config file.
            // Para simplicidad y cumplimiento del requerimiento, usaremos la URI en el comando
            // pero sabiendo que en un entorno muy estricto deberíamos parsear user/pass.
            const mongoCmd = `mongodump --uri="${process.env.MONGO_URI}" --out="${mongoDumpDir}"`;
            await execPromise(mongoCmd);
        }

        // 3. Comprimir a ZIP
        console.log('🗜️ Comprimiendo archivos...');
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipFile);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);

            if (fs.existsSync(pgDumpFile)) {
                archive.file(pgDumpFile, { name: 'postgres_dump.sql' });
            }

            if (fs.existsSync(mongoDumpDir)) {
                archive.directory(mongoDumpDir, 'mongo_dump');
            }

            archive.finalize();
        });

        // 4. Subir a Google Drive
        const drive = getDriveClient();
        if (drive && GOOGLE_DRIVE_FOLDER_ID) {
            console.log('☁️ Subiendo a Google Drive...');
            const fileMetadata = {
                name: path.basename(zipFile),
                parents: [GOOGLE_DRIVE_FOLDER_ID]
            };
            const media = {
                mimeType: 'application/zip',
                body: fs.createReadStream(zipFile)
            };

            const file = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id'
            });
            console.log(`✅ Backup subido exitosamente. ID: ${file.data.id}`);
        } else {
            console.log('⚠️ Upload saltado: Drive no configurado.');
        }

    } catch (error) {
        console.error('❌ Error durante el backup:', error);
    } finally {
        // 5. Limpieza
        console.log('🧹 Limpiando archivos temporales...');
        if (fs.existsSync(pgDumpFile)) fs.unlinkSync(pgDumpFile);
        if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
        if (fs.existsSync(mongoDumpDir)) {
            fs.rmSync(mongoDumpDir, { recursive: true, force: true });
        }
        console.log('🏁 Proceso de backup finalizado.');
    }
};

// Inicializar Cron Job
const initBackupService = () => {
    // Ejecutar a las 3:00 AM todos los días
    cron.schedule('0 3 * * *', () => {
        performBackup();
    });
    console.log('⏰ Servicio de Backup Automático programado (03:00 AM)');
};

module.exports = { initBackupService, performBackup };
