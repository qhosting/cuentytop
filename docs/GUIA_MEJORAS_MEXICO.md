# Guía de Implementación: Mejoras para México

## Resumen

Se han implementado 3 mejoras críticas para el Sistema de Gestión de Suscripciones adaptado al mercado mexicano:

1. **Sistema de Pagos SPEI**
2. **Panel Administrativo con Chatwoot**
3. **Sistema de Notificaciones Mexicano**

## 1. Sistema de Pagos SPEI

### Descripción
Sistema completo de pagos mediante transferencia SPEI (Sistema de Pagos Electrónicos Interbancarios) para México.

### Archivos Creados/Modificados

- **Base de Datos**: `database/migrations/001_add_spei_system.sql`
- **Servicio**: `backend/services/speiService.js`
- **Controlador**: `backend/controllers/speiController.js`
- **Rutas**: `backend/routes/speiRoutes.js`
- **Server**: `backend/server.js` (actualizado)

### Funcionalidades

#### Generación de Referencias SPEI
- Referencias únicas por orden
- Formato: `ORD` + ID orden + fecha + número aleatorio
- Validación de unicidad

#### Confirmación Automática de Pagos
- Webhooks para recepción de confirmaciones
- Procesamiento asíncrono
- Actualización automática de estado de órdenes

#### Gestión de Transacciones
- Estados: pending, processing, completed, failed, cancelled
- Tracking de pagos
- Historial completo

### API Endpoints

```
POST   /api/spei/transactions              - Crear transacción SPEI
GET    /api/spei/transactions/referencia/:ref - Obtener por referencia
GET    /api/spei/transactions/orden/:id    - Obtener por orden
POST   /api/spei/webhook                   - Webhook confirmación (público)
POST   /api/spei/transactions/:ref/confirm - Confirmar pago (admin)
POST   /api/spei/transactions/:ref/cancel  - Cancelar (admin)
GET    /api/spei/transactions              - Listar (admin)
GET    /api/spei/statistics                - Estadísticas (admin)
```

### Configuración

Variables de entorno necesarias:

```env
# Cuenta bancaria SPEI
SPEI_BANCO=BBVA México
SPEI_TITULAR=TU EMPRESA S.A. DE C.V.
SPEI_CLABE=012180001234567890
SPEI_NUMERO_CUENTA=0123456789

# Proveedor opcional (Conekta, OpenPay, etc.)
SPEI_PROVIDER=conekta
SPEI_API_KEY=tu_api_key
SPEI_API_SECRET=tu_api_secret
SPEI_WEBHOOK_SECRET=tu_webhook_secret
```

### Flujo de Uso

1. Usuario crea orden
2. Sistema genera transacción SPEI con referencia única
3. Sistema envía instrucciones de pago con:
   - CLABE interbancaria
   - Referencia única
   - Monto exacto
   - Banco y titular
4. Usuario realiza transferencia SPEI
5. Banco/proveedor envía webhook de confirmación
6. Sistema procesa webhook y confirma pago automáticamente
7. Orden cambia a estado "paid"
8. Usuario recibe notificación de confirmación

### Integración con Proveedores

El sistema está preparado para integrarse con proveedores como:
- **Conekta**
- **OpenPay**
- **Clip**
- **Banwire**

Para integrar un proveedor, implementar el webhook específico en `speiController.js`.

---

## 2. Panel Administrativo con Chatwoot

### Descripción
Dashboard administrativo completo con integración de Chatwoot para atención al cliente.

### Archivos Creados/Modificados

- **Servicio**: `backend/services/chatwootService.js`
- **Controlador**: `backend/controllers/adminController.js`
- **Rutas**: `backend/routes/adminRoutes.js`
- **Middleware**: `backend/middleware/auth.js`
- **Migraciones**: Tablas `chatwoot_config` y `chatwoot_sessions`

### Funcionalidades

#### Dashboard Principal
- Estadísticas de órdenes en tiempo real
- Métricas de usuarios
- Transacciones SPEI
- Servicios más vendidos
- Últimas órdenes
- Notificaciones pendientes

#### Gestión de Usuarios
- Listar usuarios con búsqueda y filtros
- Ver detalles completos de usuarios
- Historial de órdenes por usuario
- Estadísticas por usuario
- Actualizar información

#### Reportes
- Reporte de ventas por fecha
- Reporte de usuarios nuevos
- Reporte de servicios vendidos
- Exportación de datos

#### Integración Chatwoot
- Widget de chat en tiempo real
- Sincronización de contactos
- Creación automática de conversaciones
- Notificaciones de órdenes en chat
- Gestión de tickets de soporte

### API Endpoints

```
GET    /api/admin/dashboard                - Dashboard principal
GET    /api/admin/usuarios                 - Listar usuarios
GET    /api/admin/usuarios/:id             - Detalle de usuario
PUT    /api/admin/usuarios/:id             - Actualizar usuario
GET    /api/admin/chatwoot/config          - Configuración Chatwoot
POST   /api/admin/chatwoot/config          - Configurar Chatwoot
GET    /api/admin/reportes                 - Obtener reportes
```

