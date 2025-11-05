#!/bin/bash

# =====================================================
# Script de Instalación - Sistema de Suscripciones v3.0
# Mejoras para México: SPEI + Panel Admin + Notificaciones
# =====================================================

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     SISTEMA DE SUSCRIPCIONES v3.0 - INSTALACIÓN         ║"
echo "║              Mejoras para México                         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "backend/package.json" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

print_info "Iniciando instalación..."
echo ""

# 1. Verificar Node.js
print_info "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor, instala Node.js 16+ primero."
    exit 1
fi
NODE_VERSION=$(node -v)
print_success "Node.js encontrado: $NODE_VERSION"

# 2. Verificar PostgreSQL
print_info "Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL no está instalado. Por favor, instala PostgreSQL 13+ primero."
    exit 1
fi
print_success "PostgreSQL encontrado"

# 3. Instalar dependencias backend
print_info "Instalando dependencias del backend..."
cd backend
npm install
cd ..
print_success "Dependencias instaladas"

# 4. Configurar variables de entorno
print_info "Configurando variables de entorno..."
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        print_success "Archivo .env creado desde .env.example"
        print_info "⚠️  IMPORTANTE: Debes editar backend/.env con tus configuraciones"
    else
        print_error "No se encontró .env.example"
    fi
else
    print_info ".env ya existe, no se sobrescribe"
fi

# 5. Crear base de datos
print_info "¿Deseas crear la base de datos ahora? (s/n)"
read -r CREATE_DB

if [ "$CREATE_DB" = "s" ] || [ "$CREATE_DB" = "S" ]; then
    print_info "Ingresa el nombre de la base de datos [suscripciones_db]:"
    read -r DB_NAME
    DB_NAME=${DB_NAME:-suscripciones_db}
    
    print_info "Ingresa el usuario de PostgreSQL [postgres]:"
    read -r DB_USER
    DB_USER=${DB_USER:-postgres}
    
    print_info "Creando base de datos..."
    createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || print_info "La base de datos ya existe"
    
    # Aplicar schema principal
    print_info "Aplicando schema principal..."
    psql -U "$DB_USER" -d "$DB_NAME" -f database/schema.sql
    print_success "Schema aplicado"
    
    # Aplicar migraciones
    print_info "Aplicando migraciones (SPEI, Notificaciones, Chatwoot)..."
    psql -U "$DB_USER" -d "$DB_NAME" -f database/migrations/001_add_spei_system.sql
    print_success "Migraciones aplicadas"
else
    print_info "Saltando creación de base de datos"
    print_info "⚠️  Recuerda ejecutar:"
    print_info "   psql -U postgres -d suscripciones_db -f database/schema.sql"
    print_info "   psql -U postgres -d suscripciones_db -f database/migrations/001_add_spei_system.sql"
fi

echo ""
print_success "Instalación completada!"
echo ""

# Instrucciones finales
echo "╔══════════════════════════════════════════════════════════╗"
echo "║               PRÓXIMOS PASOS                             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "1. Editar backend/.env con tus configuraciones:"
echo "   - Base de datos (DB_HOST, DB_USER, DB_PASSWORD)"
echo "   - JWT_SECRET (generar uno seguro)"
echo "   - Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)"
echo "   - Email (EMAIL_USER, EMAIL_PASSWORD)"
echo "   - Chatwoot (CHATWOOT_WEBSITE_TOKEN, etc.)"
echo "   - SPEI (datos de tu cuenta bancaria)"
echo ""
echo "2. Actualizar cuenta SPEI en la base de datos:"
echo "   psql -d suscripciones_db"
echo "   UPDATE spei_accounts SET"
echo "     banco = 'Tu Banco',"
echo "     titular = 'TU EMPRESA',"
echo "     clabe = 'TU_CLABE',"
echo "     numero_cuenta = 'TU_CUENTA'"
echo "   WHERE id = 1;"
echo ""
echo "3. Iniciar el servidor:"
echo "   cd backend"
echo "   npm start"
echo ""
echo "4. Verificar que todo funciona:"
echo "   curl http://localhost:3000/health"
echo ""
echo "5. Leer documentación completa:"
echo "   - docs/GUIA_MEJORAS_MEXICO.md"
echo "   - README_V3.md"
echo ""
print_success "Sistema listo para usar!"
echo ""
echo "Para soporte, revisa la documentación o contacta al equipo."
echo ""
