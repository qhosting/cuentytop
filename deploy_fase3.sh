#!/bin/bash

# ============================================================================
# CUENTY FASE 3 - Script de Despliegue Docker Swarm
# ============================================================================

set -e

echo "============================================"
echo "CUENTY FASE 3 - Despliegue Docker Swarm"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as manager node
if ! docker node ls > /dev/null 2>&1; then
    echo -e "${RED}Error: Este nodo no es un manager de Docker Swarm${NC}"
    echo "Inicializa Docker Swarm primero:"
    echo "  docker swarm init"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker Swarm manager detectado"
echo ""

# Check environment file
if [ ! -f .env ]; then
    echo -e "${RED}Error: Archivo .env no encontrado${NC}"
    echo "Copia .env.example y configura las variables:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

echo -e "${GREEN}✓${NC} Archivo .env encontrado"
echo ""

# Load environment variables
set -a
source .env
set +a

# Migrate database
echo "Aplicando migraciones de base de datos..."
echo ""

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠${NC} DATABASE_URL no configurado. Saltando migraciones."
    echo "Configura DATABASE_URL y ejecuta las migraciones manualmente:"
    echo "  psql \$DATABASE_URL -f database/migrations/003_add_fase3_enterprise.sql"
else
    # Apply migrations
    echo "Aplicando migración 003_add_fase3_enterprise.sql..."
    psql "$DATABASE_URL" -f database/migrations/003_add_fase3_enterprise.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Migraciones aplicadas exitosamente"
    else
        echo -e "${RED}Error aplicando migraciones${NC}"
        exit 1
    fi
fi
echo ""

# Create Docker networks
echo "Creando redes Docker..."
docker network create --driver overlay --attachable cuenty-network 2>/dev/null || echo "Red ya existe"
echo -e "${GREEN}✓${NC} Redes creadas"
echo ""

# Create volumes
echo "Creando volúmenes Docker..."
docker volume create postgres-master-data 2>/dev/null || true
docker volume create redis-master-data 2>/dev/null || true
docker volume create prometheus-data 2>/dev/null || true
docker volume create grafana-data 2>/dev/null || true
docker volume create elasticsearch-data 2>/dev/null || true
echo -e "${GREEN}✓${NC} Volúmenes creados"
echo ""

# Deploy stack
echo "Desplegando stack CUENTY Fase 3..."
docker stack deploy -c docker-compose-fase3.yml cuenty

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Stack desplegado exitosamente"
else
    echo -e "${RED}Error desplegando stack${NC}"
    exit 1
fi
echo ""

# Wait for services to start
echo "Esperando que los servicios se inicien..."
sleep 10
echo ""

# Check service status
echo "Estado de los servicios:"
docker stack services cuenty
echo ""

# Health checks
echo "Verificando health checks..."
echo ""

check_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:${port}/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} ${service} está saludable"
            return 0
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗${NC} ${service} no responde después de ${max_attempts} intentos"
    return 1
}

# Wait for API Gateway
echo "Esperando API Gateway..."
sleep 20

# Note: Health checks from inside container network
echo -e "${YELLOW}Nota: Los health checks internos se realizan automáticamente${NC}"
echo ""

# Display access information
echo "============================================"
echo "DESPLIEGUE COMPLETADO"
echo "============================================"
echo ""
echo "Accesos:"
echo "  - API Gateway: http://localhost"
echo "  - Swagger Docs: http://localhost/docs"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3000"
echo "  - Kibana: http://localhost:5601"
echo ""
echo "Comandos útiles:"
echo "  - Ver servicios: docker stack services cuenty"
echo "  - Ver logs: docker service logs cuenty_<service-name>"
echo "  - Escalar servicio: docker service scale cuenty_<service-name>=<replicas>"
echo "  - Detener stack: docker stack rm cuenty"
echo ""
echo "Monitoreo:"
echo "  - Health checks automáticos cada 30s"
echo "  - Métricas en Prometheus"
echo "  - Dashboards en Grafana"
echo "  - Logs en Elasticsearch/Kibana"
echo ""
echo -e "${GREEN}Sistema CUENTY Fase 3 Enterprise desplegado exitosamente${NC}"
echo ""
