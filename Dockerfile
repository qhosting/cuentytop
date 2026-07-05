# ==========================================================
# Dockerfile Multietapa para Backend + Frontend (Monolítico)
# ==========================================================

# Etapa 1: Construcción del Frontend (React + Vite)
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Ejecuta build (Vite por defecto genera la carpeta 'dist')
RUN npm run build

# Etapa 2: Servidor de Producción Backend (Node.js Express)
FROM node:18-alpine
RUN apk add --no-cache \
    postgresql-client \
    mongodb-tools \
    curl

WORKDIR /app

# Copiar dependencias del backend e instalar
COPY backend/package*.json ./
RUN npm install --only=production

# Copiar código del backend
COPY backend/ ./

# Copiar los archivos estáticos compilados del frontend a la carpeta public del backend
# Nota: Si tu build de Vite genera 'build' en vez de 'dist', cambia 'dist' por 'build'
COPY --from=frontend-builder /app/frontend/dist ./public

# Exponer el puerto del Backend (servirá API y Frontend)
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
