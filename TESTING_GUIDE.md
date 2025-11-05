# Guía Rápida de Testing - Sistema v3.0

## Testing Manual Rápido

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Respuesta esperada**:
```json
{
  "success": true,
  "mensaje": "Sistema de Suscripciones Operativo",
  "version": "2.0.0",
  "database": "Conectado"
}
```

---

## Testing de SPEI

### 1. Crear Orden (Prerequisito)

```bash
curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_USER_TOKEN" \
  -d '{
    "items": [
      {
        "servicio_id": 1,
        "plan_id": 1,
        "cantidad": 1
      }
    ]
  }'
```

### 2. Crear Transacción SPEI

```bash
curl -X POST http://localhost:3000/api/spei/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_USER_TOKEN" \
  -d '{
    "ordenId": 1
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "mensaje": "Transacción SPEI creada exitosamente",
  "data": {
    "referencia_spei": "ORD000001251106001234",
    "clabe_destino": "012180001234567890",
    "banco_destino": "BBVA México",
    "titular_destino": "TU EMPRESA S.A. DE C.V.",
    "monto": "150.00",
    "concepto": "Orden ORD-20250101-001"
  }
}
```

### 3. Consultar Transacción

```bash
# Por referencia
curl http://localhost:3000/api/spei/transactions/referencia/ORD000001251106001234 \
  -H "Authorization: Bearer TU_USER_TOKEN"

# Por orden
curl http://localhost:3000/api/spei/transactions/orden/1 \
  -H "Authorization: Bearer TU_USER_TOKEN"
```

### 4. Simular Webhook (Testing)

```bash
curl -X POST http://localhost:3000/api/spei/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "referencia": "ORD000001251106001234",
    "evento": "payment.confirmed",
    "monto": 150.00,
    "fecha_pago": "2025-11-06T10:30:00Z",
    "banco_origen": "Banorte",
    "cuenta_origen": "0987654321",
    "rastreo_bancario": "20251106ABC123"
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "mensaje": "Webhook recibido",
  "webhookId": 1
}
```

### 5. Verificar Confirmación

```bash
# La orden debe cambiar a estado "paid"
curl http://localhost:3000/api/ordenes/1 \
  -H "Authorization: Bearer TU_USER_TOKEN"
```

### 6. Estadísticas SPEI (Admin)

```bash
curl http://localhost:3000/api/spei/statistics \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
```

---

## Testing de Notificaciones

### 1. Verificar Templates

```sql
-- Conectar a PostgreSQL
psql -U postgres -d suscripciones_db

-- Ver templates
SELECT tipo, nombre FROM notification_templates;
```

**Output esperado**:
```
       tipo        |           nombre
-------------------+----------------------------
 verification      | Código de Verificación
 order_created     | Orden Creada
 payment_pending   | Pago Pendiente
 payment_received  | Pago Recibido
 credentials_delivered | Credenciales Entregadas
 order_cancelled   | Orden Cancelada
 admin_alert       | Alerta Administrativa
```

### 2. Test de Notificación Manual (desde código)

Crear archivo `test_notifications.js`:

```javascript
const NotificationService = require('./backend/services/notificationService');

async function testNotifications() {
    try {
        // Test envío de código de verificación
        const result = await NotificationService.send(
            'verification',
            null,
            '+525512345678', // Tu teléfono de prueba
            { codigo: '123456' }
        );
        
        console.log('Notificación enviada:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testNotifications();
```

Ejecutar:
```bash
cd backend
node test_notifications.js
```

### 3. Verificar Notificaciones en BD

```sql
-- Ver últimas notificaciones
SELECT 
    id, 
    tipo, 
    canal, 
    destinatario, 
    estado, 
    error_mensaje,
    created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### 4. Test de Notificación Automática

Las notificaciones se envían automáticamente al:

1. **Crear orden** → `order_created`
2. **Generar SPEI** → `payment_pending`
3. **Confirmar pago** → `payment_received`
4. **Entregar credenciales** → `credentials_delivered`

Para testing, crear una orden completa y verificar que se envíen todas las notificaciones.

---

## Testing de Panel Admin

### 1. Login Admin

```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "tu_password_admin"
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "username": "admin",
    "nombre_completo": "Administrador del Sistema"
  }
}
```

Guardar el token para siguientes requests.

### 2. Dashboard

```bash
curl http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
```

**Respuesta esperada**:
```json
{
  "success": true,
  "data": {
    "ordenes": {
      "total": "10",
      "pendientes": "2",
      "pagadas": "5",
      "entregadas": "3"
    },
    "usuarios": {
      "total": "25",
      "verificados": "20"
    },
    "spei": {
      "pendientes": "2",
      "completados": "8",
      "total_recaudado": "15000.00"
    }
  }
}
```

### 3. Listar Usuarios

```bash
curl "http://localhost:3000/api/admin/usuarios?limit=10&offset=0" \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
```

### 4. Detalle de Usuario

```bash
curl http://localhost:3000/api/admin/usuarios/1 \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
```

### 5. Reportes

```bash
# Reporte de ventas
curl "http://localhost:3000/api/admin/reportes?tipo=ventas&fecha_inicio=2025-01-01&fecha_fin=2025-12-31" \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"

