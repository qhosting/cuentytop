# 📝 PENDIENTES TÉCNICOS - Cuenty Fase 3

Este documento lista las tareas técnicas pendientes para poner en marcha el sistema, priorizando la configuración y la integración del Frontend con los Microservicios.

## 🔴 Prioridad Alta (Bloqueantes)

### 1. Configuración de Credenciales
*El sistema no funcionará sin estas claves externas.*
- [x] **Preparar template:** Se creó `.env.example.fase3`.
- [x] **Crear archivo `.env`:** Ejecutar `./setup_credentials.sh` para generar el archivo con secretos.
- [x] **WAHA (WhatsApp):** Implementado soporte en `notifications-service`. Requiere configurar `WAHA_ENDPOINT` en `.env`.
- [x] **Pagos (SPEI + MercadoPago):** Implementado soporte en `payments-service`. Requiere configurar `MP_ACCESS_TOKEN` en `.env`.
- [ ] **Email:** Configurar credenciales SMTP (SendGrid/Gmail).
- [x] **Seguridad:** Script `setup_credentials.sh` genera secretos de 32 bytes para JWT y DB.

### 2. Base de Datos
- [ ] **Inicializar BD:** Asegurar que PostgreSQL esté corriendo.
- [ ] **Migración Fase 3:** Ejecutar el script SQL para crear las tablas de la arquitectura enterprise.
  ```bash
  psql -d suscripciones_db -f database/migrations/003_add_fase3_enterprise.sql
  ```
- [x] **Migración Providers:** Se creó `database/migrations/004_add_providers_columns.sql` para agregar columnas necesarias para WAHA y MercadoPago. **Pendiente Ejecutar.**

### 3. Integración Frontend - Microservicios (CRÍTICO)
*El Frontend actual apunta a la API monolítica antigua (`/api/...`) en lugar de los nuevos Microservicios (`/v1/...`).*
- [ ] **Actualizar Base URL:** Cambiar `API_URL` en el frontend para apuntar al API Gateway (Puerto 80/443).
- [ ] **Refactorizar `authService.js`:**
  - Cambiar endpoints de `/auth/user/phone/...` a los definidos en `auth-service` (ej. `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/2fa/send`).
  - Adaptar los payloads de request/response al nuevo esquema.
- [ ] **Revisar otros servicios:** Verificar `cartService`, `orderService`, etc., y mapearlos a sus respectivos microservicios (`/v1/payments`, `/v1/subscriptions`).

### 4. Infraestructura Docker
- [ ] **Swarm Init:** Ejecutar `docker swarm init` si no se ha hecho.
- [ ] **Despliegue:** Ejecutar `./deploy_fase3.sh` para levantar el stack de servicios.
- [ ] **Verificación:** Confirmar que los 7 servicios estén en estado `Running`.

---

## 🟡 Prioridad Media (Funcionalidad)

### 1. Testing de Integración
- [ ] **Health Checks:** Verificar respuesta 200 OK en:
  - `http://localhost/v1/auth/health`
  - `http://localhost/v1/payments/health`
  - `http://localhost/v1/notifications/health`
- [ ] **Flujo de Usuario:** Probar registro manual y login.
- [ ] **Flujo de Pago:** Simular una transacción SPEI y verificar la recepción del webhook.

### 2. Configuración de Servicios Auxiliares
- [ ] **Chatwoot:** Configurar token de integración para el chat de soporte.
- [ ] **Google Analytics:** Configurar `GA4_MEASUREMENT_ID` para el servicio de analytics.

---

## 🟢 Prioridad Baja (Optimización)

- [ ] **Limpieza:** Eliminar código muerto del backend monolítico si ya no se usa.
- [ ] **Documentación:** Actualizar Swagger si hubo cambios en los endpoints durante la integración del frontend.
- [ ] **Logs:** Configurar rotación de logs en Docker.

---

## 🛠️ Guía de Endpoints (Referencia para Frontend)

| Acción | Endpoint Viejo (Monolito) | Endpoint Nuevo (Microservicios) |
|--------|---------------------------|---------------------------------|
| Registro | `/api/auth/register` | `POST /v1/auth/register` |
| Login | `/api/auth/login` | `POST /v1/auth/login` |
| 2FA Enviar | `/api/auth/user/phone/request-code` | `POST /v1/auth/2fa/send` |
| 2FA Verificar | `/api/auth/user/phone/verify-code` | `POST /v1/auth/2fa/verify` |
| Perfil | `/api/auth/user/profile` | `GET /v1/auth/me` |
