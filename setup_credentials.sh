#!/bin/bash

# ==============================================================================
# SCRIPT DE CONFIGURACIÓN DE CREDENCIALES - CUENTY FASE 3
# ==============================================================================
# Este script genera un archivo .env seguro a partir del template .env.example.fase3
# Genera secretos aleatorios para JWT y Base de Datos.
# ==============================================================================

set -e

TEMPLATE_FILE=".env.example.fase3"
OUTPUT_FILE=".env"

echo "🔍 Verificando template..."
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo $TEMPLATE_FILE"
    exit 1
fi

echo "🔐 Generando secretos seguros..."
# Generar secretos usando openssl
JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)

echo "📄 Creando archivo $OUTPUT_FILE..."
cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

# Reemplazar placeholders usando sed
# Nota: Usamos separador | para evitar conflictos con caracteres especiales
if [[ "$OSTYPE" == "darwin"* ]]; then
    # MacOS syntax
    sed -i '' "s|CAMBIAR_POR_JWT_SECRET_MUY_SEGURO|$JWT_SECRET|g" "$OUTPUT_FILE"
    sed -i '' "s|CAMBIAR_POR_PASSWORD_SEGURO|$DB_PASSWORD|g" "$OUTPUT_FILE"
else
    # Linux syntax
    sed -i "s|CAMBIAR_POR_JWT_SECRET_MUY_SEGURO|$JWT_SECRET|g" "$OUTPUT_FILE"
    sed -i "s|CAMBIAR_POR_PASSWORD_SEGURO|$DB_PASSWORD|g" "$OUTPUT_FILE"
fi

echo "✅ Archivo .env creado exitosamente."
echo "🔑 JWT_SECRET y DB_PASSWORD han sido configurados con valores aleatorios."
echo ""
echo "⚠️  IMPORTANTE:"
echo "   Edita el archivo .env manualmente para agregar tus credenciales externas:"
echo "   - WAHA_KEY"
echo "   - MP_ACCESS_TOKEN"
echo "   - SMTP_PASSWORD"
echo ""
