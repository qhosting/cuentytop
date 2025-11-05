# 🚀 Sistema de Gestión de Suscripciones - Guía de Instalación

## 📋 Prerrequisitos

### Software Requerido
- **Node.js** versión 16.0.0 o superior
- **npm** versión 8.0.0 o superior
- **PostgreSQL** versión 13.0 o superior
- **Git** para clonar el repositorio

### Verificar Instalaciones
```bash
# Verificar Node.js
node --version
# Debe mostrar v16.0.0 o superior

# Verificar npm
npm --version
# Debe mostrar 8.0.0 o superior

# Verificar PostgreSQL
psql --version
# Debe mostrar 13.0 o superior

# Verificar Git
git --version
# Debe mostrar una versión de Git
```

## 📁 Estructura del Proyecto

```
sistema_suscripciones/
├── backend/                 # Servidor Node.js
│   ├── config/             # Configuraciones
│   ├── controllers/        # Controladores
│   ├── middleware/         # Middleware
│   ├── models/             # Modelos de datos
│   ├── routes/             # Rutas de API
│   ├── services/           # Servicios
│   └── utils/              # Utilidades
├── frontend/               # Cliente React
│   ├── public/             # Archivos públicos
│   ├── src/                # Código fuente
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas
│   │   ├── services/       # Servicios API
│   │   └── store/          # Estado Redux
├── database/               # Esquemas de base de datos
└── docs/                   # Documentación
```

## 🗄️ Configuración de Base de Datos

### 1. Instalar PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Descargar desde: https://www.postgresql.org/download/windows/

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

### 2. Crear Base de Datos

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# En la consola de PostgreSQL:
CREATE DATABASE suscripciones_db;
CREATE USER suscriptor WITH PASSWORD 'password_seguro';
GRANT ALL PRIVILEGES ON DATABASE suscripciones_db TO suscriptor;
\q
```

### 3. Ejecutar Esquema de Base de Datos

```bash
# Navegar al directorio del proyecto
cd sistema_suscripciones

# Ejecutar esquema
psql -h localhost -U suscriptor -d suscripciones_db -f database/schema.sql
```

## ⚙️ Configuración del Backend

### 1. Clonar Repositorio
```bash
git clone <repository-url>
cd sistema_suscripciones/backend
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar el archivo .env
nano .env
```

**Configuración Básica del .env:**
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suscripciones_db
DB_USER=suscriptor
DB_PASSWORD=password_seguro

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
JWT_EXPIRES_IN=7d

# Servidor
NODE_ENV=development
PORT=3000

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true

# SMS (opcional para desarrollo)
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Configurar Base de Datos

```bash
# Verificar conexión a la base de datos
npm run health-check
```

### 5. Iniciar Servidor de Desarrollo

```bash
# Modo desarrollo con auto-reload
npm run dev

# O modo normal
npm start
```

**El servidor estará disponible en:** `http://localhost:3000`

## 🎨 Configuración del Frontend

### 1. Navegar al Directorio Frontend
```bash
cd ../frontend
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno (Opcional)

Crear archivo `.env` en el directorio frontend:
```env
REACT_APP_API_URL=http://localhost:3000/api
```

### 4. Iniciar Aplicación de Desarrollo

```bash
npm start
```

**La aplicación estará disponible en:** `http://localhost:5173`

## 🐳 Instalación con Docker (Opcional)

### Dockerfile Backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Dockerfile Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: suscripciones_db
      POSTGRES_USER: suscriptor
      POSTGRES_PASSWORD: password_seguro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=suscripciones_db
      - DB_USER=suscriptor
      - DB_PASSWORD=password_seguro
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Ejecutar con Docker

```bash
# Construir e iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

## 🔧 Configuración de Producción

### 1. Variables de Entorno de Producción

```env
# .env.production
NODE_ENV=production
DB_HOST=tu_host_db
DB_NAME=tu_db_name
DB_USER=tu_db_user
DB_PASSWORD=tu_password_seguro

JWT_SECRET=tu_jwt_secret_super_seguro
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://tu-dominio.com
CORS_CREDENTIALS=true

