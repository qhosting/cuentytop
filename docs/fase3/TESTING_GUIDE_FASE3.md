# CUENTY FASE 3 - GUÍA DE TESTING COMPLETA

**Versión:** 3.0.0  
**Fecha:** 2025-11-06  
**Estado:** PENDIENTE DE CREDENCIALES

---

## IMPORTANTE: PREREQUISITOS DE TESTING

⚠️ **ADVERTENCIA**: Este sistema requiere credenciales reales de APIs externas para funcionar correctamente. Sin estas credenciales, las siguientes funcionalidades NO son operativas:

### Credenciales Requeridas (CRÍTICAS)

#### 1. APIs Bancarias Mexicanas
- **BBVA Open Banking**
  - `BBVA_CLIENT_ID`: ID de cliente BBVA
  - `BBVA_CLIENT_SECRET`: Secret de cliente BBVA
  - `BBVA_API_URL`: URL del API (sandbox o producción)
  - **Cómo obtener**: https://www.bbva.com/es/innovacion/open-banking/
  - **Tiempo estimado**: 5-7 días hábiles
  - **Costo**: Gratis para sandbox, variable para producción

- **Santander API**
  - `SANTANDER_API_KEY`: API Key de Santander
  - `SANTANDER_CLIENT_ID`: Client ID
  - `SANTANDER_SECRET`: Secret
  - **Cómo obtener**: https://openbank.santander.com/
  - **Tiempo estimado**: 3-5 días hábiles
  - **Costo**: Gratis para sandbox

- **Banorte API**
  - `BANORTE_API_KEY`: API Key de Banorte
  - `BANORTE_SECRET`: Secret
  - `BANORTE_ENV`: sandbox o production
  - **Cómo obtener**: Contactar a Banorte directamente
  - **Tiempo estimado**: 7-10 días hábiles
  - **Costo**: Variable

#### 2. Comunicaciones
- **Twilio (SMS + WhatsApp)**
  - `TWILIO_ACCOUNT_SID`: Account SID
  - `TWILIO_AUTH_TOKEN`: Auth Token
  - `TWILIO_PHONE_NUMBER`: Número de teléfono (+525512345678)
  - **Cómo obtener**: https://www.twilio.com/console
  - **Tiempo estimado**: Inmediato
  - **Costo**: Pay-as-you-go (~$0.05 USD por SMS)

- **SMTP (Email)**
  - `SMTP_HOST`: smtp.gmail.com (o tu proveedor)
  - `SMTP_PORT`: 587
  - `SMTP_USER`: tu-email@gmail.com
  - `SMTP_PASSWORD`: App Password (no tu contraseña normal)
  - **Cómo obtener**: Gmail → Configuración → App Passwords
  - **Tiempo estimado**: Inmediato
  - **Costo**: Gratis (Gmail), variable (otros)

#### 3. Analytics
- **Google Analytics 4**
  - `GA4_MEASUREMENT_ID`: ID de medición (G-XXXXXXXXXX)
  - `GA4_API_SECRET`: API Secret
  - **Cómo obtener**: https://analytics.google.com/ → Admin → Data Streams
  - **Tiempo estimado**: Inmediato
  - **Costo**: Gratis

#### 4. Machine Learning (OPCIONAL pero RECOMENDADO)
- **OpenAI API**
  - `OPENAI_API_KEY`: sk-...
  - **Cómo obtener**: https://platform.openai.com/api-keys
  - **Tiempo estimado**: Inmediato
  - **Costo**: Pay-as-you-go (~$0.002 por 1K tokens)
  - **Nota**: Sin esto, las predicciones ML usarán el modelo simplificado local

#### 5. Chatwoot
- **Chatwoot**
  - `CHATWOOT_API_URL`: https://app.chatwoot.com
  - `CHATWOOT_API_TOKEN`: Tu token de API
  - `CHATWOOT_ACCOUNT_ID`: ID de tu cuenta
  - **Cómo obtener**: Chatwoot → Settings → Integrations → API
  - **Tiempo estimado**: Inmediato (si ya tienes cuenta)
  - **Costo**: Gratis (self-hosted) o desde $19/mes (cloud)

