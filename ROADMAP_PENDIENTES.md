# 📝 ROADMAP PENDIENTES - Cuenty Fase 3 Enterprise

Este documento lista las tareas pendientes, priorizadas por criticidad, para llevar el sistema de "código completo" a "operación en producción".

---

## 🔴 PRIORIDAD ALTA (Bloqueantes de Producción)

### 1. Infraestructura y Despliegue

#### 1.1 Servidor de Producción
- [ ] **Contratar servidor VPS/Cloud**
  - Especificaciones mínimas: 4 vCPU, 8GB RAM, 80GB SSD
  - Proveedores sugeridos: DigitalOcean, AWS Lightsail, Linode, Hetzner
  - Sistema operativo: Ubuntu 22.04 LTS
  - **Prioridad:** CRÍTICA
  - **Responsable:** DevOps
  - **ETA:** Inmediato

#### 1.2 Configuración Docker Swarm
- [ ] **Inicializar Docker Swarm en servidor**
  - Comando: `docker swarm init`
  - Verificar rol de nodo manager
  - **Prioridad:** CRÍTICA
  - **Bloqueante:** Sin esto, `deploy_fase3.sh` falla
  - **ETA:** Día 1

#### 1.3 Transferencia de Código
- [ ] **Clonar repositorio en servidor**
  - `git clone https://github.com/qhosting/cuentytop.git`
  - Verificar permisos de acceso al repositorio
  - **Prioridad:** ALTA
  - **ETA:** Día 1

---

### 2. Credenciales Externas (Sistema no funciona sin estas)

#### 2.1 WAHA (WhatsApp Business API)
- [ ] **Obtener credenciales WAHA**
  - URL del servicio WAHA
  - API Key de autenticación
  - Configurar en `.env`: `WAHA_API_URL`, `WAHA_API_KEY`
  - **Prioridad:** CRÍTICA (Autenticación 2FA depende de esto)
  - **Referencia:** `CREDENTIALS_REQUIRED.md` líneas 15-35
  - **ETA:** Semana 1

#### 2.2 MercadoPago
- [ ] **Crear cuenta de negocio MercadoPago**
  - Access Token (Producción)
  - Public Key
  - Configurar webhook URL
  - Configurar en `.env`: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`
  - **Prioridad:** CRÍTICA (Sin esto, no hay pasarela de pago)
  - **Referencia:** `CREDENTIALS_REQUIRED.md` líneas 67-95
  - **ETA:** Semana 1

#### 2.3 Google Drive Backups
- [ ] **Crear Service Account en Google Cloud**
  - Habilitar Google Drive API
  - Descargar `credentials.json`
  - Crear carpeta compartida en Drive
  - Obtener `GOOGLE_DRIVE_FOLDER_ID`
  - Configurar en `.env` o archivo JSON
  - **Prioridad:** ALTA (Backup es seguridad crítica)
  - **Referencia:** `BACKUP_SETUP.md`
  - **ETA:** Semana 1

#### 2.4 SMTP Email (Notificaciones)
- [ ] **Configurar servicio de email**
  - Proveedor: SendGrid, Mailgun o Gmail App Password
  - Variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
  - Verificar dominio si es necesario
  - **Prioridad:** MEDIA-ALTA (Funcionalidad de notificaciones)
  - **ETA:** Semana 1

#### 2.5 Secrets de Seguridad
- [x] **Script de generación automática** (`setup_credentials.sh`)
- [ ] **Ejecutar en servidor de producción**
  - Generar `JWT_SECRET` seguro (256 bits)
  - Generar `SESSION_SECRET`
  - Generar passwords para PostgreSQL
  - **Prioridad:** CRÍTICA (Seguridad base)
  - **ETA:** Inmediato después de acceso a servidor

---

### 3. Base de Datos en Producción

#### 3.1 Inicialización
- [ ] **Ejecutar script de inicialización**
  - Comando: `./init_db.sh`
  - Aplica migraciones 003, 004, 005
  - Verifica conexión con contenedor PostgreSQL
  - **Prioridad:** CRÍTICA
  - **Bloqueante:** API no arranca sin schema
  - **Dependencia:** Docker Swarm debe estar corriendo
  - **ETA:** Día 2

#### 3.2 Datos de Prueba (Opcional pero recomendado)
- [ ] **Cargar servicios iniciales**
  - Insertar catálogo de servicios (Netflix, Disney+, etc.)
  - Crear planes estándar (1, 3, 6, 12 meses)
  - Crear usuario admin inicial
  - **Prioridad:** ALTA
  - **Script:** Crear `seed.sql` o usar backend/scripts/seed.js
  - **ETA:** Día 3

---

### 4. Despliegue y Verificación

#### 4.1 Ejecución de Deploy
- [ ] **Ejecutar `./deploy_fase3.sh`**
  - Verificar que levanta 7 servicios principales
  - Revisar logs: `docker service logs cuenty_<service>`
  - **Prioridad:** CRÍTICA
  - **Tiempo estimado:** 5-10 minutos
  - **ETA:** Día 2

#### 4.2 Health Checks
- [ ] **Verificar endpoints de salud**
  - API Gateway: `http://localhost/health`
  - Auth: `http://localhost/v1/auth/health`
  - Payments: `http://localhost/v1/payments/health`
  - Notifications: `http://localhost/v1/notifications/health`
  - Subscriptions: `http://localhost/v1/subscriptions/health`
  - Chatwoot: `http://localhost/v1/chatwoot/health`
  - Analytics: `http://localhost/v1/analytics/health`
  - **Prioridad:** CRÍTICA
  - **Criterio de éxito:** Todos responden HTTP 200
  - **ETA:** Día 2