### Configuración Chatwoot

Variables de entorno:

```env
CHATWOOT_WEBSITE_TOKEN=tu_website_token
CHATWOOT_API_ACCESS_TOKEN=tu_api_access_token
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
CHATWOOT_BASE_URL=https://app.chatwoot.com
```

### Pasos para Configurar Chatwoot

1. **Crear cuenta en Chatwoot**
   - Ir a https://app.chatwoot.com o instalar self-hosted
   - Crear nueva cuenta

2. **Crear Inbox**
   - Tipo: Website
   - Obtener Website Token

3. **Generar API Access Token**
   - Profile Settings > Access Token
   - Copiar token

4. **Configurar en el sistema**
   ```bash
   POST /api/admin/chatwoot/config
   {
     "website_token": "tu_token",
     "api_access_token": "tu_api_token",
     "account_id": 1,
     "inbox_id": 1
   }
   ```

5. **Integrar widget en frontend**
   - Obtener configuración: `GET /api/admin/chatwoot/config`
   - Agregar script de Chatwoot en index.html

---

## 3. Sistema de Notificaciones Mexicano

### Descripción
Sistema completo de notificaciones multicanal (Email, SMS, WhatsApp) con templates en español mexicano.

### Archivos Creados/Modificados

- **Servicio**: `backend/services/notificationService.js`
- **Migraciones**: Tablas `notifications` y `notification_templates`
- **Templates**: Pre-configurados en la migración

### Funcionalidades

#### Canales Soportados
- **Email** (Nodemailer)
- **SMS** (Twilio)
- **WhatsApp** (Twilio)

#### Templates Incluidos

1. **verification** - Código de verificación
2. **order_created** - Orden creada
3. **payment_pending** - Instrucciones de pago SPEI
4. **payment_received** - Pago confirmado
5. **credentials_delivered** - Credenciales entregadas
6. **order_cancelled** - Orden cancelada
7. **admin_alert** - Alertas administrativas

### Configuración

Variables de entorno:

```env
# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_password_de_aplicacion
EMAIL_FROM_NAME=Sistema de Suscripciones

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890
```

### Uso del Servicio

```javascript
const NotificationService = require('./services/notificationService');

// Enviar notificación de orden creada
await NotificationService.sendOrderCreated(ordenId);

// Enviar instrucciones de pago SPEI
await NotificationService.sendPaymentPending(ordenId, speiData);

// Enviar confirmación de pago
await NotificationService.sendPaymentReceived(ordenId);

// Enviar credenciales
await NotificationService.sendCredentialsDelivered(orderItemId);

// Alerta administrativa
await NotificationService.sendAdminAlert('Mensaje', 'Detalles');
```

### Personalización de Templates

Los templates se almacenan en la tabla `notification_templates` y pueden personalizarse desde la base de datos:

```sql
UPDATE notification_templates
SET template_whatsapp = 'Tu nuevo mensaje con {{variables}}'
WHERE tipo = 'order_created';
```

---

## Instalación y Configuración

### 1. Aplicar Migraciones

```bash
# Conectar a PostgreSQL
psql -U postgres -d suscripciones_db

# Ejecutar migración
\i database/migrations/001_add_spei_system.sql
```

### 2. Instalar Dependencias

El package.json ya incluye todas las dependencias necesarias:
- nodemailer
- twilio
- axios

Si no están instaladas:

```bash
cd backend
npm install nodemailer twilio axios
```

### 3. Configurar Variables de Entorno

Copiar `.env.example` y configurar:

```bash
cp .env.example .env
nano .env
```

Configurar todas las variables necesarias (ver secciones anteriores).

### 4. Configurar Cuenta SPEI

Actualizar en la base de datos con los datos reales:

```sql
UPDATE spei_accounts
SET banco = 'Tu Banco',
    titular = 'TU EMPRESA LEGAL',
    clabe = 'TU_CLABE_REAL',
    numero_cuenta = 'TU_CUENTA_REAL'
WHERE id = 1;
```

### 5. Configurar Chatwoot

Seguir los pasos de la sección "Pasos para Configurar Chatwoot" arriba.

### 6. Configurar Twilio

1. Crear cuenta en https://www.twilio.com
2. Obtener Account SID y Auth Token
3. Comprar número telefónico
4. Habilitar WhatsApp (requiere aprobación)
5. Configurar en .env

### 7. Configurar Email

Para Gmail:
1. Habilitar verificación en 2 pasos
2. Generar contraseña de aplicación
3. Usar esa contraseña en EMAIL_PASSWORD

### 8. Reiniciar Servidor

```bash
npm restart
# o si usas PM2
pm2 restart all
```

---

## Testing

### 1. Probar SPEI