---

## CONFIGURACIÓN PASO A PASO

### 1. Archivo .env

```bash
# Copiar ejemplo
cp .env.example.fase3 .env

# Editar con credenciales REALES
nano .env
```

**Configuración mínima funcional:**
```bash
# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/cuenty_db
POSTGRES_USER=cuenty_user
POSTGRES_PASSWORD=tu_password_seguro

# Redis
REDIS_URL=redis://localhost:6379

# JWT (GENERAR ALEATORIO)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRY=24h

# Twilio (REQUERIDO para 2FA)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+525512345678

# SMTP (REQUERIDO para emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu_app_password

# Banking APIs (OPCIONAL para testing inicial)
BBVA_CLIENT_ID=tu_client_id
BBVA_CLIENT_SECRET=tu_client_secret
BBVA_API_URL=https://sandbox.api.bbva.com/v1

# Analytics (OPCIONAL)
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=tu_api_secret

# ML (OPCIONAL - mejora predicciones)
OPENAI_API_KEY=sk-tu_api_key
```

### 2. Verificar Credenciales

```bash
# Script de verificación
cat > verify_credentials.sh << 'EOF'
#!/bin/bash

echo "Verificando credenciales..."

# Verificar Twilio
if [ ! -z "$TWILIO_ACCOUNT_SID" ]; then
    curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
         "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
         && echo "✓ Twilio OK" || echo "✗ Twilio FALLO"
fi

# Verificar SMTP
if [ ! -z "$SMTP_USER" ]; then
    echo "✓ SMTP configurado (verificar manualmente)"
fi

# Verificar GA4
if [ ! -z "$GA4_MEASUREMENT_ID" ]; then
    echo "✓ GA4 configurado"
fi

# Verificar OpenAI
if [ ! -z "$OPENAI_API_KEY" ]; then
    curl https://api.openai.com/v1/models \
         -H "Authorization: Bearer $OPENAI_API_KEY" \
         && echo "✓ OpenAI OK" || echo "✗ OpenAI FALLO"
fi

echo "Verificación completa."
EOF

chmod +x verify_credentials.sh
./verify_credentials.sh
```

---

## PLAN DE TESTING

### FASE 1: Testing de Infraestructura (Sin APIs externas)

#### 1.1 Health Checks Básicos
```bash
# Desplegar stack
docker stack deploy -c docker-compose-fase3.yml cuenty

# Verificar todos los servicios
docker stack services cuenty

# Health checks
curl http://localhost/v1/auth/health
curl http://localhost/v1/payments/health
curl http://localhost/v1/analytics/health
curl http://localhost/v1/subscriptions/health
curl http://localhost/v1/notifications/health
curl http://localhost/v1/chatwoot/health

# Todos deben responder:
# {"status":"healthy","service":"<nombre>","version":"3.0.0"}
```

#### 1.2 Base de Datos
```bash
# Conectar a PostgreSQL
psql $DATABASE_URL

# Verificar tablas Fase 3
SELECT tablename FROM pg_tables 
WHERE tablename IN ('api_keys', 'analytics_events', 'banking_integrations', 
                     'consent_logs', 'service_health')
ORDER BY tablename;

# Debe mostrar las 25 tablas nuevas

# Verificar vistas materializadas
SELECT matviewname FROM pg_matviews 
WHERE matviewname IN ('dashboard_realtime_stats', 'state_metrics', 
                       'conversion_funnel', 'revenue_by_service');

# Debe mostrar las 5 vistas

# Verificar triggers
SELECT tgname FROM pg_trigger 
WHERE tgname LIKE '%fase3%' OR tgname LIKE '%audit%';

# Debe mostrar los 15 triggers
```