---

### 5. DNS y Dominio (Para acceso público)

#### 5.1 Registro de Dominio
- [ ] **Adquirir dominio**
  - Ejemplo: `cuenty.app`, `suscripciones.mx`
  - Proveedor: Namecheap, GoDaddy, Cloudflare Registrar
  - **Prioridad:** ALTA (No bloqueante, pero necesario para producción)
  - **ETA:** Semana 1

#### 5.2 Configuración DNS
- [ ] **Apuntar dominio a IP del servidor**
  - Registro A: `cuenty.app → IP_SERVIDOR`
  - Registro A: `www.cuenty.app → IP_SERVIDOR`
  - Registro A: `api.cuenty.app → IP_SERVIDOR` (opcional)
  - **Prioridad:** ALTA
  - **ETA:** Semana 1

#### 5.3 Certificado SSL
- [ ] **Configurar Let's Encrypt con Certbot**
  - Instalar certbot en servidor
  - Generar certificado para dominio
  - Configurar auto-renovación
  - Actualizar Nginx/API Gateway para HTTPS
  - **Prioridad:** CRÍTICA (Seguridad de pagos requiere HTTPS)
  - **ETA:** Semana 1

---

## 🟡 PRIORIDAD MEDIA (Funcionalidad y UX)

### 6. Testing de Integración

#### 6.1 Flujo de Usuario Completo
- [ ] **Test E2E: Registro y Login**
  - Usuario solicita código de verificación
  - Recibe código por WhatsApp (WAHA)
  - Ingresa código y obtiene token JWT
  - Token persiste en localStorage
  - **Referencia:** `TESTING_GUIDE_FASE2.md` Sección 6
  - **ETA:** Semana 2

#### 6.2 Test E2E: Compra y Pago
- [ ] **Simular compra completa**
  - Agregar servicio al carrito
  - Proceder a checkout
  - Generar orden
  - Recibir instrucciones SPEI
  - Simular confirmación de pago
  - Verificar asignación de credenciales
  - **Referencia:** `TESTING_GUIDE_FASE2.md` Sección 7
  - **ETA:** Semana 2

#### 6.3 Test Admin
- [ ] **Verificar panel administrativo**
  - Login con credenciales admin
  - Revisar dashboard de estadísticas
  - Crear/editar servicio
  - Cambiar estado de orden
  - Asignar credenciales manualmente
  - **ETA:** Semana 2

---

### 7. Monitoreo y Observabilidad

#### 7.1 Activar Prometheus + Grafana
- [ ] **Configurar stack de monitoreo**
  - Descomentar servicios en `docker-compose-fase3.yml`
  - Configurar scraping de métricas de microservicios
  - Crear dashboards básicos (CPU, RAM, requests/s)
  - **Prioridad:** MEDIA (No bloqueante, pero crítico para debugging)
  - **ETA:** Semana 2

#### 7.2 Logs Centralizados (Elasticsearch + Kibana)
- [ ] **Activar ELK Stack**
  - Configurar filebeat/fluentd para enviar logs
  - Crear índices por servicio
  - Configurar alertas para errores
  - **Prioridad:** MEDIA
  - **ETA:** Semana 3

---

### 8. Configuración de Servicios Auxiliares

#### 8.1 Google Analytics 4
- [ ] **Configurar tracking en frontend**
  - Crear propiedad GA4
  - Obtener `GA4_MEASUREMENT_ID`
  - Agregar script de tracking en `index.html`
  - **Prioridad:** BAJA-MEDIA (Analytics de usuario)
  - **ETA:** Semana 2

#### 8.2 Chatwoot Widget
- [ ] **Integrar widget de chat en frontend**
  - Obtener URL y token de Chatwoot
  - Inyectar script en páginas principales
  - Configurar enrutamiento de tickets
  - **Prioridad:** MEDIA (Soporte al usuario)
  - **ETA:** Semana 3