```bash
# Crear transacción
curl -X POST http://localhost:3000/api/spei/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"ordenId": 1}'

# Simular webhook
curl -X POST http://localhost:3000/api/spei/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "referencia": "ORD000001250101001234",
    "evento": "payment.confirmed",
    "monto": 150.00
  }'
```

### 2. Probar Notificaciones

Las notificaciones se envían automáticamente al:
- Crear órdenes
- Confirmar pagos
- Entregar credenciales

O manualmente desde el código:

```javascript
await NotificationService.send(
  'verification',
  usuarioId,
  '+525512345678',
  { codigo: '123456' }
);
```

### 3. Probar Panel Admin

```bash
# Autenticarse como admin
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "tu_password"
  }'

# Obtener dashboard
curl http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer TU_ADMIN_TOKEN"
```

---

## Integración con Frontend

### Widget de Chatwoot

Agregar en `index.html`:

```html
<script>
  (function(d,t) {
    var BASE_URL="https://app.chatwoot.com";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.defer = true;
    g.async = true;
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

### Componente de Pago SPEI

Crear componente React para mostrar instrucciones de pago:

```jsx
function SPEIInstructions({ transaction }) {
  return (
    <div className="spei-instructions">
      <h3>Instrucciones de Pago SPEI</h3>
      <div className="info-row">
        <label>Banco:</label>
        <span>{transaction.banco}</span>
      </div>
      <div className="info-row">
        <label>CLABE:</label>
        <span>{transaction.clabe}</span>
      </div>
      <div className="info-row">
        <label>Titular:</label>
        <span>{transaction.titular}</span>
      </div>
      <div className="info-row">
        <label>Referencia:</label>
        <span className="highlight">{transaction.referencia}</span>
      </div>
      <div className="info-row">
        <label>Monto:</label>
        <span>${transaction.monto} MXN</span>
      </div>
      <div className="important-note">
        ⚠️ Importante: Incluye la referencia en el concepto de pago
      </div>
    </div>
  );
}
```

---

## Mantenimiento

### Logs

Revisar logs del sistema:

```bash
# Logs de aplicación
tail -f logs/app.log

# Logs de PM2
pm2 logs

# Logs de notificaciones
SELECT * FROM notifications WHERE estado = 'failed' ORDER BY created_at DESC;

# Logs de webhooks SPEI
SELECT * FROM spei_webhooks WHERE procesado = FALSE ORDER BY created_at DESC;
```

### Limpieza de Base de Datos

Ejecutar periódicamente:

```sql
-- Limpiar códigos de verificación expirados (más de 24 horas)
DELETE FROM phone_verifications 
WHERE created_at < NOW() - INTERVAL '24 hours';

-- Limpiar webhooks procesados antiguos (más de 30 días)
DELETE FROM spei_webhooks 
WHERE procesado = TRUE 
AND created_at < NOW() - INTERVAL '30 days';

-- Limpiar notificaciones antiguas (más de 90 días)
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monitoreo

Crear alertas para:
- Pagos SPEI pendientes > 24 horas
- Notificaciones fallidas acumuladas
- Webhooks sin procesar
- Órdenes en estado "paid" sin credenciales asignadas

---

## Troubleshooting

### Problema: Notificaciones no se envían

**Solución:**
1. Verificar credenciales de Twilio/Email en .env
2. Revisar tabla `notifications` estado='failed'
3. Ver error_mensaje para detalles
4. Verificar formato de teléfonos (+52...)

### Problema: Webhooks SPEI no procesan

**Solución:**
1. Verificar que el webhook llegue: `SELECT * FROM spei_webhooks ORDER BY created_at DESC LIMIT 10`
2. Revisar campo `procesado`
3. Verificar logs del sistema
4. Confirmar URL del webhook en el proveedor

### Problema: Chatwoot no conecta

**Solución:**
1. Verificar tokens en `chatwoot_config`
2. Confirmar que el baseUrl sea correcto
3. Verificar Account ID e Inbox ID
4. Revisar logs de Chatwoot

---

## Seguridad

### Recomendaciones

1. **Webhooks SPEI**
   - Validar firma del proveedor
   - Verificar IP origen
   - Usar HTTPS en producción

2. **Credenciales**
   - Nunca commitear .env
   - Rotar tokens periódicamente
   - Usar variables de entorno en producción

3. **Base de Datos**
   - Backups automáticos diarios
   - Cifrado de credenciales sensibles
   - Índices en tablas grandes

4. **API**
   - Rate limiting activo
   - Autenticación JWT en todas las rutas
   - Logs de acciones administrativas

---

## Soporte

Para dudas o problemas:

1. Revisar logs del sistema
2. Consultar esta documentación
3. Revisar código fuente comentado
4. Contactar al equipo de desarrollo

---

**Desarrollado por MiniMax Agent**
**Fecha: 2025-11-06**
**Versión del Sistema: 3.0.0**
