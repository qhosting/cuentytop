# DOCUMENTACIÓN TÉCNICA COMPLETA - FASE 2 CUENTY

**Versión:** 2.0.0  
**Fecha:** 2025-11-06  
**Autor:** MiniMax Agent

---

## TABLA DE CONTENIDOS

1. [Introducción](#introducción)
2. [Sistemas Implementados](#sistemas-implementados)
3. [Arquitectura Técnica](#arquitectura-técnica)
4. [Base de Datos](#base-de-datos)
5. [APIs y Endpoints](#apis-y-endpoints)
6. [Configuración](#configuración)
7. [Guías de Implementación](#guías-de-implementación)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## INTRODUCCIÓN

La FASE 2 de CUENTY introduce 8 sistemas avanzados que expanden significativamente las capacidades del sistema de suscripciones a servicios de streaming para el mercado mexicano.

### Objetivos de la FASE 2

- Seguridad mejorada con autenticación de dos factores
- Dashboard completo para usuarios con experiencia MXN
- Sistema fiscal mexicano completo con RFC e IVA
- PWA móvil instalable con capacidades offline
- Integración completa con CoDi (pagos digitales INEGI)
- Chatwoot completo con consultas automatizadas por teléfono
- Notificaciones avanzadas multicanal
- Automatización completa de workflows

### Tecnologías Utilizadas

**Backend:**
- Node.js 16+
- Express.js 4.18
- PostgreSQL 15+
- Twilio (SMS/WhatsApp)
- Web-Push (notificaciones PWA)
- QRCode (generación QR CoDi)

**Frontend:**
- React 18
- PWA (Progressive Web App)
- Service Workers
- Web Push API

**Integraciones:**
- Twilio API (SMS/WhatsApp)
- CoDi API (pagos digitales)
- Chatwoot API (chat)
- SPEI (sistema existente)

---

## SISTEMAS IMPLEMENTADOS

### 1. SISTEMA 2FA MÉXICO

**Descripción:** Autenticación de dos factores vía SMS y WhatsApp.

**Características:**
- Códigos de 6 dígitos con expiración de 5 minutos
- Soporte para SMS y WhatsApp via Twilio
- Códigos de respaldo de emergencia (10 por usuario)
- Activación/desactivación por el usuario
- Límite de intentos fallidos
- Registro de IP y User-Agent

**Tablas de Base de Datos:**
```sql
- two_factor_methods
- backup_codes
- two_factor_codes
```

**Endpoints:**
```
POST /api/fase2/2fa/activate
POST /api/fase2/2fa/deactivate
POST /api/fase2/2fa/send-code
POST /api/fase2/2fa/verify-code
GET  /api/fase2/2fa/methods
```

**Flujo de Uso:**
1. Usuario activa 2FA desde configuración
2. Elige método (SMS o WhatsApp)
3. Sistema genera 10 códigos de respaldo
4. En cada login, se envía código de 6 dígitos
5. Usuario ingresa código (válido 5 minutos)
6. Máximo 3 intentos por código

---

### 2. DASHBOARD USUARIO MXN

**Descripción:** Panel completo para usuarios con datos en pesos mexicanos.

**Características:**
- Resumen de estadísticas del usuario
- Historial de transacciones MXN (SPEI + CoDi)
- Suscripciones activas con fechas de vencimiento
- Gestión de perfil completo
- Historial de sesiones
- Estadísticas de uso por servicio

**Tablas de Base de Datos:**
```sql
- user_profiles
- user_sessions
```

**Vistas:**
```sql
- dashboard_user_view
- transaction_summary_mxn
```

**Endpoints:**
```
GET  /api/fase2/dashboard
GET  /api/fase2/dashboard/transactions
GET  /api/fase2/dashboard/subscriptions
PUT  /api/fase2/dashboard/profile
```

**Datos del Dashboard:**
```json
{
  "usuario": {
    "nombre": "string",
    "telefono": "string",
    "email": "string"
  },
  "estadisticas": {
    "totalOrdenes": 10,
    "ordenesEntregadas": 8,
    "totalGastado": 2500.00,
    "ticketPromedio": 312.50
  },
  "suscripcionesActivas": [...],
  "transaccionesRecientes": [...]
}
```

---

### 3. CARRITO FISCAL MEXICANO

**Descripción:** Sistema de facturación con RFC e IVA 16%.

**Características:**
- Validación de RFC mexicano (regex)
- Cálculo automático de IVA 16%
- Códigos promocionales
- Dirección fiscal vs dirección de entrega
- Uso de CFDI (G03 por defecto)
- Validación de código postal (5 dígitos)

**Tablas de Base de Datos:**
```sql
- tax_data
- promociones
- shopping_cart (extendido)
```

**Endpoints:**
```
POST /api/fase2/tax/add
GET  /api/fase2/tax/data
POST /api/fase2/tax/apply-promo
GET  /api/fase2/tax/promotions
```

**Validación RFC:**
```javascript
// RFC Persona Física: 13 caracteres
// RFC Persona Moral: 12 caracteres
const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
```

**Cálculo IVA:**
```javascript
const IVA_RATE = 0.16;
subtotal = precio * cantidad;
subtotal -= descuento;
iva = subtotal * IVA_RATE;
total = subtotal + iva;
```

---

### 4. PWA MÓVIL INSTALABLE

**Descripción:** Progressive Web App con capacidades offline.

**Características:**
- Service Worker para caché offline
- Notificaciones push nativas
- Instalación como app nativa
- Caché inteligente (Cache First / Network First)
- Sincronización en background
- Manifest completo

**Tablas de Base de Datos:**
```sql
- push_tokens
- offline_cache
```

**Archivos PWA:**
```
/frontend/public/manifest.json
/frontend/public/service-worker.js
/frontend/public/offline.html
```

**Endpoints:**
```
POST /api/fase2/pwa/register-push
POST /api/fase2/pwa/test-push
POST /api/fase2/pwa/save-cache
GET  /api/fase2/pwa/get-cache
```

**Registro Push Token:**
```javascript
// Cliente
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY
  }).then(subscription => {
    fetch('/api/fase2/pwa/register-push', {
      method: 'POST',
      body: JSON.stringify({ subscription })
    });
  });
});
```

---

### 5. INTEGRACIÓN CoDi COMPLETA

**Descripción:** Sistema de pagos digitales CoDi de INEGI.

**Características:**
- Creación de cuentas CoDi (personas físicas/morales)
- Generación de QR CoDi con expiración 15 minutos
- Tracking de transacciones
- Integración SPUS-COBIS
- Cálculo de CLABEs automático
- Webhooks de confirmación

**Tablas de Base de Datos:**
```sql
- codi_accounts
- codi_transactions
```

**Endpoints:**
```
POST /api/fase2/codi/create-account
POST /api/fase2/codi/generate-qr
POST /api/fase2/codi/verify-payment
GET  /api/fase2/codi/transactions
```

**Generación CLABE:**
```javascript
// CLABE: 18 dígitos
// 3 banco + 3 plaza + 11 cuenta + 1 verificador
const bancoClave = '012'; // BBVA
const plaza = '001';
const cuenta = numeroCuenta.padStart(11, '0');
const verificador = calcularDigitoVerificador(bancoClave + plaza + cuenta);
const clabe = bancoClave + plaza + cuenta + verificador;
```

**QR CoDi:**
```javascript
const qrData = {
  version: '1.0.0',
  type: 'CoDi',
  reference: 'CODI1234567890',
  amount: 500.00,
  currency: 'MXN',
  concept: 'Orden #12345',
  beneficiary: {
    name: 'CUENTY',
    account: '012001XXXXXXXXXXX'
  }
};
```

---

### 6. CHATWOOT COMPLETO + CONSULTAS TELÉFONO

**Descripción:** Bot de consultas automatizado con derivación a agentes.

**Características:**
- Procesamiento de consultas vía SMS/WhatsApp
- Bot inteligente para consultas comunes
- Derivación automática a agentes humanos
- Integración completa con Chatwoot
- Historial de conversaciones
- Ratings de satisfacción

**Tablas de Base de Datos:**
```sql
- phone_consultations
- chat_sessions
```

**Endpoints:**
```
POST /api/fase2/phone-consultation/webhook (Twilio)
GET  /api/fase2/phone-consultation/history
```

**Tipos de Consultas:**
- `cuentas_activas`: Consulta de suscripciones activas
- `estado_pago`: Estado de órdenes y pagos
- `fecha_vencimiento`: Fechas de vencimiento de servicios
- `soporte_tecnico`: Problemas técnicos
- `general`: Otras consultas

**Webhook Twilio:**
```javascript
// POST desde Twilio
{
  "From": "whatsapp:+5215512345678",
  "Body": "¿Cuáles son mis cuentas activas?",
  "MessagingServiceSid": "MGXXX..."
}

// Respuesta TwiML
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Tienes 2 suscripciones activas:
    • Netflix - Vence: 15 Dic 2025
    • Spotify - Vence: 20 Dic 2025
  </Message>
</Response>
```

---

### 7. NOTIFICACIONES AVANZADAS TELÉFONO

**Descripción:** Sistema de notificaciones multicanal con templates.

**Características:**
- Templates en español mexicano
- SMS y WhatsApp vía Twilio
- Email y Push notifications
- Variables dinámicas
- Prioridades (baja, media, alta, crítica)
- Reintentos automáticos
- Tracking completo (enviado, entregado, leído)

**Tablas de Base de Datos:**
```sql
- notification_templates
- notification_logs
```

**Templates Precargados:**
```
- 2FA_SMS_LOGIN
- 2FA_WHATSAPP_LOGIN
- VENCIMIENTO_SUSCRIPCION_SMS
- VENCIMIENTO_SUSCRIPCION_WHATSAPP
- RECORDATORIO_PAGO_SMS
- CONFIRMACION_LOGIN_SMS
- CUENTA_ACTIVADA_WHATSAPP
```

**Uso de Templates:**
```javascript
await notificationService.sendFromTemplate(
  '2FA_WHATSAPP_LOGIN',
  usuarioId,
  'whatsapp',
  {
    nombre: 'Juan',
    codigo: '123456'
  }
);
```

---

### 8. AUTOMATIZACIÓN COMPLETA

**Descripción:** Workflows automáticos basados en eventos.

**Características:**
- Triggers automáticos basados en eventos
- Ejecución de acciones múltiples
- Condiciones configurables
- Logs de ejecución
- Activación/desactivación de workflows
- Prioridades

**Tablas de Base de Datos:**
```sql
- automation_workflows
- automation_logs
```

**Endpoints:**
```
POST /api/fase2/automation/execute
GET  /api/fase2/automation/workflows
POST /api/fase2/automation/workflows
PUT  /api/fase2/automation/workflows/:id
```

**Eventos Soportados:**
```
- pago_recibido
- orden_creada
- suscripcion_vence
- usuario_registrado
- login_exitoso
- rfc_validado
- cuenta_activada
- promocion_aplicada
```

**Acciones Disponibles:**
```
- notificacion (email/sms/whatsapp/push)
- actualizar_orden
- asignar_credenciales
- activar_orden
- validar_rfc_sat
- aplicar_iva
```

**Ejemplo Workflow:**
```json
{
  "nombre": "Activar Cuenta Post-Pago",
  "trigger_evento": "pago_recibido",
  "trigger_condiciones": {},
  "acciones": [
    {
      "tipo": "asignar_credenciales"
    },
    {
      "tipo": "notificacion",
      "canal": "whatsapp",
      "template": "CUENTA_ACTIVADA_WHATSAPP"
    },
    {
      "tipo": "actualizar_orden",
      "estado": "delivered"
    }
  ]
}
```

---

## ARQUITECTURA TÉCNICA

### Estructura del Proyecto

```
sistema_suscripciones/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── speiController.js
│   │   ├── adminController.js
│   │   └── fase2Controller.js (NUEVO)
│   ├── services/
│   │   ├── speiService.js
│   │   ├── notificationService.js
│   │   ├── chatwootService.js
│   │   ├── twoFactorService.js (NUEVO)
│   │   ├── userDashboardService.js (NUEVO)
│   │   ├── taxService.js (NUEVO)
│   │   ├── codiService.js (NUEVO)
│   │   ├── phoneConsultationService.js (NUEVO)
│   │   ├── pwaService.js (NUEVO)
│   │   └── automationService.js (NUEVO)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── speiRoutes.js
│   │   ├── adminRoutes.js
│   │   └── fase2Routes.js (NUEVO)
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   ├── manifest.json (NUEVO)
│   │   ├── service-worker.js (NUEVO)
│   │   └── offline.html (NUEVO)
│   └── src/
├── database/
│   ├── schema.sql
│   └── migrations/
│       ├── 001_add_spei_system.sql
│       └── 002_add_fase2_systems.sql (NUEVO)
└── docs/
    └── FASE_2_IMPLEMENTATION.md (ESTE ARCHIVO)
```

---

## BASE DE DATOS

### Nuevas Tablas (18 total)

**Sistema 2FA:**
1. `two_factor_methods` - Métodos 2FA configurados
2. `backup_codes` - Códigos de respaldo
3. `two_factor_codes` - Códigos temporales

**Dashboard Usuario:**
4. `user_profiles` - Perfiles extendidos
5. `user_sessions` - Historial de sesiones

**Sistema Fiscal:**
6. `tax_data` - Datos fiscales (RFC)
7. `promociones` - Códigos promocionales

**PWA:**
8. `push_tokens` - Tokens de notificaciones
9. `offline_cache` - Caché offline

**CoDi:**
10. `codi_accounts` - Cuentas CoDi
11. `codi_transactions` - Transacciones CoDi

**Consultas Teléfono:**
12. `phone_consultations` - Consultas por SMS/WhatsApp
13. `chat_sessions` - Sesiones Chatwoot

**Notificaciones:**
14. `notification_templates` - Templates
15. `notification_logs` - Logs de envío

**Automatización:**
16. `automation_workflows` - Workflows
17. `automation_logs` - Logs de ejecución

### Nuevas Vistas

```sql
- transaction_summary_mxn: Consolidación SPEI + CoDi
- dashboard_user_view: Vista resumen dashboard
- notification_stats: Estadísticas de notificaciones
```

### Triggers Automáticos

```sql
- trigger_calculate_cart_tax: Cálculo automático IVA
- trigger_expire_codi_qr: Expiración QR CoDi 15 min
- update_*_updated_at: Actualización timestamps
```

### Ejecución de Migración

```bash
cd /workspace/sistema_suscripciones
psql -U postgres -d suscripciones_db -f database/migrations/002_add_fase2_systems.sql
```

---

## APIS Y ENDPOINTS

### Resumen de Endpoints Nuevos

Total de endpoints FASE 2: **28 endpoints**

**Por Sistema:**
- 2FA: 5 endpoints
- Dashboard: 4 endpoints
- Fiscal: 4 endpoints
- CoDi: 4 endpoints
- Consultas: 2 endpoints
- PWA: 4 endpoints
- Automation: 4 endpoints
- Estadísticas: 1 endpoint

### Autenticación

Todos los endpoints requieren token JWT excepto:
- `/api/fase2/tax/promotions` (GET) - Público
- `/api/fase2/codi/verify-payment` (POST) - Webhook
- `/api/fase2/phone-consultation/webhook` (POST) - Webhook Twilio

**Header requerido:**
```
Authorization: Bearer <JWT_TOKEN>
```

### Rate Limiting

- Endpoints generales: 100 req/15min
- Endpoints 2FA: 10 req/15min
- Webhooks: Sin límite

---

## CONFIGURACIÓN

### Variables de Entorno

Agregar al archivo `.env`:

```bash
# === FASE 2 CONFIGURACIÓN ===

# Twilio (SMS/WhatsApp/2FA/Notificaciones)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_WHATSAPP_NUMBER=whatsapp:+15551234567

# CoDi
CODI_API_URL=https://api.codi.gob.mx/v1
CODI_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CODI_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Chatwoot
CHATWOOT_API_URL=https://app.chatwoot.com
CHATWOOT_ADMIN_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CHATWOOT_INBOX_ID=123456

# PWA Push Notifications
VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CONTACT_EMAIL=admin@cuenty.mx

# Sistema
NODE_ENV=production
PORT=3000
```

### Generar VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys

# Resultado:
# =======================================
# Public Key:
# Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# 
# Private Key:
# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# =======================================
```

---

## GUÍAS DE IMPLEMENTACIÓN

### 1. Implementar 2FA en Frontend

**Paso 1: Activar 2FA**
```javascript
// Activar 2FA
const activar2FA = async (metodo) => {
  const response = await fetch('/api/fase2/2fa/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      metodo: 'whatsapp', // o 'sms'
      telefono: '+5215512345678'
    })
  });

  const data = await response.json();
  
  // Guardar códigos de respaldo
  localStorage.setItem('backup_codes', JSON.stringify(data.backupCodes));
  
  alert('2FA activado. Códigos de respaldo guardados.');
};
```

**Paso 2: Login con 2FA**
```javascript
// Después del login normal
const verificar2FA = async (codigo) => {
  const response = await fetch('/api/fase2/2fa/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      codigo: codigo,
      proposito: 'login'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    // Continuar con login
    window.location.href = '/dashboard';
  } else {
    alert('Código inválido');
  }
};
```

### 2. Implementar Dashboard

```javascript
// Obtener datos del dashboard
const obtenerDashboard = async () => {
  const response = await fetch('/api/fase2/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const { data } = await response.json();
  
  // Renderizar datos
  document.getElementById('total-gastado').textContent = 
    `$${data.estadisticas.totalGastado} MXN`;
  
  // Renderizar suscripciones activas
  data.suscripcionesActivas.forEach(sub => {
    // Crear elementos UI
  });
};
```

### 3. Implementar Carrito Fiscal

```javascript
// Agregar datos fiscales
const agregarDatosFiscales = async (formData) => {
  const response = await fetch('/api/fase2/tax/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rfc: formData.rfc,
      razonSocial: formData.razonSocial,
      codigoPostalFiscal: formData.codigoPostal,
      direccionFiscal: formData.direccion,
      esPersonaMoral: formData.esEmpresa
    })
  });

  const data = await response.json();
  return data;
};

// Aplicar código promocional
const aplicarPromo = async (codigo) => {
  const subtotal = calcularSubtotal();
  
  const response = await fetch('/api/fase2/tax/apply-promo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      codigo: codigo,
      subtotal: subtotal
    })
  });

  const data = await response.json();
  
  if (data.success) {
    alert(`Descuento aplicado: $${data.descuento} MXN`);
    actualizarTotales();
  }
};
```

### 4. Implementar PWA

**Paso 1: Registrar Service Worker**
```javascript
// En index.html o main.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registrado:', registration);
      })
      .catch(error => {
        console.error('Error registrando SW:', error);
      });
  });
}
```

**Paso 2: Solicitar Permiso Push**
```javascript
const solicitarPermisoNotificaciones = async () => {
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Enviar subscription al servidor
    await fetch('/api/fase2/pwa/register-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscription,
        deviceInfo: {
          deviceType: 'mobile',
          browser: 'Chrome'
        }
      })
    });
  }
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### 5. Implementar CoDi