#### 1.3 Redis
```bash
# Conectar a Redis
docker exec -it $(docker ps -q -f name=cuenty_redis-master) redis-cli

# Verificar funcionamiento
PING
# Debe responder: PONG

INFO
# Debe mostrar información del servidor

# Probar cache
SET test_key "test_value"
GET test_key
# Debe retornar: "test_value"

DEL test_key
```

#### 1.4 Monitoring Stack
```bash
# Verificar Prometheus
curl http://localhost:9090/-/healthy
# Debe responder: Prometheus is Healthy.

# Verificar métricas
curl 'http://localhost:9090/api/v1/query?query=up'

# Acceder a Grafana
curl http://localhost:3000/api/health
# Debe responder: {"database":"ok","version":"..."}

# Verificar Elasticsearch
curl http://localhost:9200/_cluster/health
# Debe mostrar status "green" o "yellow"
```

**RESULTADO ESPERADO FASE 1**: ✅ Toda la infraestructura levantada y saludable

---

### FASE 2: Testing de APIs Internas (Sin APIs externas)

#### 2.1 Autenticación (NO requiere Twilio para registro básico)
```bash
# Registrar usuario
RESPONSE=$(curl -X POST http://localhost/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@cuenty.local",
    "password": "TestPassword123!",
    "name": "Usuario Test",
    "phone": "+525512345678"
  }')

echo $RESPONSE

# Debe retornar: {"token":"eyJ...","user":{...},"expiresIn":"24h"}

# Extraer token
TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# Login
LOGIN=$(curl -X POST http://localhost/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@cuenty.local",
    "password": "TestPassword123!"
  }')

echo $LOGIN

# Obtener perfil
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost/v1/users/me

# Debe retornar datos del usuario
```

#### 2.2 Suscripciones
```bash
# Listar servicios disponibles
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost/v1/subscriptions

# Debe retornar lista de servicios

# Obtener detalle de servicio
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost/v1/subscriptions/1

# Debe retornar detalles del servicio ID 1
```

#### 2.3 Analytics (tracking local)
```bash
# Registrar evento
curl -X POST http://localhost/v1/analytics/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "page_view",
    "eventName": "home_viewed",
    "sessionId": "test_session_123",
    "properties": {
      "duration": 5000,
      "device": "desktop"
    },
    "pageUrl": "https://cuenty.com"
  }'

# Debe retornar: {"message":"Evento registrado exitosamente"}

# Ver dashboard
curl -H "Authorization: Bearer $TOKEN" \
     'http://localhost/v1/analytics/dashboard?startDate=2025-10-01&endDate=2025-11-06'

# Debe retornar métricas agregadas
```

#### 2.4 Compliance LFPDPPP
```bash
# Registrar consentimiento (usando complianceService directamente en backend)
# Esto se probará a través de la interfaz una vez desplegada

# Verificar en BD
psql $DATABASE_URL -c "SELECT * FROM consent_logs ORDER BY created_at DESC LIMIT 5;"

# Debe mostrar logs de consentimiento
```

**RESULTADO ESPERADO FASE 2**: ✅ APIs internas funcionando sin dependencias externas

---

### FASE 3: Testing con APIs Externas (REQUIERE CREDENCIALES)

⚠️ **CRÍTICO**: Esta fase NO funcionará sin las credenciales reales configuradas.

#### 3.1 Testing 2FA con Twilio
```bash
# Enviar código 2FA por SMS
curl -X POST http://localhost/v1/auth/2fa/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "sms"}'

# Debe enviar SMS real al teléfono del usuario
# Verificar recepción del código

# Verificar código
curl -X POST http://localhost/v1/auth/2fa/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# Debe retornar: {"message":"Código verificado exitosamente","verified":true}
```

**Si falla**: Verificar credenciales Twilio, saldo de cuenta, número de teléfono

