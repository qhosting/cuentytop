# 🗺️ ROADMAP - Cuenty Fase 3 Enterprise

Este documento describe la estrategia de evolución del proyecto Cuenty, partiendo del estado actual (Entrega de Código Fase 3) hacia la estabilización y expansión futura.

## 📍 Estado Actual (Noviembre 2025)
- **Código:** Completado (Backend Monolito + Microservicios, Frontend React).
- **Infraestructura:** Docker Swarm listo, API Gateway configurado.
- **Funcionalidad:** Implementada pero pendiente de configuración y testing.
- **Bloqueos:** Falta de credenciales externas y migración del Frontend a la arquitectura de microservicios.

---

## 📅 Fase 3: Estabilización (Mes 1 - Inmediato)
**Objetivo:** Poner el sistema en funcionamiento operativo (Production Ready).

### 1. Infraestructura y Configuración
- [ ] Configuración completa de variables de entorno (`.env`).
- [ ] Obtención e integración de credenciales (Twilio, SMTP, Bancos, Chatwoot).
- [ ] Despliegue de Docker Swarm y bases de datos.
- [ ] Ejecución de migraciones de base de datos (`003_add_fase3_enterprise.sql`).

### 2. Refactorización del Frontend
- [ ] Actualizar cliente HTTP (`axios`) para apuntar al API Gateway.
- [ ] Migrar servicios de frontend (`authService`, etc.) para consumir endpoints de microservicios (e.g., de `/api/auth` a `/v1/auth`).
- [ ] Manejo de nuevos formatos de respuesta y errores.

### 3. Testing y QA
- [ ] Pruebas de conectividad (Health Checks).
- [ ] Pruebas de integración de flujos críticos (Registro, 2FA, Checkout, Pagos SPEI).
- [ ] Validación de Webhooks bancarios y notificaciones.

---

## 🚀 Fase 3.1: Mejoras de Producto (Mes 2-3 - Corto Plazo)
**Objetivo:** Mejorar la experiencia de usuario y las herramientas administrativas.

### 1. Experiencia de Usuario (UX)
- [ ] **Dashboard de Usuario:** Renovación visual y funcional en React.
- [ ] **Soporte Integrado:** Chat en vivo (Chatwoot) dentro del dashboard de usuario.
- [ ] **Notificaciones Web:** Implementación de Push Notifications.

### 2. Herramientas Administrativas
- [ ] **Reportes Avanzados:** Exportación de métricas financieras y operativas (PDF/Excel).
- [ ] **Gestión de Tickets:** Sistema de tickets de soporte vinculado a usuarios.

---

## 🌍 Fase 4: Expansión (Mes 6+ - Largo Plazo)
**Objetivo:** Escalamiento masivo y nuevas tecnologías.

### 1. Canales Móviles
- [ ] **App Móvil Nativa:** Desarrollo en React Native (iOS/Android).
- [ ] **Biometría:** Login con huella/FaceID en móvil.

### 2. Inteligencia Artificial
- [ ] **Modelo ML Avanzado:** Migración del modelo simplificado a OpenAI/TensorFlow para predicción de churn.
- [ ] **Asistente Virtual:** Bot de soporte entrenado con base de conocimiento.

### 3. Expansión de Mercado
- [ ] **Internacionalización:** Soporte multi-moneda y multi-idioma real.
- [ ] **Nuevas Integraciones:** Pasarelas de pago internacionales (Stripe Global).

---

## 📊 Resumen de Metas

| Fase | Meta Principal | KPI de Éxito |
|------|----------------|--------------|
| **Fase 3** | Sistema Operativo | 0 Errores Críticos, Pagos SPEI funcionales |
| **Fase 3.1** | Mejora UX/Admin | Tiempos de respuesta soporte < 1h |
| **Fase 4** | Escala y Móvil | 100k Usuarios, App en Stores |