```javascript
// Generar QR CoDi para pago
const generarQRCoDi = async (ordenId) => {
  const response = await fetch('/api/fase2/codi/generate-qr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ ordenId })
  });

  const data = await response.json();
  
  // Mostrar QR al usuario
  document.getElementById('qr-image').src = data.qrImage;
  
  // Iniciar polling para verificar pago
  const pollInterval = setInterval(async () => {
    const status = await verificarPagoCoDi(data.transaction.referencia_codi);
    
    if (status.estado === 'completed') {
      clearInterval(pollInterval);
      alert('¡Pago confirmado!');
      window.location.href = '/ordenes';
    }
  }, 5000);
  
  // Detener polling después de 15 minutos (expiración QR)
  setTimeout(() => clearInterval(pollInterval), 15 * 60 * 1000);
};
```

---

## TESTING

### Pruebas Automatizadas

Crear archivo `/backend/tests/fase2.test.js`:

```javascript
const request = require('supertest');
const app = require('../server');

describe('FASE 2 - Sistema 2FA', () => {
  let token;
  
  beforeAll(async () => {
    // Login y obtener token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ telefono: '+5215512345678', codigo: '123456' });
    
    token = res.body.token;
  });

  test('Activar 2FA WhatsApp', async () => {
    const res = await request(app)
      .post('/api/fase2/2fa/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        metodo: 'whatsapp',
        telefono: '+5215512345678'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.backupCodes).toHaveLength(10);
  });

  test('Enviar código 2FA', async () => {
    const res = await request(app)
      .post('/api/fase2/2fa/send-code')
      .set('Authorization', `Bearer ${token}`)
      .send({
        metodo: 'whatsapp',
        proposito: 'login'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

### Ejecutar Tests

```bash
cd backend
npm test
```

---

## DEPLOYMENT

### 1. Preparación

```bash
# Instalar dependencias
cd backend
npm install