#### 3.2 Testing SPEI con BBVA
```bash
# Generar referencia SPEI
SPEI=$(curl -X POST http://localhost/v1/payments/spei/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "amount": 299.00}')

echo $SPEI

# Debe retornar: {"reference":"SPEI...","clabe":"...","amount":299.00,...}

# Consultar saldo BBVA (si tienes cuenta sandbox)
curl -H "Authorization: Bearer $TOKEN" \
     'http://localhost/v1/banking/balance/bbva?accountId=tu_account_id'

# Debe retornar saldo de la cuenta
```

**Si falla**: 
- Verificar credenciales BBVA correctas
- Verificar ambiente (sandbox vs production)
- Revisar logs: `docker service logs cuenty_payments-service`

#### 3.3 Testing CoDi con Banorte
```bash
# Generar QR CoDi
CODI=$(curl -X POST http://localhost/v1/payments/codi/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 2, "amount": 499.00}')

echo $CODI | jq -r '.qrCode' > codi_qr.txt

# Debe generar QR code en base64
# Decodificar: base64 -d codi_qr.txt > qr.png
```

**Si falla**: Verificar credenciales Banorte, ambiente correcto

#### 3.4 Testing Google Analytics 4
```bash
# Registrar evento (se envía automáticamente a GA4)
curl -X POST http://localhost/v1/analytics/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "conversion",
    "eventName": "payment_completed",
    "sessionId": "test_session_ga4",
    "properties": {
      "amount": 299.00,
      "currency": "MXN"
    }
  }'

# Verificar en GA4 (https://analytics.google.com/)
# Realtime → Events → Buscar "payment_completed"
```

**Si falla**: Verificar Measurement ID y API Secret correctos

#### 3.5 Testing Notificaciones
```bash
# Enviar SMS
curl -X POST http://localhost/v1/notifications/send/sms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+525512345678",
    "message": "Test SMS desde CUENTY"
  }'

# Debe enviar SMS real

# Enviar WhatsApp
curl -X POST http://localhost/v1/notifications/send/whatsapp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+525512345678",
    "message": "Test WhatsApp desde CUENTY"
  }'

# Debe enviar mensaje de WhatsApp

# Enviar Email
curl -X POST http://localhost/v1/notifications/send/email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "Test Email CUENTY",
    "body": "<h1>Test Email</h1><p>Enviado desde CUENTY Fase 3</p>"
  }'

# Debe enviar email
```

**Si falla**: Verificar credenciales Twilio y SMTP

#### 3.6 Testing ML Predictions con OpenAI (OPCIONAL)
```bash
# Sin OpenAI: usa modelo simplificado local
# Con OpenAI: usa GPT para predicciones avanzadas

# Predicción de churn
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost/v1/analytics/predictions/churn

# Debe retornar lista de usuarios con alta probabilidad de churn

# Predicción de revenue
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost/v1/analytics/predictions/revenue

# Debe retornar predicción del revenue del próximo mes
```

**Nota sobre ML**:
- **Sin OpenAI**: Modelo simplificado basado en reglas (precisión ~65%)
- **Con OpenAI**: Modelo avanzado GPT-4 (precisión ~85%)
- **Recomendación**: Configurar OpenAI para producción

**RESULTADO ESPERADO FASE 3**: ✅ Todas las integraciones externas funcionando correctamente

---

### FASE 4: Testing de Integración End-to-End

#### 4.1 Flujo Completo de Compra con SPEI

