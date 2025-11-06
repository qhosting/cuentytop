# GUÍA DE TESTING FASE 2 - CUENTY

**Versión:** 2.0.0  
**Fecha:** 2025-11-06

---

## TABLA DE CONTENIDOS

1. [Preparación](#preparación)
2. [Testing por Sistema](#testing-por-sistema)
3. [Testing de Integración](#testing-de-integración)
4. [Testing Manual](#testing-manual)
5. [Checklist Final](#checklist-final)

---

## PREPARACIÓN

### 1. Configuración Inicial

```bash
# Asegurar que el backend está corriendo
cd backend
npm start

# En otra terminal, verificar health check
curl http://localhost:3000/health
```

### 2. Obtener Token JWT

```bash
# Login (ajustar con datos reales)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "+5215512345678",
    "codigo": "123456"
  }'

# Guardar el token
export TOKEN="tu_token_jwt_aqui"
```

### 3. Variables de Entorno

Verificar que `.env` tiene todas las variables necesarias:

```bash
cat .env | grep -E "(TWILIO|CODI|CHATWOOT|VAPID)"
```

---

## TESTING POR SISTEMA

### SISTEMA 1: 2FA

#### Test 1.1: Activar 2FA WhatsApp

```bash
curl -X POST http://localhost:3000/api/fase2/2fa/activate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metodo": "whatsapp",
    "telefono": "+5215512345678"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "method": { ... },
    "backupCodes": ["CODE1", "CODE2", ..., "CODE10"]
  }
}
```

#### Test 1.2: Enviar Código 2FA

```bash
curl -X POST http://localhost:3000/api/fase2/2fa/send-code \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metodo": "whatsapp",
    "proposito": "login"
  }'
```

**Verificar:** Debe llegar mensaje de WhatsApp con código de 6 dígitos

#### Test 1.3: Verificar Código 2FA

```bash
curl -X POST http://localhost:3000/api/fase2/2fa/verify-code \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "123456",
    "proposito": "login"
  }'
```

#### Test 1.4: Obtener Métodos 2FA

```bash
curl -X GET http://localhost:3000/api/fase2/2fa/methods \
  -H "Authorization: Bearer $TOKEN"
```

#### Test 1.5: Desactivar 2FA

```bash
curl -X POST http://localhost:3000/api/fase2/2fa/deactivate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metodo": "whatsapp"
  }'
```

---

### SISTEMA 2: Dashboard Usuario

#### Test 2.1: Obtener Dashboard Completo

```bash
curl -X GET http://localhost:3000/api/fase2/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "usuario": { ... },
    "estadisticas": {
      "totalOrdenes": 10,
      "totalGastado": 2500.00
    },
    "suscripcionesActivas": [...],
    "transaccionesRecientes": [...]
  }
}
```

#### Test 2.2: Historial de Transacciones

```bash
curl -X GET "http://localhost:3000/api/fase2/dashboard/transactions?limit=10&tipo_pago=SPEI" \
  -H "Authorization: Bearer $TOKEN"
```

#### Test 2.3: Suscripciones Activas

```bash
curl -X GET http://localhost:3000/api/fase2/dashboard/subscriptions \
  -H "Authorization: Bearer $TOKEN"
```

#### Test 2.4: Actualizar Perfil

```bash
curl -X PUT http://localhost:3000/api/fase2/dashboard/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombreCompleto": "Juan Pérez García",
    "ciudad": "Ciudad de México",
    "estado": "CDMX",
    "codigoPostal": "01000"
  }'
```

---

### SISTEMA 3: Carrito Fiscal

#### Test 3.1: Agregar Datos Fiscales

```bash
curl -X POST http://localhost:3000/api/fase2/tax/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rfc": "HEGG900906JT3",
    "razonSocial": "Juan Pérez García",
    "regimenFiscal": "Régimen de Incorporación Fiscal",
    "codigoPostalFiscal": "01000",
    "direccionFiscal": "Av. Insurgentes Sur 123",
    "ciudadFiscal": "Ciudad de México",
    "estadoFiscal": "CDMX",
    "usoCfdi": "G03",
    "emailFacturacion": "juan@example.com",
    "esPersonaMoral": false
  }'
```

**Verificar:** RFC debe validarse con regex mexicano

#### Test 3.2: Obtener Datos Fiscales

```bash
curl -X GET http://localhost:3000/api/fase2/tax/data \
  -H "Authorization: Bearer $TOKEN"
```

#### Test 3.3: Aplicar Código Promocional

```bash
curl -X POST http://localhost:3000/api/fase2/tax/apply-promo \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "BIENVENIDO25",
    "subtotal": 1000.00
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "descuento": 250.00,
  "promocion": {
    "codigo": "BIENVENIDO25",
    "nombre": "Bienvenida 25%",
    "tipoDescuento": "porcentaje",
    "valorDescuento": 25.00
  }
}
```

#### Test 3.4: Obtener Promociones Activas

```bash
curl -X GET http://localhost:3000/api/fase2/tax/promotions
```

---

### SISTEMA 4: PWA

#### Test 4.1: Verificar Manifest

```bash
curl http://localhost:3000/manifest.json
```

**Verificar:** Debe retornar JSON válido con iconos, nombre, etc.

#### Test 4.2: Verificar Service Worker

```bash
curl http://localhost:3000/service-worker.js
```

**Verificar:** Debe retornar código JavaScript del service worker

#### Test 4.3: Registrar Token Push

```bash
curl -X POST http://localhost:3000/api/fase2/pwa/register-push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "BExample...",
        "auth": "ExampleAuth..."
      }
    },
    "deviceInfo": {
      "deviceType": "mobile",
      "browser": "Chrome"
    }
  }'
```

#### Test 4.4: Enviar Notificación Push de Prueba

```bash
curl -X POST http://localhost:3000/api/fase2/pwa/test-push \
  -H "Authorization: Bearer $TOKEN"
```

**Verificar:** Debe recibir notificación en dispositivo registrado

#### Test 4.5: Guardar en Caché Offline

```bash
curl -X POST http://localhost:3000/api/fase2/pwa/save-cache \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cacheKey": "user_orders",
    "cacheData": {"orders": [...]},
    "tipoRecurso": "order",
    "expiresIn": 86400
  }'
```

#### Test 4.6: Obtener de Caché Offline

```bash
curl -X GET "http://localhost:3000/api/fase2/pwa/get-cache?cacheKey=user_orders" \
  -H "Authorization: Bearer $TOKEN"
```

---

### SISTEMA 5: CoDi

#### Test 5.1: Crear Cuenta CoDi

```bash
curl -X POST http://localhost:3000/api/fase2/codi/create-account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoCuenta": "fisica"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "account": {
    "numero_cuenta": "9112345678",
    "clabe_codi": "012001XXXXXXXXXXX",
    "estado": "pending"
  }
}
```

#### Test 5.2: Generar QR CoDi

```bash
curl -X POST http://localhost:3000/api/fase2/codi/generate-qr \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ordenId": 123
  }'
```

**Verificar:** Debe retornar `qrImage` en formato base64

#### Test 5.3: Verificar Pago CoDi (Webhook)

```bash
curl -X POST http://localhost:3000/api/fase2/codi/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "referenciaCodi": "CODI1234567890",
    "datosWebhook": {
      "status": "completed",
      "amount": 500.00
    }
  }'
```

#### Test 5.4: Obtener Transacciones CoDi

```bash
curl -X GET "http://localhost:3000/api/fase2/codi/transactions?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### SISTEMA 6: Consultas Teléfono

#### Test 6.1: Webhook Twilio (Simular)

```bash
curl -X POST http://localhost:3000/api/fase2/phone-consultation/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+5215512345678" \
  -d "Body=Cuales son mis cuentas activas?" \
  -d "MessagingServiceSid=MGXXX"
```

**Resultado esperado:** Respuesta TwiML con mensaje

#### Test 6.2: Historial de Consultas

```bash
curl -X GET "http://localhost:3000/api/fase2/phone-consultation/history?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### SISTEMA 7: Automation

#### Test 7.1: Obtener Workflows

```bash
curl -X GET http://localhost:3000/api/fase2/automation/workflows \
  -H "Authorization: Bearer $TOKEN"
```

#### Test 7.2: Crear Workflow

```bash
curl -X POST http://localhost:3000/api/fase2/automation/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test Workflow",
    "descripcion": "Workflow de prueba",
    "triggerEvento": "pago_recibido",
    "triggerCondiciones": {},
    "acciones": [
      {
        "tipo": "notificacion",
        "canal": "whatsapp",
        "template": "PAGO_CONFIRMADO"
      }
    ],
    "prioridad": 1
  }'
```

#### Test 7.3: Ejecutar Workflow Manualmente

```bash
curl -X POST http://localhost:3000/api/fase2/automation/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "triggerEvento": "pago_recibido",
    "triggerData": {
      "ordenId": 123,
      "usuarioId": 1,
      "monto": 500.00
    }
  }'
```

#### Test 7.4: Activar/Desactivar Workflow

```bash
curl -X PUT http://localhost:3000/api/fase2/automation/workflows/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activo": false
  }'
```

---

### SISTEMA 8: Estadísticas Consolidadas

#### Test 8.1: Obtener Estadísticas de Todos los Sistemas

```bash
curl -X GET http://localhost:3000/api/fase2/statistics \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "fiscal": { ... },
    "codi": { ... },
    "consultas": { ... },
    "pwa": { ... },
    "automatizacion": { ... }
  }
}
```

---

## TESTING DE INTEGRACIÓN

### Flujo Completo 1: Compra con 2FA + CoDi

```bash
# 1. Activar 2FA
curl -X POST http://localhost:3000/api/fase2/2fa/activate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metodo": "whatsapp", "telefono": "+5215512345678"}'

# 2. Agregar al carrito
curl -X POST http://localhost:3000/api/cart/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"servicioId": 1, "planId": 1, "cantidad": 1}'

# 3. Agregar datos fiscales
curl -X POST http://localhost:3000/api/fase2/tax/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfc": "HEGG900906JT3", ...}'

# 4. Crear orden
curl -X POST http://localhost:3000/api/ordenes/create \
  -H "Authorization: Bearer $TOKEN"

# 5. Generar QR CoDi
curl -X POST http://localhost:3000/api/fase2/codi/generate-qr \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ordenId": 123}'

# 6. Simular pago CoDi
curl -X POST http://localhost:3000/api/fase2/codi/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"referenciaCodi": "CODI...", ...}'

# 7. Verificar en dashboard
curl -X GET http://localhost:3000/api/fase2/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### Flujo Completo 2: Consulta Teléfono → Chatwoot

```bash
# 1. Simular consulta WhatsApp
curl -X POST http://localhost:3000/api/fase2/phone-consultation/webhook \
  -d "From=whatsapp:+5215512345678" \
  -d "Body=Tengo un problema con mi cuenta"

# Verificar: Debe crear conversación en Chatwoot

# 2. Verificar historial
curl -X GET http://localhost:3000/api/fase2/phone-consultation/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## TESTING MANUAL

### PWA - Instalación Móvil

1. Abrir sitio en Chrome móvil (Android) o Safari (iOS)
2. Verificar banner de instalación aparece
3. Instalar PWA
4. Verificar icono aparece en home screen
5. Abrir PWA instalada
6. Verificar funciona como app nativa

### PWA - Modo Offline

1. Abrir PWA instalada
2. Navegar a varias páginas
3. Activar modo avión
4. Navegar entre páginas cacheadas
5. Verificar `/offline.html` aparece si página no está cacheada

### 2FA - Flujo Completo

1. Activar 2FA desde configuración
2. Guardar códigos de respaldo
3. Cerrar sesión
4. Iniciar sesión
5. Verificar que solicita código 2FA
6. Ingresar código recibido por WhatsApp
7. Verificar acceso concedido

### Notificaciones Push

1. Permitir notificaciones en navegador
2. Registrar token push
3. Enviar notificación de prueba
4. Verificar notificación aparece
5. Click en notificación
6. Verificar navegación correcta

---

## CHECKLIST FINAL

### Backend

- [ ] Migración BD ejecutada sin errores
- [ ] Todas las tablas creadas (18 nuevas)
- [ ] Todas las vistas creadas (3 nuevas)
- [ ] Triggers funcionando correctamente
- [ ] 28 endpoints respondiendo correctamente
- [ ] Autenticación JWT funcionando
- [ ] Rate limiting configurado

### 2FA

- [ ] Activación 2FA funciona
- [ ] Códigos enviados por SMS/WhatsApp
- [ ] Verificación de códigos funciona
- [ ] Códigos de respaldo generados
- [ ] Desactivación 2FA funciona

### Dashboard

- [ ] Dashboard carga datos correctamente
- [ ] Transacciones mostradas (SPEI + CoDi)
- [ ] Suscripciones activas con fechas
- [ ] Actualización de perfil funciona
- [ ] Estadísticas correctas

### Carrito Fiscal

- [ ] Validación RFC funciona
- [ ] Cálculo IVA 16% correcto
- [ ] Códigos promocionales aplican descuento
- [ ] Datos fiscales se guardan correctamente

### PWA

- [ ] Manifest.json accesible
- [ ] Service Worker se registra
- [ ] PWA se puede instalar
- [ ] Modo offline funciona
- [ ] Notificaciones push funcionan

### CoDi

- [ ] Creación de cuentas CoDi funciona
- [ ] QR generado correctamente
- [ ] QR expira en 15 minutos
- [ ] Verificación de pago funciona
- [ ] Transacciones registradas

### Consultas Teléfono

- [ ] Webhook Twilio responde
- [ ] Bot responde consultas comunes
- [ ] Derivación a Chatwoot funciona
- [ ] Historial de consultas disponible

### Notificaciones

- [ ] Templates cargados en BD
- [ ] Notificaciones SMS enviadas
- [ ] Notificaciones WhatsApp enviadas
- [ ] Notificaciones Push enviadas
- [ ] Logs de notificaciones correctos

### Automatización

- [ ] Workflows precargados funcionan
- [ ] Creación de workflows funciona
- [ ] Ejecución de workflows exitosa
- [ ] Logs de ejecución guardados
- [ ] Activar/desactivar workflows funciona

### Integraciones

- [ ] Twilio configurado y funcionando
- [ ] CoDi API accesible (si disponible)
- [ ] Chatwoot integrado
- [ ] Web Push funcionando

### Documentación

- [ ] FASE_2_IMPLEMENTATION.md completo
- [ ] RESUMEN_FASE2.md disponible
- [ ] TESTING_GUIDE_FASE2.md (este archivo)
- [ ] Scripts de instalación funcionales

---

## COMANDOS ÚTILES

### Ver logs en tiempo real
```bash
tail -f backend/logs/server.log
```

### Verificar tablas BD
```bash
psql -d suscripciones_db -c "\dt"
```

### Ver workflows activos
```bash
psql -d suscripciones_db -c "SELECT * FROM automation_workflows WHERE activo = TRUE;"
```

### Ver notificaciones recientes
```bash
psql -d suscripciones_db -c "SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;"
```

### Limpiar caché expirado
```bash
psql -d suscripciones_db -c "SELECT cleanup_expired_cache();"
```

---

## TROUBLESHOOTING

### Error: "VAPID keys not configured"
```bash
# Generar nuevas keys
npx web-push generate-vapid-keys

# Agregar al .env
echo "VAPID_PUBLIC_KEY=BxxxYourPublicKey" >> .env
echo "VAPID_PRIVATE_KEY=YourPrivateKey" >> .env
```

### Error: "Twilio credentials invalid"
```bash
# Verificar en .env
cat .env | grep TWILIO

# Probar desde Twilio Console
```

### Error: "RFC inválido"
```bash
# RFC Persona Física: 13 caracteres (AAAA######XXX)
# RFC Persona Moral: 12 caracteres (AAA######XXX)

# Ejemplos válidos:
# HEGG900906JT3
# CPM840916GT1
```

---

**FIN DE LA GUÍA DE TESTING FASE 2**

Para más información, consulta: `docs/FASE_2_IMPLEMENTATION.md`
