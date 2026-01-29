# 📝 PENDIENTES TÉCNICOS - Cuenty Fase 3

Este documento lista las tareas técnicas pendientes para poner en marcha el sistema, priorizando la configuración y la integración del Frontend con los Microservicios.

## 🔴 Prioridad Alta (Bloqueantes)

### 1. Configuración de Credenciales
*El sistema no funcionará sin estas claves externas.*
- [x] **Preparar template:** Se creó `.env.example.fase3`.
- [x] **Crear archivo `.env`:** Ejecutar `./setup_credentials.sh` para generar el archivo con secretos.
- [x] **WAHA (WhatsApp):** Implementado soporte en `notifications-service`.
- [x] **Pagos (SPEI + MercadoPago):** Implementado soporte en `payments-service`.
- [x] **Email:** Configurar credenciales SMTP en `.env`.
- [x] **Seguridad:** Script `setup_credentials.sh` genera secretos seguros.

### 2. Base de Datos
- [x] **Preparar Scripts:** Se crearon `init_db.sh` y las migraciones (`003`, `004`, `005`).
- [ ] **Inicializar BD:** Ejecutar `./init_db.sh` para aplicar:
  - `003_add_fase3_enterprise.sql` (Schema Enterprise)
  - `004_add_providers_columns.sql` (WAHA/MP)
  - `005_add_chatwoot_tables.sql` (Chatwoot)

### 3. Integración Frontend - Microservicios (CRÍTICO)
*El Frontend actual apunta a la API monolítica antigua (`/api/...`) en lugar de los nuevos Microservicios (`/v1/...`).*
- [x] **Actualizar Base URL:** Se cambió `API_URL` a `http://localhost/v1`.
- [x] **Refactorizar `authService.js`:** Adaptado a endpoints de microservicios.
- [x] **Revisar otros servicios:** Verificado.

### 4. Infraestructura Docker
- [ ] **Swarm Init:** Ejecutar `docker swarm init` si no se ha hecho.
- [ ] **Despliegue:** Ejecutar `./deploy_fase3.sh` para levantar el stack de servicios.
- [ ] **Verificación:** Confirmar que los 7 servicios estén en estado `Running`.

---

## 🟡 Prioridad Media (Funcionalidad)

### 1. Testing de Integración
- [ ] **Health Checks:** Verificar respuesta 200 OK en `http://localhost/v1/*/health`.
- [ ] **Flujo de Usuario:** Probar registro, login y pago con los nuevos servicios.

### 2. Configuración de Servicios Auxiliares
- [x] **Chatwoot:** Microservicio implementado y migraciones creadas.
- [ ] **Google Analytics:** Configurar `GA4_MEASUREMENT_ID`.

---

## 🟢 Prioridad Baja (Optimización)

- [ ] **Limpieza:** Eliminar código muerto del backend monolítico.
- [ ] **Documentación:** Actualizar Swagger con los nuevos endpoints.