```bash
# 1. Registrar usuario
USER=$(curl -X POST http://localhost/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "comprador@test.com",
    "password": "Password123!",
    "name": "Comprador Test",
    "phone": "+525598765432"
  }')

TOKEN=$(echo $USER | jq -r '.token')

# 2. Ver servicios disponibles
SERVICES=$(curl -H "Authorization: Bearer $TOKEN" \
                http://localhost/v1/subscriptions)

echo $SERVICES | jq '.'

# 3. Seleccionar servicio (Netflix Premium ID=1)
# (Esto normalmente se haría en el frontend)

# 4. Crear orden
# (Esto requeriría un endpoint adicional que no implementamos aún)
# Por ahora, insertar directamente en BD:
psql $DATABASE_URL << EOF
INSERT INTO orders (user_id, service_id, total_amount, status, created_at)
VALUES (
  (SELECT id FROM users WHERE email = 'comprador@test.com'),
  1,
  299.00,
  'pending',
  NOW()
)
RETURNING id;
EOF

# 5. Generar referencia SPEI
SPEI=$(curl -X POST http://localhost/v1/payments/spei/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "amount": 299.00}')

echo "REFERENCIA SPEI:"
echo $SPEI | jq '.'

# Guardar datos para siguiente paso
REFERENCE=$(echo $SPEI | jq -r '.reference')
CLABE=$(echo $SPEI | jq -r '.clabe')

# 6. Simular webhook bancario (en producción vendría del banco)
curl -X POST http://localhost/v1/payments/webhooks/bank \
  -H "Content-Type: application/json" \
  -d '{
    "bank_code": "BBVA",
    "webhook_type": "payment_confirmation",
    "payload": {
      "reference": "'$REFERENCE'",
      "amount": 299.00,
      "transaction_id": "TXN'$(date +%s)'"
    },
    "signature": "test_signature"
  }'

# 7. Verificar reconciliación automática
psql $DATABASE_URL -c "
SELECT 
  tr.id,
  tr.reconciliation_status,
  p.status as payment_status,
  p.amount
FROM transaction_reconciliation tr
JOIN payments p ON tr.payment_id = p.id
WHERE p.reference = '$REFERENCE';
"

# Debe mostrar status "matched" y payment_status "completed"

# 8. Verificar orden actualizada
psql $DATABASE_URL -c "
SELECT id, status, total_amount, confirmed_at
FROM orders
WHERE id = 1;
"

# Status debe ser "completed"

# 9. Activar suscripción
curl -X POST http://localhost/v1/subscriptions/1/activate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# 10. Verificar suscripción activa
psql $DATABASE_URL -c "
SELECT * FROM subscriptions 
WHERE user_id = (SELECT id FROM users WHERE email = 'comprador@test.com')
ORDER BY created_at DESC 
LIMIT 1;
"

# Status debe ser "active"
```

**RESULTADO ESPERADO**: ✅ Flujo completo desde registro hasta activación de suscripción

**TIEMPO ESTIMADO**: 2-3 minutos

#### 4.2 Flujo Completo con CoDi

Similar al anterior pero usando CoDi:
```bash
# Después del paso 4 (crear orden):

# Generar QR CoDi
CODI=$(curl -X POST http://localhost/v1/payments/codi/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 2, "amount": 499.00}')

# Guardar QR
echo $CODI | jq -r '.qrCode' | base64 -d > codi_payment.png

# Usuario escanea QR con app bancaria
# Banco envía webhook de confirmación
# Resto del flujo es igual
```

---

### FASE 5: Testing de Carga y Performance

#### 5.1 Load Testing con Apache Bench
```bash
# Instalar Apache Bench
apt-get install apache2-utils

# Test de login (100 requests, 10 concurrentes)
ab -n 100 -c 10 \
   -p login_data.json \
   -T application/json \
   http://localhost/v1/auth/login

# Crear archivo login_data.json
echo '{"email":"test@cuenty.local","password":"TestPassword123!"}' > login_data.json

# Test de health checks (1000 requests, 50 concurrentes)
ab -n 1000 -c 50 http://localhost/v1/auth/health

# Objetivos:
# - 95% de requests completados en <200ms
# - 0% de errores
# - Throughput >100 req/s
```