---

## 🟢 PRIORIDAD BAJA (Optimización y Deuda Técnica)

### 9. Limpieza de Código

#### 9.1 Backend Monolítico
- [ ] **Eliminar código legacy no utilizado**
  - Identificar rutas obsoletas en `backend/routes/`
  - Remover controladores duplicados
  - Actualizar `server.js` para quitar imports innecesarios
  - **Razón:** El backend ahora actúa como fallback; microservicios son prioritarios
  - **ETA:** Semana 4

#### 9.2 Frontend
- [ ] **Optimización de bundle**
  - Analizar tamaño de build con `vite build --report`
  - Code splitting de rutas
  - Lazy loading de componentes pesados (Material-UI)
  - **Beneficio:** Mejora tiempo de carga inicial
  - **ETA:** Semana 4

---

### 10. Documentación

#### 10.1 Swagger/OpenAPI
- [ ] **Actualizar documentación de API**
  - Generar schemas para microservicios
  - Actualizar `swagger.json` con endpoints `/v1/*`
  - Probar interfaz en `/docs`
  - **Prioridad:** BAJA (Documentación interna)
  - **ETA:** Mes 2

#### 10.2 Runbooks de Operación
- [ ] **Crear guías de troubleshooting**
  - Qué hacer si un servicio falla
  - Cómo hacer rollback de deploy
  - Procedimiento de recuperación de backups
  - **Prioridad:** BAJA (Pero recomendado)
  - **ETA:** Mes 2

---

### 11. Mejoras de Seguridad (Post-lanzamiento)

#### 11.1 Firewall y Rate Limiting Avanzado
- [ ] **Configurar UFW/iptables en servidor**
  - Cerrar puertos no utilizados
  - Whitelist de IPs administrativas
  - **ETA:** Semana 3

#### 11.2 Autenticación de Dos Factores para Admin
- [ ] **Implementar TOTP (Google Authenticator)**
  - Biblioteca: `speakeasy` + `qrcode`
  - Endpoint: `/api/admin/2fa/setup`
  - **Prioridad:** BAJA (Admin ya usa contraseña fuerte)
  - **ETA:** Mes 3

---

## 📊 Resumen de Dependencias Críticas

| Item | Bloqueante | Dependencias | ETA |
|------|-----------|--------------|-----|
| Servidor VPS | ✅ SÍ | - | Día 0 |
| Docker Swarm Init | ✅ SÍ | Servidor | Día 1 |
| Credenciales WAHA | ✅ SÍ | - | Semana 1 |
| Credenciales MercadoPago | ✅ SÍ | - | Semana 1 |
| Google Drive Backup | ⚠️ Recomendado | - | Semana 1 |
| Ejecución de deploy_fase3.sh | ✅ SÍ | Swarm, .env | Día 2 |
| Inicialización BD | ✅ SÍ | Deploy corriendo | Día 2 |
| Health Checks | ✅ SÍ | BD inicializada | Día 2 |
| Dominio + SSL | ⚠️ Para producción pública | Servidor | Semana 1 |
| Testing E2E | ⚠️ QA antes de lanzar | Todo lo anterior | Semana 2 |

---

## 🎯 Plan de Acción Sugerido (Sprint 0)

### Semana 1: Infraestructura Base
1. Contratar servidor (Día 1)
2. Configurar Docker Swarm (Día 1)
3. Obtener credenciales WAHA y MercadoPago (paralelo Días 1-5)
4. Configurar Google Drive backups (Días 3-4)
5. Ejecutar `setup_credentials.sh` (Día 2)
6. Ejecutar `deploy_fase3.sh` (Día 2)
7. Ejecutar `init_db.sh` (Día 2)
8. Verificar Health Checks (Día 2-3)
9. Registrar dominio y configurar DNS (Días 4-7)
10. Configurar SSL con Let's Encrypt (Día 7)

### Semana 2: Testing y Refinamiento
1. Testing E2E de flujos críticos
2. Ajustes de configuración basados en logs
3. Activar Prometheus + Grafana
4. Cargar datos de prueba y servicios reales
5. Configurar Google Analytics

### Semana 3: Pre-lanzamiento
1. Testing de carga (opcional: k6, artillery)
2. Activar Elasticsearch/Kibana
3. Configurar Chatwoot widget
4. Revisión final de seguridad
5. Preparar plan de comunicación a usuarios

### Semana 4: Lanzamiento
1. Despliegue a producción final
2. Monitoreo intensivo 24/7 primeros 3 días
3. Retrospectiva y documentación de incidentes

---

**Última Actualización:** 2026-02-01  
**Responsable:** Lead Architect & DevOps Team  
**Normativa:** Aurum Clean Code  
**Próxima Revisión:** Después de Semana 1
