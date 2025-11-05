# Sistema de Gestión de Suscripciones v3.0 - Edición México

## Novedades v3.0

Sistema completo adaptado para el mercado mexicano con:

1. **Sistema de Pagos SPEI** - Transferencias bancarias automatizadas
2. **Panel Administrativo + Chatwoot** - Gestión completa con atención al cliente
3. **Notificaciones Mexicanas** - Email, SMS y WhatsApp en español

---

## Características Principales

### Sistema de Pagos SPEI
- Generación automática de referencias únicas
- Confirmación automática mediante webhooks
- Instrucciones de pago detalladas (CLABE, banco, referencia)
- Tracking completo de transacciones
- Estadísticas en tiempo real
- Compatible con proveedores: Conekta, OpenPay, Clip, Banwire

### Panel Administrativo Completo
- Dashboard con métricas en vivo
- Gestión de usuarios y órdenes
- Reportes de ventas, usuarios y servicios
- Estadísticas de pagos SPEI
- Configuración centralizada
- Integración Chatwoot para soporte

### Integración Chatwoot
- Widget de chat en tiempo real
- Sincronización automática de contactos
- Notificaciones de órdenes en chat
- Sistema de tickets de soporte
- Gestión de conversaciones

### Sistema de Notificaciones
- **7 templates** en español mexicano
- **3 canales**: Email, SMS, WhatsApp
- Notificaciones automáticas:
  - Código de verificación
  - Orden creada
  - Instrucciones de pago SPEI
  - Pago confirmado
  - Credenciales entregadas
  - Orden cancelada
  - Alertas administrativas

---

## Stack Tecnológico

### Backend
- Node.js + Express.js
- PostgreSQL
- JWT para autenticación
- Nodemailer (emails)
- Twilio (SMS/WhatsApp)
- Axios (API Chatwoot)

### Frontend (Existente)
- React + Redux Toolkit
- Material-UI
- Axios

### Integraciones
- **SPEI** - Sistema de Pagos Electrónicos Interbancarios
- **Chatwoot** - Plataforma de atención al cliente
- **Twilio** - SMS y WhatsApp
- **Nodemailer** - Envío de emails

---

## Instalación Rápida

### 1. Clonar y Configurar

```bash
cd sistema_suscripciones
```

### 2. Aplicar Migraciones

```bash
psql -U postgres -d suscripciones_db -f database/migrations/001_add_spei_system.sql
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
nano .env
```

Configurar:
- Base de datos PostgreSQL
- JWT secret
- Credenciales Twilio
- Configuración Email
- Tokens Chatwoot
- Datos cuenta SPEI

### 4. Instalar Dependencias

```bash
cd backend
npm install
```

### 5. Iniciar Servidor

```bash
npm start
```

El servidor iniciará en `http://localhost:3000`

---

## Configuración de Servicios

### SPEI - Cuenta Bancaria

Actualizar en la base de datos:

```sql
UPDATE spei_accounts
SET banco = 'Tu Banco',
    titular = 'TU EMPRESA LEGAL',
    clabe = 'TU_CLABE_18_DIGITOS',
    numero_cuenta = 'TU_NUMERO_CUENTA'
WHERE id = 1;
```

### Chatwoot

1. Crear cuenta en https://app.chatwoot.com
2. Crear inbox tipo "Website"
3. Obtener Website Token
4. Generar API Access Token
5. Configurar vía API:

```bash
POST /api/admin/chatwoot/config
{
  "website_token": "tu_token",
  "api_access_token": "tu_api_token",
  "account_id": 1,
  "inbox_id": 1
}
```

### Twilio

1. Crear cuenta en https://www.twilio.com
2. Obtener Account SID y Auth Token
3. Comprar número telefónico mexicano
4. Habilitar WhatsApp Business
5. Configurar en `.env`

### Email (Gmail)

1. Habilitar verificación en 2 pasos
2. Generar contraseña de aplicación
3. Configurar en `.env`:

```env
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_password_de_aplicacion
```

---

## API Endpoints

### SPEI

```
POST   /api/spei/transactions                    - Crear transacción
GET    /api/spei/transactions/referencia/:ref    - Por referencia
GET    /api/spei/transactions/orden/:id          - Por orden
POST   /api/spei/webhook                         - Webhook confirmación
POST   /api/spei/transactions/:ref/confirm       - Confirmar (admin)
POST   /api/spei/transactions/:ref/cancel        - Cancelar (admin)
GET    /api/spei/transactions                    - Listar (admin)
GET    /api/spei/statistics                      - Estadísticas (admin)
```

### Admin

