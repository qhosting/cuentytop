#!/bin/bash

# =====================================================
# SCRIPT DE INSTALACIÓN FASE 2 - CUENTY
# Versión: 2.0.0
# Fecha: 2025-11-06
# =====================================================

set -e  # Salir si hay error

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          INSTALACIÓN FASE 2 - CUENTY                     ║"
echo "║                 Versión 2.0.0                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funciones de ayuda
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_step() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# =====================================================
# PASO 1: VERIFICAR REQUISITOS
# =====================================================

print_step "1. Verificando requisitos"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    exit 1
fi
NODE_VERSION=$(node -v)
print_success "Node.js $NODE_VERSION"

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi
NPM_VERSION=$(npm -v)
print_success "npm $NPM_VERSION"

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL no está instalado"
    exit 1
fi
PG_VERSION=$(psql --version | awk '{print $3}')
print_success "PostgreSQL $PG_VERSION"

# Verificar Docker (opcional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}')
    print_success "Docker $DOCKER_VERSION (opcional)"
else
    print_warning "Docker no encontrado (opcional)"
fi

# =====================================================
# PASO 2: INSTALAR DEPENDENCIAS BACKEND
# =====================================================

print_step "2. Instalando dependencias del backend"

cd backend

if [ ! -f "package.json" ]; then
    print_error "package.json no encontrado en /backend"
    exit 1
fi

# Instalar dependencias
npm install

# Verificar instalación de web-push
if npm list web-push &> /dev/null; then
    print_success "web-push instalado"
else
    print_warning "Instalando web-push..."
    npm install web-push
fi

print_success "Dependencias del backend instaladas"

cd ..

# =====================================================
# PASO 3: GENERAR VAPID KEYS
# =====================================================

print_step "3. Generando VAPID Keys para PWA"

if [ ! -f ".env" ]; then
    print_warning ".env no existe, creando desde .env.example"
    cp .env.example .env
fi

# Verificar si ya existen las VAPID keys
if grep -q "VAPID_PUBLIC_KEY=" .env && [ -n "$(grep "VAPID_PUBLIC_KEY=" .env | cut -d '=' -f2)" ]; then
    print_success "VAPID Keys ya configuradas"
else
    print_warning "Generando nuevas VAPID Keys..."
    
    # Instalar web-push globalmente si no está
    if ! command -v web-push &> /dev/null; then
        npm install -g web-push
    fi
    
    # Generar keys
    VAPID_OUTPUT=$(npx web-push generate-vapid-keys)
    PUBLIC_KEY=$(echo "$VAPID_OUTPUT" | grep "Public Key:" | cut -d ':' -f2 | xargs)
    PRIVATE_KEY=$(echo "$VAPID_OUTPUT" | grep "Private Key:" | cut -d ':' -f2 | xargs)
    
    # Agregar al .env
    if grep -q "VAPID_PUBLIC_KEY=" .env; then
        sed -i "s|VAPID_PUBLIC_KEY=.*|VAPID_PUBLIC_KEY=$PUBLIC_KEY|" .env
    else
        echo "VAPID_PUBLIC_KEY=$PUBLIC_KEY" >> .env
    fi
    
    if grep -q "VAPID_PRIVATE_KEY=" .env; then
        sed -i "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$PRIVATE_KEY|" .env
    else
        echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY" >> .env
    fi
    
    print_success "VAPID Keys generadas y guardadas en .env"
fi

# =====================================================
# PASO 4: VERIFICAR CONFIGURACIÓN
# =====================================================

print_step "4. Verificando configuración"

# Verificar variables de entorno críticas
REQUIRED_VARS=(
    "DB_HOST"
    "DB_PORT"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "JWT_SECRET"
)

MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$VAR=" .env || [ -z "$(grep "^$VAR=" .env | cut -d '=' -f2)" ]; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Variables de entorno faltantes:"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "  - $VAR"
    done
    print_warning "Por favor, configura estas variables en .env"
else
    print_success "Variables de entorno críticas configuradas"
