# CUENTY FASE 3 - GUÍA DE INICIO RÁPIDO

## DEPLOYMENT EN 5 PASOS

### 1. Prerrequisitos
```bash
# Verificar Docker
docker --version  # Debe ser 20.10+
docker-compose --version  # Debe ser 2.0+

# Inicializar Docker Swarm
docker swarm init
```

### 2. Configuración
```bash
# Copiar archivo de variables de entorno
cp .env.example.fase3 .env

# Editar con tus credenciales
nano .env

# Variables CRÍTICAS a configurar:
# - DATABASE_URL (PostgreSQL)
# - JWT_SECRET (generar aleatorio)
# - TWILIO_* (para SMS/WhatsApp)
# - BBVA_*, SANTANDER_*, BANORTE_* (APIs bancarias)
```

### 3. Base de Datos
```bash
# Aplicar migración Fase 3
psql $DATABASE_URL -f database/migrations/003_add_fase3_enterprise.sql

# Verificar tablas creadas
psql $DATABASE_URL -c "\dt"
```

### 4. Deployment
```bash
# Ejecutar script de deployment
./deploy_fase3.sh

# O manualmente
docker stack deploy -c docker-compose-fase3.yml cuenty
```

### 5. Verificación
```bash
# Ver servicios
docker stack services cuenty

# Health checks
curl http://localhost/v1/auth/health
curl http://localhost/v1/payments/health
curl http://localhost/v1/analytics/health

# Acceder a Swagger
open http://localhost/docs
```

---

## ACCESOS POST-DEPLOYMENT

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **API Gateway** | http://localhost | N/A |
| **Swagger Docs** | http://localhost/docs | N/A |
| **Prometheus** | http://localhost:9090 | N/A |
| **Grafana** | http://localhost:3000 | admin / (ver .env) |
| **Kibana** | http://localhost:5601 | N/A |

---

## COMANDOS ÚTILES

### Docker Swarm
```bash
# Ver servicios
docker stack services cuenty

# Ver logs
docker service logs cuenty_auth-service -f

# Escalar servicio
docker service scale cuenty_auth-service=5

# Detener stack
docker stack rm cuenty
```

### Base de Datos
```bash
# Conectar
psql $DATABASE_URL

# Refrescar vistas
SELECT refresh_all_materialized_views();

# Ver métricas
SELECT * FROM dashboard_realtime_stats LIMIT 10;
```

---

## TESTING RÁPIDO

### Registro + Login
```bash
# Registrar usuario
curl -X POST http://localhost/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Usuario Test",
    "phone": "+525512345678"
  }'

# Login (guardar token)
TOKEN=$(curl -X POST http://localhost/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')
```

### Generar SPEI
```bash
curl -X POST http://localhost/v1/payments/spei/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "amount": 299.00}'
```

---

## DOCUMENTACIÓN COMPLETA

- **Técnica:** `docs/fase3/FASE_3_TECHNICAL_DOCUMENTATION.md`
- **Ejecutiva:** `docs/fase3/RESUMEN_EJECUTIVO_FASE3.md`
- **Inventario:** `docs/fase3/INVENTARIO_FASE3.md`
- **Entrega:** `ENTREGA_FINAL_FASE3.md`

---

**CUENTY Fase 3 Enterprise - Production Ready**
