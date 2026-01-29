# 🗺️ ROADMAP - Cuenty Fase 3 Enterprise

Este documento describe la estrategia de evolución del proyecto Cuenty, partiendo del estado actual (Entrega de Código Fase 3) hacia la estabilización y expansión futura.

## 📍 Estado Actual (Noviembre 2025)
- **Código:** Completado (Backend Monolito + Microservicios, Frontend React).
- **Infraestructura:** Scripts de inicialización y despliegue listos (`deploy_fase3.sh`, `init_db.sh`).
- **Funcionalidad:**
  - Microservicios implementados: Auth, Payments (MercadoPago/SPEI), Notifications (WAHA), Chatwoot.
  - Frontend integrado con API Gateway.
  - Backup automático a Google Drive implementado.
- **Bloqueos:** Falta ejecución de despliegue y pruebas finales en entorno real.

---

## 📅 Fase 3: Estabilización (Mes 1 - Inmediato)
**Objetivo:** Poner el sistema en funcionamiento operativo (Production Ready).

### 1. Infraestructura y Configuración (✅ Completado)
- [x] Configuración completa de variables de entorno (`.env` generado por `setup_credentials.sh`).
- [x] Obtención e integración de credenciales (Soporte implementado para WAHA, MercadoPago, Chatwoot).
- [x] Scripts de despliegue y migración listos.

### 2. Refactorización del Frontend (✅ Completado)
- [x] Actualizar cliente HTTP (`axios`) para apuntar al API Gateway.
- [x] Migrar servicios de frontend (`authService`) para consumir endpoints de microservicios.

### 3. Testing y QA (🚧 En Progreso)
- [ ] Ejecutar despliegue en entorno de pruebas.
- [ ] Pruebas de conectividad (Health Checks).
- [ ] Pruebas de integración de flujos críticos (Registro, 2FA, Checkout, Pagos).

---

## 🚀 Fase 3.1: Mejoras de Producto (Mes 2-3 - Corto Plazo)
**Objetivo:** Mejorar la experiencia de usuario y las herramientas administrativas.

### 1. Experiencia de Usuario (UX)
- [ ] **Dashboard de Usuario:** Renovación visual y funcional en React.
- [ ] **Soporte Integrado:** Widget de Chatwoot en frontend.
- [ ] **Notificaciones Web:** Implementación de Push Notifications.

### 2. Herramientas Administrativas
- [ ] **Reportes Avanzados:** Exportación de métricas financieras y operativas.
- [ ] **Gestión de Tickets:** Sistema de tickets vinculado a Chatwoot.

---

## 🌍 Fase 4: Expansión (Mes 6+ - Largo Plazo)
**Objetivo:** Escalamiento masivo y nuevas tecnologías.

### 1. Canales Móviles
- [ ] **App Móvil Nativa:** Desarrollo en React Native.
- [ ] **Biometría:** Login con huella/FaceID.

### 2. Inteligencia Artificial
- [ ] **Modelo ML Avanzado:** Migración a OpenAI para predicción de churn.
- [ ] **Asistente Virtual:** Bot de soporte entrenado.

---

## 📊 Resumen de Metas

| Fase | Meta Principal | KPI de Éxito | Estado |
|------|----------------|--------------|--------|
| **Fase 3** | Sistema Operativo | 0 Errores Críticos | 🟡 Validando |
| **Fase 3.1** | Mejora UX/Admin | Tiempos de respuesta < 1h | ⚪ Pendiente |
| **Fase 4** | Escala y Móvil | 100k Usuarios | ⚪ Pendiente |
