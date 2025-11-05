#!/bin/bash

# ==============================================
# SCRIPT DE INICIO RÁPIDO PARA SISTEMA DE SUSCRIPCIONES
# Optimizado para Easypanel
# ==============================================

set -e  # Salir si cualquier comando falla

echo "🚀 Iniciando Sistema de Gestión de Suscripciones..."
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml no encontrado. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# Verificar que el archivo .env existe
if [ ! -f ".env" ]; then
    print_warning "Archivo .env no encontrado. Copiando desde .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Archivo .env creado. IMPORTANTE: Configura las credenciales seguras antes de continuar."
        print_warning "Edita el archivo .env y cambia las passwords por defecto."
        exit 1
    else
        print_error ".env.example no encontrado. Creando .env básico..."
        cat > .env << 'EOF'
DB_PASSWORD=CAMBIAR_PASSWORD_AQUI
JWT_SECRET=CAMBIAR_JWT_SECRET_AQUI
CORS_ORIGIN=http://localhost:3000
REACT_APP_API_URL=http://localhost:3000/api
EOF
        print_warning "Archivo .env básico creado. Configura las credenciales seguras."
        exit 1
    fi
fi

# Verificar variables críticas
print_status "Verificando configuración de variables de entorno..."

# Verificar que las passwords no sean por defecto
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)
if [ "$DB_PASSWORD" = "admin123" ] || [ "$DB_PASSWORD" = "CAMBIAR_PASSWORD_AQUI" ]; then
    print_error "La password de base de datos usa valores por defecto. Configura una password segura en .env"
    exit 1
fi

JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
if [ "$JWT_SECRET" = "suscripciones_jwt_secret_2024_easypanel" ] || [ "$JWT_SECRET" = "CAMBIAR_JWT_SECRET_AQUI" ]; then
    print_error "El JWT_SECRET usa valores por defecto. Configura un JWT secret seguro en .env"
    exit 1
fi

print_success "Variables de entorno verificadas"

# Limpiar contenedores e imágenes anteriores (opcional)
read -p "¿Limpiar contenedores e imágenes anteriores? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Limpiando contenedores y imágenes..."
    docker-compose down --remove-orphans
    docker system prune -f
    print_success "Limpieza completada"
fi

# Construir e iniciar servicios
print_status "Construyendo imágenes Docker..."
docker-compose build --no-cache

print_status "Iniciando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
print_status "Esperando a que los servicios estén disponibles..."

# Verificar que PostgreSQL esté listo
print_status "Verificando base de datos..."
for i in {1..30}; do
    if docker-compose exec -T database pg_isready -U admin > /dev/null 2>&1; then
        print_success "Base de datos disponible"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "La base de datos no está disponible después de 30 segundos"
        docker-compose logs database
        exit 1
    fi
    sleep 1
done

# Verificar que el backend esté listo
print_status "Verificando API backend..."
for i in {1..30}; do
    if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Backend API disponible"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "El backend no está disponible después de 30 segundos"
        docker-compose logs backend
        exit 1
    fi
    sleep 1
done

# Verificar que el frontend esté listo
print_status "Verificando frontend..."
for i in {1..30}; do
    if curl -f -s http://localhost:80 > /dev/null 2>&1; then
        print_success "Frontend disponible"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "El frontend no está disponible después de 30 segundos"
        docker-compose logs frontend
        exit 1
    fi
    sleep 1
done

# Mostrar información final
echo
echo "🎉 ¡Sistema iniciado correctamente!"
echo "=============================================="
echo -e "${GREEN}🌐 Frontend:${NC}     http://localhost:80"
echo -e "${GREEN}🔌 Backend API:${NC} http://localhost:3000"
echo -e "${GREEN}🗄️  Base de Datos:${NC} localhost:5432"
echo
echo -e "${BLUE}📊 Estado de servicios:${NC}"
docker-compose ps
echo
echo -e "${YELLOW}🔍 Para ver logs:${NC}"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"
echo "  docker-compose logs -f database"
echo
echo -e "${YELLOW}🛑 Para detener:${NC}"
echo "  docker-compose down"
echo
echo -e "${GREEN}✅ ¡Sistema de Gestión de Suscripciones funcionando!${NC}"
echo "=============================================="