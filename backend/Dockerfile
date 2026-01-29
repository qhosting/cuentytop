# Backend Dockerfile para Sistema de Gestión de Suscripciones
# Optimizado para despliegue en Easypanel

# Usar imagen oficial de Node.js LTS
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    postgresql-client \
    mongodb-tools \
    curl

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p /app/logs

# Cambiar permisos de archivos
RUN chmod +x server.js

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]