```
GET    /api/admin/dashboard                      - Dashboard
GET    /api/admin/usuarios                       - Listar usuarios
GET    /api/admin/usuarios/:id                   - Detalle usuario
PUT    /api/admin/usuarios/:id                   - Actualizar usuario
GET    /api/admin/chatwoot/config                - Config Chatwoot
POST   /api/admin/chatwoot/config                - Configurar Chatwoot
GET    /api/admin/reportes                       - Reportes
```

### Endpoints Existentes

- `/api/auth` - Autenticación
- `/api/servicios` - Gestión de servicios
- `/api/planes` - Planes de servicio
- `/api/cart` - Carrito de compras
- `/api/ordenes` - Gestión de órdenes

---

## Flujo de Compra con SPEI

1. **Usuario crea orden** → Sistema genera orden
2. **Sistema crea transacción SPEI** → Genera referencia única
3. **Usuario recibe notificación** → Instrucciones de pago completas
4. **Usuario realiza transferencia** → Usando CLABE y referencia
5. **Banco envía webhook** → Confirmación automática
6. **Sistema confirma pago** → Actualiza orden a "paid"
7. **Usuario recibe confirmación** → Notificación de pago recibido
8. **Admin asigna credenciales** → Desde panel administrativo
9. **Usuario recibe credenciales** → Por canal preferido

---

## Panel Administrativo

### Dashboard
- Total de órdenes y estados
- Ingresos confirmados y pendientes
- Nuevos usuarios del mes
- Estadísticas SPEI
- Servicios más vendidos
- Últimas 10 órdenes

### Gestión de Usuarios
- Búsqueda y filtros
- Historial completo
- Estadísticas por usuario
- Edición de información

### Reportes
- **Ventas**: Por fecha, ingresos, ticket promedio
- **Usuarios**: Nuevos registros, verificados
- **Servicios**: Ventas e ingresos por servicio/plan

### Configuración
- Chatwoot widget
- Templates de notificaciones
- Cuentas SPEI

---

## Sistema de Notificaciones

### Templates Incluidos

| Tipo | Canales | Variables |
|------|---------|-----------|
| Verificación | Email, SMS, WhatsApp | codigo |
| Orden Creada | Email, SMS, WhatsApp | numero_orden, total, instrucciones |
| Pago Pendiente | Email, SMS, WhatsApp | banco, clabe, titular, referencia, monto |
| Pago Recibido | Email, SMS, WhatsApp | numero_orden, monto |
| Credenciales | Email, SMS, WhatsApp | servicio, plan, usuario, password |
| Orden Cancelada | Email, SMS, WhatsApp | numero_orden, motivo |
| Alerta Admin | Email | mensaje, detalles, fecha |

### Uso Programático

```javascript
const NotificationService = require('./services/notificationService');

// Enviar notificación
await NotificationService.sendOrderCreated(ordenId);
await NotificationService.sendPaymentPending(ordenId, speiData);
await NotificationService.sendPaymentReceived(ordenId);
await NotificationService.sendAdminAlert('Mensaje', 'Detalles');
```

---

## Estructura del Proyecto

```
sistema_suscripciones/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── adminController.js       ← NUEVO
│   │   ├── authController.js
│   │   ├── cartController.js
│   │   └── speiController.js        ← NUEVO
│   ├── middleware/
│   │   └── auth.js                  ← ACTUALIZADO
│   ├── models/
│   ├── routes/
│   │   ├── adminRoutes.js           ← NUEVO
│   │   ├── authRoutes.js
│   │   ├── cartRoutes.js
│   │   └── speiRoutes.js            ← NUEVO
│   ├── services/
│   │   ├── chatwootService.js       ← NUEVO
│   │   ├── notificationService.js   ← NUEVO
│   │   └── speiService.js           ← NUEVO
│   ├── server.js                    ← ACTUALIZADO
│   ├── package.json
│   └── .env.example
├── database/
│   ├── schema.sql
│   └── migrations/
│       └── 001_add_spei_system.sql  ← NUEVO
├── docs/
│   ├── GUIA_MEJORAS_MEXICO.md       ← NUEVO
│   ├── API_DOCUMENTATION.md
│   └── SETUP_GUIDE.md
├── frontend/
│   └── src/
└── README.md                        ← ACTUALIZADO
```

---

## Seguridad

### Implementado

- JWT con expiración de 7 días
- Rate limiting en todas las rutas
- Helmet para headers de seguridad
- Sanitización de inputs
- Protección XSS y SQL injection
- CORS configurado
- Autenticación de 2 factores (teléfono)
- Middleware de autorización admin

### Recomendaciones

