#!/bin/bash

# ==============================================
# SCRIPT PARA DETENER SISTEMA DE SUSCRIPCIONES
# ==============================================

echo "🛑 Deteniendo Sistema de Gestión de Suscripciones..."
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

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}[ERROR]${NC} docker-compose.yml no encontrado. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# Mostrar estado actual
echo -e "${BLUE}[INFO]${NC} Estado actual de los contenedores:"
docker-compose ps
echo

# Preguntar si desea eliminar volúmenes
read -p "¿Eliminar volúmenes de datos? (ADVERTENCIA: Se perderán todos los datos) (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Deteniendo servicios y eliminando volúmenes..."
    docker-compose down -v
    print_warning "Volúmenes eliminados. Los datos se han perdido."
else
    print_status "Deteniendo servicios (manteniendo volúmenes)..."
    docker-compose down
fi

# Limpiar contenedores huérfanos
print_status "Limpiando contenedores huérfanos..."
docker-compose down --remove-orphans

# Mostrar mensaje final
echo
echo -e "${GREEN}✅ Sistema detenido correctamente${NC}"
echo "=============================================="
echo -e "${YELLOW}💡 Para iniciar nuevamente:${NC}"
echo "  ./start.sh"
echo "  o"
echo "  docker-compose up -d"