# Ejecutar migración
psql -d suscripciones_db -f ../database/migrations/002_add_fase2_systems.sql

# Verificar variables de entorno
cat .env
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

### 3. Deployment Docker

El docker-compose.yml existente ya incluye todo. Solo ejecutar:

```bash
docker-compose up -d
```

### 4. Verificación Post-Deployment

```bash
# Health check
curl http://localhost:3000/health

# Test endpoint FASE 2
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/fase2/dashboard
```

---

## TROUBLESHOOTING

### Problema: 2FA no envía códigos

**Causa:** Credenciales Twilio incorrectas

**Solución:**
```bash
# Verificar variables
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN

# Probar desde Twilio Console
```

### Problema: PWA no se instala

**Causa:** Manifest.json no accesible o HTTPS requerido

**Solución:**
```bash
# Verificar manifest
curl http://localhost:3000/manifest.json

# PWA requiere HTTPS en producción
# En desarrollo, localhost funciona sin HTTPS
```

### Problema: Notificaciones push no llegan

**Causa:** VAPID keys incorrectas o subscription no registrada

**Solución:**
```javascript
// Verificar subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

### Problema: QR CoDi expira muy rápido

**Causa:** Configuración de expiración

**Solución:**
```sql
-- Verificar trigger
SELECT * FROM codi_transactions WHERE expires_at < CURRENT_TIMESTAMP;