# Reporte de usuarios
curl "http://localhost:3000/api/admin/reportes?tipo=usuarios&fecha_inicio=2025-01-01" \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"

# Reporte de servicios
curl "http://localhost:3000/api/admin/reportes?tipo=servicios" \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
```

---

## Testing de Chatwoot

### 1. Configurar Chatwoot

```bash
curl -X POST http://localhost:3000/api/admin/chatwoot/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_ADMIN_TOKEN" \
  -d '{
    "website_token": "tu_website_token_aqui",
    "api_access_token": "tu_api_token_aqui",
    "account_id": 1,
    "inbox_id": 1,
    "base_url": "https://app.chatwoot.com"
  }'
```

### 2. Obtener Configuración

```bash
curl http://localhost:3000/api/admin/chatwoot/config \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
```

**Respuesta esperada**:
```json
{
  "success": true,
  "data": {
    "websiteToken": "tu_website_token",
    "baseUrl": "https://app.chatwoot.com"
  }
}
```

### 3. Verificar en Frontend

Agregar script en HTML:
```html
<script>
  (function(d,t) {
    var BASE_URL="https://app.chatwoot.com";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: 'TU_WEBSITE_TOKEN',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>
```

Abrir navegador y verificar que aparezca el widget.

---

## Testing de Base de Datos

### 1. Verificar Tablas Nuevas

```sql
-- Conectar
psql -U postgres -d suscripciones_db

-- Listar tablas relacionadas con mejoras
\dt spei*
\dt notification*
\dt chatwoot*
```

**Output esperado**:
```
                List of relations
 Schema |         Name          | Type  |  Owner
--------+-----------------------+-------+----------
 public | spei_accounts         | table | postgres
 public | spei_transactions     | table | postgres
 public | spei_webhooks         | table | postgres
 public | notifications         | table | postgres
 public | notification_templates| table | postgres
 public | chatwoot_config       | table | postgres
 public | chatwoot_sessions     | table | postgres
```

### 2. Verificar Datos Iniciales

```sql
-- Templates de notificaciones
SELECT COUNT(*) FROM notification_templates;
-- Debe retornar: 7

-- Cuenta SPEI por defecto
SELECT banco, titular FROM spei_accounts WHERE activo = TRUE;
-- Debe retornar: 1 fila
```

### 3. Verificar Funciones

```sql
-- Función para generar referencias SPEI
SELECT generate_spei_reference(1);
-- Debe retornar: ORD000001YYMMDD####
```

---

## Testing de Integración Completa

### Flujo End-to-End

```bash
#!/bin/bash

# 1. Crear usuario y login
echo "1. Creando usuario..."
curl -X POST http://localhost:3000/api/auth/user/phone/request-code \
  -H "Content-Type: application/json" \
  -d '{"telefono": "+525512345678"}'

# Obtener código de la BD
CODE=$(psql -U postgres -d suscripciones_db -t -c \
  "SELECT codigo FROM phone_verifications WHERE telefono='+525512345678' ORDER BY created_at DESC LIMIT 1")

echo "2. Verificando código..."
USER_TOKEN=$(curl -X POST http://localhost:3000/api/auth/user/phone/verify-code \
  -H "Content-Type: application/json" \
  -d "{\"telefono\": \"+525512345678\", \"codigo\": \"$CODE\"}" \
  | jq -r '.token')

# 2. Crear orden
echo "3. Creando orden..."
ORDER_ID=$(curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"items": [{"servicio_id": 1, "plan_id": 1, "cantidad": 1}]}' \
  | jq -r '.data.id')

# 3. Crear transacción SPEI
echo "4. Creando transacción SPEI..."
SPEI_REF=$(curl -X POST http://localhost:3000/api/spei/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"ordenId\": $ORDER_ID}" \
  | jq -r '.data.referencia_spei')

echo "5. Referencia SPEI: $SPEI_REF"

# 4. Simular pago
echo "6. Simulando webhook de pago..."
curl -X POST http://localhost:3000/api/spei/webhook \
  -H "Content-Type: application/json" \
  -d "{\"referencia\": \"$SPEI_REF\", \"evento\": \"payment.confirmed\"}"

# 5. Verificar orden pagada
echo "7. Verificando orden..."
curl http://localhost:3000/api/ordenes/$ORDER_ID \
  -H "Authorization: Bearer $USER_TOKEN"

echo "✓ Test completo finalizado"
```

---

## Checklist de Testing Pre-Producción

### Base de Datos
- [ ] Migraciones aplicadas correctamente
- [ ] Templates de notificaciones creados
- [ ] Cuenta SPEI configurada con datos reales
- [ ] Índices creados correctamente

### Configuración
- [ ] Variables de entorno configuradas
- [ ] JWT_SECRET seguro (32+ caracteres)
- [ ] Credenciales Twilio válidas
- [ ] Credenciales Email válidas
- [ ] Tokens Chatwoot válidos
- [ ] Datos SPEI reales (CLABE, banco, titular)

### SPEI
- [ ] Creación de transacciones funciona
- [ ] Referencias únicas generadas correctamente
- [ ] Webhook recibe confirmaciones
- [ ] Procesamiento automático funciona
- [ ] Estadísticas calculan correctamente

### Notificaciones
- [ ] Email se envía correctamente
- [ ] SMS se envía correctamente
- [ ] WhatsApp se envía correctamente
- [ ] Templates en español correcto
- [ ] Variables se reemplazan bien
- [ ] Notificaciones automáticas funcionan

### Panel Admin
- [ ] Login admin funciona
- [ ] Dashboard muestra métricas
- [ ] Gestión de usuarios funciona
- [ ] Reportes generan correctamente
- [ ] Permisos admin se validan

### Chatwoot
- [ ] Widget aparece en frontend
- [ ] Contactos se sincronizan
- [ ] Conversaciones se crean
- [ ] Mensajes se envían
- [ ] Notificaciones de orden funcionan

### Seguridad
- [ ] Rate limiting activo
- [ ] JWT tokens validan
- [ ] Middleware auth funciona
- [ ] Permisos admin se verifican
- [ ] Sanitización de inputs activa

---

## Troubleshooting Rápido

### Problema: "Connection refused"
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:3000/health

# Si no responde, iniciar servidor
cd backend
npm start
```

### Problema: "Database connection failed"
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar conexión
psql -U postgres -d suscripciones_db -c "SELECT 1"
```

### Problema: "Notificaciones no envían"
```sql
-- Ver notificaciones fallidas
SELECT * FROM notifications WHERE estado = 'failed' ORDER BY created_at DESC LIMIT 5;

-- Ver error
SELECT error_mensaje FROM notifications WHERE estado = 'failed' LIMIT 1;
```

### Problema: "Webhook no procesa"
```sql
-- Ver webhooks recibidos
SELECT * FROM spei_webhooks ORDER BY created_at DESC LIMIT 5;

-- Ver webhooks no procesados
SELECT * FROM spei_webhooks WHERE procesado = FALSE;
```

---

## Logs y Monitoreo

### Ver Logs de Aplicación
```bash
# Si usas npm start
# Los logs aparecen en la consola

# Si usas PM2
pm2 logs

# Logs de notificaciones fallidas
psql -U postgres -d suscripciones_db -c \
  "SELECT tipo, canal, error_mensaje FROM notifications WHERE estado='failed' LIMIT 10"
```

### Monitorear en Tiempo Real
```sql
-- Terminal 1: Monitorear órdenes
WATCH 5 "psql -U postgres -d suscripciones_db -c 'SELECT id, numero_orden, estado, total FROM ordenes ORDER BY created_at DESC LIMIT 10'"

-- Terminal 2: Monitorear SPEI
WATCH 5 "psql -U postgres -d suscripciones_db -c 'SELECT referencia_spei, estado, monto FROM spei_transactions ORDER BY created_at DESC LIMIT 10'"

-- Terminal 3: Monitorear notificaciones
WATCH 5 "psql -U postgres -d suscripciones_db -c 'SELECT tipo, canal, estado FROM notifications ORDER BY created_at DESC LIMIT 10'"
```

---

## Conclusión

Estos tests cubren todas las funcionalidades críticas de las mejoras implementadas:

1. ✅ Sistema SPEI completo
2. ✅ Panel Administrativo
3. ✅ Notificaciones multicanal
4. ✅ Integración Chatwoot

**Recomendación**: Ejecutar todos estos tests en ambiente de desarrollo antes de pasar a producción.

---

**Desarrollado por MiniMax Agent**