# SSL/TLS
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Configuración de email
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
```

### 2. Instalar PM2 para Gestión de Procesos

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación en producción
cd backend
pm2 start ecosystem.config.js

# Configurar auto-inicio
pm2 startup
pm2 save
```

### 3. Configurar Nginx como Proxy

```nginx
# /etc/nginx/sites-available/sistema-suscripciones
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        root /var/www/sistema-suscripciones/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

## 📊 Configuración de Monitoreo

### 1. Configurar Logs

```javascript
// backend/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### 2. Configurar Sentry para Error Tracking

```bash
npm install @sentry/node @sentry/react
```

```javascript
// backend/config/sentry.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## 🧪 Pruebas

### 1. Pruebas del Backend

```bash
cd backend

# Instalar dependencias de testing
npm install --save-dev jest supertest

# Ejecutar pruebas
npm test

# Ejecutar pruebas con cobertura
npm run test:coverage
```

### 2. Pruebas del Frontend

```bash
cd frontend

# Ejecutar pruebas
npm test

# Pruebas de integración
npm run test:integration
```

### 3. Probar API Manualmente

```bash
# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/

# Obtener servicios
curl http://localhost:3000/api/servicios/activos
```

## 🔒 Configuración de Seguridad

### 1. Configurar Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. Configurar Rate Limiting

```env
# Límites más estrictos en producción
RATE_LIMIT_WINDOW=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=50
```

### 3. Configurar Backup Automático

```bash
# Crear script de backup
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/sistema-suscripciones"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -h localhost -U suscriptor -d suscripciones_db > $BACKUP_DIR/db_backup_$DATE.sql

# Limpiar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +30 -delete

echo "Backup completado: db_backup_$DATE.sql"
```

```bash
# Hacer ejecutable
chmod +x backup.sh

# Agregar a crontab (backup diario a las 2 AM)
crontab -e
# 0 2 * * * /path/to/backup.sh
```

## 📝 Comandos Útiles

### Backend
```bash
# Iniciar servidor de desarrollo
npm run dev

# Iniciar servidor de producción
npm start

# Ejecutar pruebas
npm test

# Linting
npm run lint

# Formatear código
npm run format

# Health check
npm run health-check
```

### Base de Datos
```bash
# Conectar a base de datos
psql -h localhost -U suscriptor -d suscripciones_db

# Ejecutar esquema
psql -h localhost -U suscriptor -d suscripciones_db -f database/schema.sql

# Backup
pg_dump -h localhost -U suscriptor -d suscripciones_db > backup.sql

# Restore
psql -h localhost -U suscriptor -d suscripciones_db < backup.sql
```

### Docker
```bash
# Construir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Reiniciar servicios
docker-compose restart
```

## 🚨 Solución de Problemas

### Problemas Comunes

#### Error de Conexión a Base de Datos
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar configuración de conexión
psql -h localhost -U suscriptor -d suscripciones_db -c "SELECT version();"
```

#### Error de Puertos en Uso
```bash
# Encontrar proceso usando puerto 3000
lsof -i :3000

# Matar proceso
kill -9 <PID>
```

#### Error de Permisos
```bash
# Verificar permisos de archivos
ls -la backend/

# Corregir permisos
chmod +x backend/server.js
```

#### Errores de npm
```bash
# Limpiar cache de npm
npm cache clean --force

# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Logs y Debugging

```bash
# Ver logs del servidor
tail -f backend/logs/combined.log

# Ver logs de PM2
pm2 logs

# Ver logs de Docker
docker-compose logs backend
```

## 📞 Soporte

### Documentación Adicional
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Manual de Usuario](docs/USER_MANUAL.md)
- [Manual de Administración](docs/ADMIN_MANUAL.md)

### Contacto
- **Email:** soporte@sistema.com
- **Teléfono:** +52 55 1234 5678
- **Documentación:** https://docs.sistema.com

---

**¡Instalación Completada! 🎉**

El sistema estará disponible en:
- **Backend API:** http://localhost:3000
- **Frontend:** http://localhost:5173
- **Admin Panel:** http://localhost:5173/admin

**Credenciales por defecto:**
- **Admin:** username: `admin`, password: `admin123`

**Desarrollado por:** MiniMax Agent