-- El trigger establece 15 minutos automáticamente
```

### Problema: RFC no se valida

**Causa:** Formato incorrecto

**Solución:**
```javascript
// RFC Persona Física: AAAA######XXX (13 chars)
// RFC Persona Moral: AAA######XXX (12 chars)

// Ejemplos válidos:
// HEGG900906JT3 (física)
// CPM840916GT1 (moral)
```

---

## ANEXOS

### A. Códigos de Promoción de Ejemplo

```sql
INSERT INTO promociones (codigo, nombre, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, usos_maximos) VALUES
('BIENVENIDO25', 'Bienvenida 25%', 'porcentaje', 25.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', 1000),
('NETFLIX50', 'Netflix $50 OFF', 'monto_fijo', 50.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 500);
```

### B. Workflows de Ejemplo

```json
{
  "nombre": "Recordatorio Vencimiento 7 Días",
  "trigger_evento": "suscripcion_vence",
  "trigger_condiciones": {
    "dias_antes": 7
  },
  "acciones": [
    {
      "tipo": "notificacion",
      "canal": "whatsapp",
      "template": "VENCIMIENTO_SUSCRIPCION_WHATSAPP"
    }
  ]
}
```

### C. Templates Twilio

En la consola de Twilio, crear templates aprobados de WhatsApp:

```
CUENTY_2FA_LOGIN:
Tu código de verificación CUENTY es: {{1}}. Válido por 5 minutos.

CUENTY_ACCOUNT_READY:
¡Tu cuenta de {{1}} está lista! Usuario: {{2}}, Contraseña: {{3}}
```

---

## CONTACTO Y SOPORTE

**Desarrollado por:** MiniMax Agent  
**Versión:** 2.0.0  
**Fecha:** 2025-11-06

Para soporte técnico, consultar el repositorio o contactar al equipo de desarrollo.

---

**FIN DE LA DOCUMENTACIÓN TÉCNICA FASE 2**