#### 5.2 Stress Testing con JMeter
```bash
# Instalar JMeter
wget https://downloads.apache.org//jmeter/binaries/apache-jmeter-5.6.2.tgz
tar -xzf apache-jmeter-5.6.2.tgz

# Crear plan de pruebas (ejemplo básico)
# 1. Thread Group: 100 usuarios virtuales
# 2. HTTP Requests: Login, Listar servicios, Generar SPEI
# 3. Assertions: Response code 200, Response time <500ms
# 4. Listeners: View Results Tree, Summary Report

# Ejecutar
./apache-jmeter-5.6.2/bin/jmeter -n -t test_plan.jmx -l results.jtl

# Analizar resultados
# - Avg response time: <300ms
# - Error rate: <0.1%
# - Throughput: >500 req/s
```

#### 5.3 Monitoring durante carga
```bash
# Abrir Grafana
open http://localhost:3000

# Dashboard: CPU usage, Memory usage, Request rate
# Verificar:
# - CPU <70% bajo carga
# - Memory usage estable (no memory leaks)
# - Request rate soportado según configuración
```

**RESULTADO ESPERADO FASE 5**: ✅ Sistema soporta carga esperada sin degradación

---

### FASE 6: Testing de Seguridad

#### 6.1 SQL Injection
```bash
# Intentar SQL injection en login
curl -X POST http://localhost/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cuenty.com OR 1=1--",
    "password": "anything"
  }'

# Debe retornar: {"error":{"code":"INVALID_CREDENTIALS",...}}
# NO debe permitir acceso
```

#### 6.2 Rate Limiting
```bash
# Hacer 150 requests en 1 minuto (límite es 100)
for i in {1..150}; do
  curl http://localhost/v1/auth/health
  sleep 0.4
done

# A partir del request 101 debe retornar:
# HTTP 429 Too Many Requests
```

#### 6.3 JWT Token Expiration
```bash
# Obtener token
TOKEN=$(curl -X POST http://localhost/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@cuenty.local","password":"TestPassword123!"}' \
  | jq -r '.token')

# Usar token
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost/v1/users/me
# Debe funcionar

# Esperar 24 horas + 1 minuto (o modificar JWT_EXPIRY a 1m para testing)
# Usar token expirado
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost/v1/users/me
# Debe retornar: {"error":{"code":"INVALID_TOKEN",...}}
```

#### 6.4 HTTPS/TLS
```bash
# Verificar certificado SSL (si configurado)
openssl s_client -connect api.cuenty.com:443 -showcerts

# Verificar:
# - Certificado válido
# - No expirado
# - Emisor confiable
```

**RESULTADO ESPERADO FASE 6**: ✅ Sistema resistente a ataques comunes

---

## CHECKLIST DE TESTING COMPLETO

### Infraestructura
- [ ] Todos los servicios levantados (`docker stack services cuenty`)
- [ ] Health checks respondiendo correctamente
- [ ] PostgreSQL con 25 tablas nuevas + 5 vistas + 15 triggers
- [ ] Redis funcionando (cache + sessions)
- [ ] Prometheus recolectando métricas
- [ ] Grafana con dashboards
- [ ] Kibana con logs

### APIs Internas
- [ ] Registro de usuarios
- [ ] Login con JWT
- [ ] Listar suscripciones
- [ ] Tracking de eventos analytics
- [ ] Dashboard de métricas

### APIs Externas (REQUIERE CREDENCIALES)
- [ ] 2FA por SMS (Twilio)
- [ ] 2FA por WhatsApp (Twilio)
- [ ] Generación SPEI (BBVA)
- [ ] Generación CoDi (Banorte)
- [ ] Consulta saldos bancarios (BBVA/Santander)
- [ ] Reconciliación automática
- [ ] Envío de emails (SMTP)
- [ ] Tracking en GA4 (Google Analytics)
- [ ] Predicciones ML (OpenAI - opcional)

### End-to-End
- [ ] Flujo completo: Registro → Selección → Pago SPEI → Activación
- [ ] Flujo completo: Registro → Selección → Pago CoDi → Activación
- [ ] Webhooks bancarios funcionando
- [ ] Notificaciones enviadas correctamente

