#!/bin/bash

# ==============================================================================
# SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS - CUENTY FASE 3
# ==============================================================================
# Este script ejecuta las migraciones necesarias para la Fase 3 Enterprise.
# Requiere que el contenedor de base de datos esté corriendo.
# ==============================================================================

set -e

DB_CONTAINER="cuenty_db" # Ajustar nombre según docker-compose/stack
DB_USER="admin"
DB_NAME="suscripciones_db"

echo "🐘 Verificando estado de la base de datos..."
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "⚠️  El contenedor '$DB_CONTAINER' no parece estar corriendo."
    echo "    Intentando ejecutar con nombre genérico 'database' o buscando por puerto 5432..."
    DB_CONTAINER=$(docker ps --filter "publish=5432" --format "{{.Names}}" | head -n 1)

    if [ -z "$DB_CONTAINER" ]; then
        echo "❌ No se encontró ningún contenedor de base de datos corriendo."
        echo "   Por favor, inicia los servicios con: ./deploy_fase3.sh o docker-compose up -d"
        exit 1
    fi
fi

echo "✅ Base de datos encontrada en contenedor: $DB_CONTAINER"

# Función para ejecutar SQL
run_sql() {
    local file=$1
    echo "📂 Ejecutando $file..."
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$file"
}

echo "🚀 Iniciando migraciones..."

# 1. Schema Base (si es necesario)
if [ -f "database/schema.sql" ]; then
    echo "   (Opcional) Ejecutando schema base..."
    # run_sql "database/schema.sql"  # Descomentar si es instalación limpia
fi

# 2. Migración Fase 3 Enterprise
if [ -f "database/migrations/003_add_fase3_enterprise.sql" ]; then
    run_sql "database/migrations/003_add_fase3_enterprise.sql"
else
    echo "❌ Error: No se encuentra 003_add_fase3_enterprise.sql"
    exit 1
fi

# 3. Migración Providers (WAHA/MercadoPago)
if [ -f "database/migrations/004_add_providers_columns.sql" ]; then
    run_sql "database/migrations/004_add_providers_columns.sql"
else
    echo "❌ Error: No se encuentra 004_add_providers_columns.sql"
    exit 1
fi

# 4. Migración Chatwoot
if [ -f "database/migrations/005_add_chatwoot_tables.sql" ]; then
    run_sql "database/migrations/005_add_chatwoot_tables.sql"
else
    echo "❌ Error: No se encuentra 005_add_chatwoot_tables.sql"
    exit 1
fi

echo "✨ Migraciones completadas exitosamente."
echo "✅ La base de datos está lista para Fase 3 Enterprise."