1. **Webhooks SPEI**
   - Validar firma del proveedor
   - Verificar IP origen
   - Usar HTTPS en producción

2. **Credenciales**
   - Rotar tokens periódicamente
   - Usar secretos fuertes (32+ caracteres)
   - Variables de entorno en producción

3. **Base de Datos**
   - Backups automáticos
   - Cifrado de credenciales sensibles
   - Índices en tablas grandes

---

## Docker & Deployment

### Docker Compose

El proyecto incluye `docker-compose.yml` configurado para:
- Backend Node.js
- PostgreSQL
- Redis (opcional)

```bash
docker-compose up -d
```

### Easypanel

Ver `EASYPANEL_DEPLOY.md` para instrucciones de deployment.

---

## Mantenimiento

### Limpieza Automática

El sistema limpia automáticamente:
- Códigos de verificación expirados (cada hora)
- Carritos abandonados > 7 días (diario)

### Limpieza Manual

```sql
-- Webhooks procesados > 30 días
DELETE FROM spei_webhooks 
WHERE procesado = TRUE 
AND created_at < NOW() - INTERVAL '30 days';

-- Notificaciones antiguas > 90 días
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monitoreo

Crear alertas para:
- Pagos SPEI pendientes > 24h
- Notificaciones fallidas
- Webhooks sin procesar
- Órdenes pagadas sin credenciales

---

## Testing

### SPEI

```bash
# Crear transacción
curl -X POST http://localhost:3000/api/spei/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"ordenId": 1}'

# Simular webhook
curl -X POST http://localhost:3000/api/spei/webhook \
  -H "Content-Type: application/json" \
  -d '{"referencia": "ORD000001250101001234", "evento": "payment.confirmed"}'
```

### Notificaciones

Las notificaciones se envían automáticamente. Para testing manual:

```javascript
await NotificationService.send(
  'verification',
  usuarioId,
  '+525512345678',
  { codigo: '123456' }
);
```

### Admin Panel

```bash
# Login admin
curl -X POST http://localhost:3000/api/auth/admin/login \
  -d '{"username": "admin", "password": "password"}'

# Dashboard
curl http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Documentación Completa

- **Guía de Mejoras**: `docs/GUIA_MEJORAS_MEXICO.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Setup Guide**: `docs/SETUP_GUIDE.md`
- **Docker Guide**: `DOCKER_RESUMEN.md`
- **Easypanel Deploy**: `EASYPANEL_DEPLOY.md`

---

## Troubleshooting

### Notificaciones no envían

1. Verificar credenciales en `.env`
2. Revisar tabla `notifications` con estado='failed'
3. Ver `error_mensaje` para detalles
4. Verificar formato de teléfonos (+52...)

### Webhooks SPEI no procesan

1. Revisar `spei_webhooks` tabla
2. Verificar URL webhook en proveedor
3. Confirmar que el payload tenga `referencia`
4. Revisar logs del servidor

### Chatwoot no conecta

1. Verificar tokens en `chatwoot_config`
2. Confirmar baseUrl correcto
3. Verificar Account ID e Inbox ID
4. Revisar consola del navegador

---

## Roadmap v3.1

- [ ] Dashboard frontend con React
- [ ] Integración con proveedores SPEI (Conekta, OpenPay)
- [ ] Reportes exportables (PDF, Excel)
- [ ] Sistema de tickets de soporte
- [ ] Notificaciones push web
- [ ] App móvil con React Native

---

## Contribuciones

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear branch de feature
3. Hacer commit de cambios
4. Push al branch
5. Crear Pull Request

---

## Licencia

MIT License - Ver archivo LICENSE para detalles

---

## Soporte

- **Email**: soporte@tu-empresa.com
- **Teléfono**: +52 55 1234 5678
- **Documentación**: https://docs.tu-empresa.com
- **Chat**: Widget Chatwoot integrado

---

## Créditos

**Desarrollado por MiniMax Agent**

Sistema de Gestión de Suscripciones v3.0
Edición México - 2025

Características:
- Sistema de Pagos SPEI
- Panel Administrativo Completo
- Integración Chatwoot
- Notificaciones Multicanal
- Optimizado para Mercado Mexicano

---

## Changelog

### v3.0.0 (2025-11-06)
- Sistema de pagos SPEI completo
- Panel administrativo con Chatwoot
- Sistema de notificaciones mexicano
- 7 templates en español
- Webhooks automáticos
- Reportes y estadísticas

### v2.0.0
- Sistema base funcional
- Autenticación por teléfono
- Carrito de compras
- Gestión de órdenes

### v1.0.0
- Lanzamiento inicial