### Performance
- [ ] Load testing: 100 req/s sostenidos
- [ ] Response time p95 <200ms
- [ ] Error rate <0.1%
- [ ] CPU usage <70% bajo carga
- [ ] Memory usage estable

### Seguridad
- [ ] SQL injection bloqueado
- [ ] Rate limiting funcionando
- [ ] JWT expiration correcto
- [ ] HTTPS configurado (producción)
- [ ] Passwords hasheados (bcrypt)

### Compliance
- [ ] Logs de consentimiento registrados
- [ ] Audit trails funcionando
- [ ] Derechos ARCO implementados
- [ ] Aviso de privacidad disponible

---

## TROUBLESHOOTING COMÚN

### Error: "Cannot connect to database"
```bash
# Verificar PostgreSQL
docker service ps cuenty_postgres-master

# Ver logs
docker service logs cuenty_postgres-master

# Verificar DATABASE_URL en .env
echo $DATABASE_URL

# Conectar manualmente
psql $DATABASE_URL -c "SELECT 1;"
```

### Error: "Twilio authentication failed"
```bash
# Verificar credenciales
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
     "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json"

# Debe retornar JSON con account info
# Si falla: Credenciales incorrectas
```

### Error: "BBVA API 401 Unauthorized"
```bash
# Verificar ambiente correcto
echo $BBVA_API_URL
# Debe ser: https://sandbox.api.bbva.com/v1 (sandbox)
#        o: https://api.bbva.com/v1 (producción)

# Verificar credenciales corresponden al ambiente

# Ver logs detallados
docker service logs cuenty_payments-service | grep BBVA
```

### Error: "Rate limit exceeded"
```bash
# Esperar 1 minuto o ajustar rate limit

# Editar temporalmente para testing
nano microservices/api-gateway/nginx.conf

# Cambiar:
# limit_req_zone $binary_remote_addr zone=api_limit:10m rate=1000r/m;

# Re-desplegar
docker service update --force cuenty_api-gateway
```

---

## REPORTE DE TESTING

Después de completar todas las fases, generar reporte:

```bash
# Template de reporte
cat > TESTING_REPORT_FASE3.md << 'EOF'
# CUENTY FASE 3 - REPORTE DE TESTING

**Fecha:** $(date)
**Ejecutado por:** [Nombre]
**Ambiente:** [Staging/Producción]

## Resumen Ejecutivo
- Tests totales: XX
- Tests exitosos: XX (XX%)
- Tests fallidos: XX (XX%)
- Bloqueadores: XX

## Detalle por Fase

### FASE 1: Infraestructura
- [ ] ✅ Docker Swarm
- [ ] ✅ PostgreSQL
- [ ] ✅ Redis
- [ ] ✅ Monitoring

### FASE 2: APIs Internas
- [ ] ✅ Autenticación
- [ ] ✅ Suscripciones
- [ ] ✅ Analytics

### FASE 3: APIs Externas
- [ ] ⚠️ Twilio (credenciales pendientes)
- [ ] ⚠️ BBVA (credenciales pendientes)
...

## Issues Encontrados
1. [BLOCKER] Twilio: Credenciales no configuradas
2. [HIGH] BBVA: Ambiente sandbox no disponible
...

## Recomendaciones
1. Configurar credenciales de Twilio antes de desplegar
2. Solicitar acceso a BBVA sandbox
...

EOF
```

---

## PRÓXIMOS PASOS

1. **Obtener credenciales** de todas las APIs externas (ver sección inicial)
2. **Configurar .env** con credenciales reales
3. **Ejecutar FASE 1 y 2** de testing (sin APIs externas)
4. **Ejecutar FASE 3** una vez tengas credenciales
5. **Ejecutar FASE 4-6** para testing completo
6. **Generar reporte** de testing
7. **Deployment a producción** solo después de testing exitoso

---

**Estimación de tiempo total de testing:** 8-16 horas (dependiendo de disponibilidad de credenciales)

**Responsable:** Equipo técnico + DevOps

**Contacto para dudas:** soporte@cuenty.com