fi

# Verificar variables opcionales (FASE 2)
OPTIONAL_VARS=(
    "TWILIO_ACCOUNT_SID"
    "TWILIO_AUTH_TOKEN"
    "CODI_API_URL"
    "CHATWOOT_API_URL"
)

MISSING_OPTIONAL=()

for VAR in "${OPTIONAL_VARS[@]}"; do
    if ! grep -q "^$VAR=" .env || [ -z "$(grep "^$VAR=" .env | cut -d '=' -f2)" ]; then
        MISSING_OPTIONAL+=("$VAR")
    fi
done

if [ ${#MISSING_OPTIONAL[@]} -gt 0 ]; then
    print_warning "Variables opcionales FASE 2 no configuradas:"
    for VAR in "${MISSING_OPTIONAL[@]}"; do
        echo "  - $VAR"
    done
    echo ""
    print_warning "Algunas funciones de FASE 2 no estarán disponibles"
fi

# =====================================================
# PASO 5: MIGRACIÓN BASE DE DATOS
# =====================================================

print_step "5. Ejecutando migración de base de datos FASE 2"

# Leer credenciales de .env
DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2)
DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2)
DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2)

echo "Base de datos: $DB_NAME"
echo "Usuario: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

read -p "¿Ejecutar migración FASE 2? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    # Ejecutar migración
    PGPASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2) \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -f database/migrations/002_add_fase2_systems.sql
    
    if [ $? -eq 0 ]; then
        print_success "Migración FASE 2 ejecutada exitosamente"
    else
        print_error "Error ejecutando migración"
        exit 1
    fi
else
    print_warning "Migración omitida (deberás ejecutarla manualmente)"
fi

# =====================================================
# PASO 6: VERIFICAR INSTALACIÓN
# =====================================================

print_step "6. Verificando instalación"

# Contar tablas nuevas
TABLE_COUNT=$(PGPASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2) \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)

print_success "$TABLE_COUNT tablas en base de datos"

# Verificar archivos PWA
if [ -f "frontend/public/service-worker.js" ]; then
    print_success "Service Worker encontrado"
else
    print_warning "Service Worker no encontrado"
fi

if [ -f "frontend/public/manifest.json" ]; then
    print_success "Manifest.json encontrado"
else
    print_warning "Manifest.json no encontrado"
fi

# =====================================================
# PASO 7: INSTRUCCIONES FINALES
# =====================================================

print_step "7. Instalación completada"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║            INSTALACIÓN FASE 2 COMPLETADA                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

print_success "FASE 2 instalada exitosamente"

echo ""
echo "PRÓXIMOS PASOS:"
echo ""
echo "1. Configurar variables de entorno FASE 2 (si no lo has hecho):"
echo "   - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN"
echo "   - CODI_API_URL, CODI_PUBLIC_KEY"
echo "   - CHATWOOT_API_URL, CHATWOOT_ADMIN_TOKEN"
echo ""
echo "2. Iniciar el servidor:"
echo "   cd backend && npm start"
echo ""
echo "3. Verificar endpoints FASE 2:"
echo "   curl http://localhost:3000/health"
echo ""
echo "4. Revisar documentación completa:"
echo "   docs/FASE_2_IMPLEMENTATION.md"
echo "   RESUMEN_FASE2.md"
echo ""
echo "5. Realizar testing completo de todos los sistemas"
echo ""

if [ ${#MISSING_OPTIONAL[@]} -gt 0 ]; then
    print_warning "IMPORTANTE: Algunas funciones de FASE 2 requieren configuración adicional"
    echo ""
    echo "Sistemas que requieren configuración:"
    echo "  - 2FA y Notificaciones → Twilio"
    echo "  - Pagos CoDi → API CoDi"
    echo "  - Consultas teléfono → Chatwoot"
    echo ""
fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Para soporte, consulta la documentación técnica        ║"
echo "║  Desarrollado por: MiniMax Agent                         ║"
echo "║  Versión: 2.0.0                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"

exit 0
