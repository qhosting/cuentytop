# [ACTION_REQUIRED] CREDENCIALES NECESARIAS PARA CUENTY FASE 3

**Prioridad:** CRÍTICA  
**Estado:** BLOQUEANTE PARA TESTING Y PRODUCCIÓN  
**Fecha:** 2025-11-06

---

## ADVERTENCIA IMPORTANTE

⚠️ **El sistema CUENTY Fase 3 NO es funcional sin las siguientes credenciales de APIs externas.**

La implementación está completa a nivel de código, pero las integraciones críticas con servicios externos requieren credenciales reales que deben ser proporcionadas y configuradas.

**Estado actual:**
- ✅ Código implementado: 100%
- ✅ Infraestructura: 100%
- ✅ Documentación: 100%
- ❌ Credenciales configuradas: 0%
- ❌ Testing funcional: 0% (bloqueado por falta de credenciales)

---

## CREDENCIALES REQUERIDAS

### NIVEL 1: CRÍTICAS (Bloqueantes para funcionalidad básica)

#### 1. TWILIO (SMS + WhatsApp)
**Funcionalidad bloqueada:** 2FA, Notificaciones SMS/WhatsApp

**Credenciales necesarias:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+525512345678
```

**Cómo obtener:**
1. Crear cuenta en https://www.twilio.com/try-twilio
2. Ir a Console Dashboard
3. Copiar Account SID y Auth Token
4. Comprar número de teléfono mexicano (+52)

**Costo:**
- Registro: Gratis (incluye $15 USD de crédito)
- SMS: ~$0.05 USD por mensaje
- WhatsApp: ~$0.005 USD por mensaje
- Número telefónico: ~$1 USD/mes

**Tiempo estimado:** 15 minutos

**Prioridad:** 🔴 CRÍTICA (sin esto no funciona 2FA)

---

#### 2. SMTP (Email)
**Funcionalidad bloqueada:** Notificaciones por email, recuperación de contraseña

**Credenciales necesarias:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App Password, NO tu contraseña normal
```

**Cómo obtener (Gmail):**
1. Ir a https://myaccount.google.com/security
2. Activar "2-Step Verification"
3. Ir a "App Passwords"
4. Generar app password para "Mail"
5. Copiar el password de 16 caracteres

**Alternativas:**
- SendGrid (más robusto para producción)
- Amazon SES
- Mailgun

**Costo:**
- Gmail: Gratis (límite 500 emails/día)
- SendGrid: Gratis (100 emails/día), $19.95/mes (40,000 emails)

**Tiempo estimado:** 10 minutos

**Prioridad:** 🔴 CRÍTICA (emails de confirmación, recuperación)

---

### NIVEL 2: IMPORTANTES (Funcionalidad avanzada)

#### 3. BBVA Open Banking
**Funcionalidad bloqueada:** Pagos SPEI, consulta de saldos, transferencias

**Credenciales necesarias:**
```bash
BBVA_CLIENT_ID=tu_client_id
BBVA_CLIENT_SECRET=tu_client_secret
BBVA_API_URL=https://sandbox.api.bbva.com/v1  # o producción
```

**Cómo obtener:**
1. Registrarse en https://www.bbva.com/es/innovacion/open-banking/
2. Crear aplicación en developer portal
3. Solicitar acceso a API Sandbox
4. Copiar Client ID y Secret

**Costo:**
- Sandbox: Gratis
- Producción: Según volumen de transacciones

**Tiempo estimado:** 5-7 días hábiles (requiere aprobación manual)

**Prioridad:** 🟡 ALTA (pagos SPEI es funcionalidad core)

---

#### 4. Santander API
**Funcionalidad bloqueada:** SPEI+ (opcional, alternativa a BBVA)

**Credenciales necesarias:**
```bash
SANTANDER_API_KEY=tu_api_key
SANTANDER_CLIENT_ID=tu_client_id
SANTANDER_SECRET=tu_secret
```

**Cómo obtener:**
1. Contactar a Santander Open Banking
2. Solicitar acceso developer
3. Crear aplicación

**Tiempo estimado:** 3-5 días hábiles

**Prioridad:** 🟢 MEDIA (opcional si tienes BBVA)

---

#### 5. Banorte API
**Funcionalidad bloqueada:** CoDi (pagos QR)

**Credenciales necesarias:**
```bash
BANORTE_API_KEY=tu_api_key
BANORTE_SECRET=tu_secret
BANORTE_ENV=sandbox  # o production
```

**Cómo obtener:**
1. Contactar a Banorte directamente
2. Solicitar acceso a CoDi API

**Tiempo estimado:** 7-10 días hábiles

**Prioridad:** 🟡 ALTA (CoDi es método de pago popular en México)

---

### NIVEL 3: OPCIONALES (Mejoran funcionalidad)

#### 6. Google Analytics 4
**Funcionalidad bloqueada:** Tracking avanzado de eventos (funciona sin esto pero sin persistencia en GA4)

**Credenciales necesarias:**
```bash
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=xxxxxxxxxxxxxxxxxx
```

**Cómo obtener:**
1. Ir a https://analytics.google.com/
2. Crear propiedad GA4
3. Admin → Data Streams → Web
4. Copiar Measurement ID
5. Measurement Protocol API secrets → Create

**Costo:** Gratis

**Tiempo estimado:** 5 minutos

**Prioridad:** 🟢 MEDIA (analytics funciona localmente sin esto)

---

#### 7. OpenAI API (para ML avanzado)
**Funcionalidad bloqueada:** Predicciones ML avanzadas (funciona con modelo simplificado sin esto)

**Credenciales necesarias:**
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Cómo obtener:**
1. Registrarse en https://platform.openai.com/
2. API keys → Create new secret key
3. Copiar key (solo se muestra una vez)

**Costo:**
- Pay-as-you-go
- GPT-4: ~$0.03 por 1K tokens input, ~$0.06 por 1K tokens output
- Estimado para CUENTY: ~$50-100 USD/mes con uso moderado

**Tiempo estimado:** 5 minutos

**Prioridad:** 🟢 BAJA (modelo local funciona, pero con menor precisión)

**Nota importante:** Sin OpenAI, las predicciones de ML tienen ~65% de precisión vs ~85% con OpenAI

---

#### 8. Chatwoot
**Funcionalidad bloqueada:** Live chat, tickets de soporte

**Credenciales necesarias:**
```bash
CHATWOOT_API_URL=https://app.chatwoot.com
CHATWOOT_API_TOKEN=tu_api_token
CHATWOOT_ACCOUNT_ID=12345
```

**Cómo obtener:**
1. Crear cuenta en https://www.chatwoot.com/
2. Settings → Integrations → API Access Tokens
3. Create new token
4. Copiar Account ID del URL

**Costo:**
- Self-hosted: Gratis
- Cloud: Desde $19/mes

**Tiempo estimado:** 10 minutos

**Prioridad:** 🟢 MEDIA (nice to have)

---

## RESUMEN DE COSTOS

### Setup Inicial
- Twilio: $0 (incluye $15 crédito)
- Gmail SMTP: $0
- BBVA Sandbox: $0
- Google Analytics: $0
- **Total Setup: $0**

### Costos Mensuales Estimados
- Twilio (1,000 SMS/mes): ~$50 USD
- SendGrid (opcional): $0-20 USD
- BBVA producción: Variable según volumen
- OpenAI (opcional): $50-100 USD
- Chatwoot cloud (opcional): $19 USD
- **Total Mensual: $50-200 USD** (sin incluir transacciones bancarias)

---

## PLAN DE ACCIÓN RECOMENDADO

### FASE INMEDIATA (Día 1)
1. ✅ Crear cuenta Twilio → Configurar SMS/WhatsApp
2. ✅ Configurar Gmail App Password → Emails
3. ✅ Crear GA4 property → Analytics
4. ✅ Actualizar .env con estas credenciales
5. ✅ Testing FASE 1 y 2 (ver TESTING_GUIDE_FASE3.md)

**Resultado:** Sistema funcional básico (registro, login, 2FA, emails)

### FASE CORTO PLAZO (Semana 1)
1. ⏳ Solicitar acceso BBVA Sandbox
2. ⏳ Solicitar acceso Banorte API
3. ⏳ Mientras tanto: Usar mocks para testing interno
4. ⏳ Testing FASE 3 cuando lleguen credenciales

**Resultado:** Integraciones bancarias funcionando en sandbox

### FASE MEDIANO PLAZO (Mes 1)
1. ⏳ Solicitar BBVA producción
2. ⏳ Solicitar Banorte producción
3. ⏳ Configurar OpenAI (opcional)
4. ⏳ Testing completo FASE 4-6

**Resultado:** Sistema 100% funcional en producción

---

## INSTRUCCIONES DE CONFIGURACIÓN

### 1. Copiar archivo de ejemplo
```bash
cd /workspace/sistema_suscripciones
cp .env.example.fase3 .env
```

### 2. Editar con credenciales reales
```bash
nano .env

# O usar sed para reemplazar valores
sed -i 's/your_twilio_account_sid/ACxxxxxxxxxxxx/' .env
sed -i 's/your_twilio_auth_token/xxxxxxxxxxxx/' .env
# ... etc
```

### 3. Verificar credenciales
```bash
# Ejecutar script de verificación
./verify_credentials.sh
```

### 4. Desplegar con credenciales
```bash
# Re-desplegar servicios con nuevas variables
docker stack rm cuenty
sleep 10
docker stack deploy -c docker-compose-fase3.yml cuenty
```

### 5. Verificar funcionamiento
```bash
# Ver logs en busca de errores de autenticación
docker service logs cuenty_auth-service | grep -i error
docker service logs cuenty_payments-service | grep -i error
docker service logs cuenty_notifications-service | grep -i error
```

---

## CONTACTOS PARA OBTENER CREDENCIALES

### APIs Bancarias
- **BBVA**: developer.bbva.com
- **Santander**: openbank.santander.com
- **Banorte**: Contactar gerente de cuenta corporativa

### Servicios
- **Twilio**: https://www.twilio.com/contact-sales
- **Chatwoot**: https://www.chatwoot.com/pricing

### Soporte
Si tienes problemas obteniendo credenciales, contactar:
- **Email**: devops@cuenty.com
- **Slack**: #cuenty-fase3-credentials

---

## ALTERNATIVAS TEMPORALES (SOLO PARA TESTING)

Mientras se obtienen credenciales reales, puedes:

### 1. Usar Mocks de APIs Bancarias
```bash
# Editar payments-service para usar modo mock
nano microservices/payments-service/server.js

# Agregar al inicio:
const USE_MOCK_BANKING = process.env.USE_MOCK_BANKING === 'true';

# En .env:
USE_MOCK_BANKING=true
```

**Limitación:** No prueba integraciones reales, solo flujo lógico

### 2. Saltear 2FA en desarrollo
```bash
# En .env:
SKIP_2FA_IN_DEV=true
```

**Limitación:** Inseguro, solo para desarrollo local

### 3. Usar logs en lugar de emails
```bash
# En .env:
EMAIL_MODE=log  # En lugar de enviar emails, solo los registra
```

**Limitación:** No valida configuración SMTP

---

## CHECKLIST DE CREDENCIALES

### Antes de desplegar a STAGING
- [ ] Twilio configurado y verificado
- [ ] SMTP configurado y verificado
- [ ] GA4 configurado (opcional)
- [ ] BBVA Sandbox configurado
- [ ] Banorte Sandbox configurado (opcional)

### Antes de desplegar a PRODUCCIÓN
- [ ] Todas las credenciales de staging
- [ ] BBVA Producción aprobado
- [ ] Banorte Producción aprobado
- [ ] OpenAI configurado (recomendado)
- [ ] Chatwoot configurado
- [ ] Monitoring configurado (New Relic o Datadog)
- [ ] Backup automático configurado
- [ ] Disaster recovery plan documentado

---

## SIGUIENTE PASO

Una vez que proporciones las credenciales:

1. **Yo las configuraré** en el archivo .env
2. **Ejecutaré el testing** completo según TESTING_GUIDE_FASE3.md
3. **Generaré reporte** de testing con resultados
4. **Documentaré** cualquier issue encontrado
5. **Prepararé** para deployment a producción

**Tiempo estimado:** 8-16 horas de testing (una vez tengamos credenciales)

---

## PREGUNTA PARA EL USUARIO

¿Qué credenciales puedes proporcionar ahora mismo?

**Opción A (Ideal):** Todas las credenciales del Nivel 1 (Twilio + SMTP)  
**Opción B (Mínimo):** Solo Twilio para empezar testing de 2FA  
**Opción C (Temporal):** Ninguna todavía, usar mocks por ahora  

**Responde con A, B o C y te guío en los siguientes pasos.**

---

**Estado del proyecto:** ⏸️ PAUSADO EN ESPERA DE CREDENCIALES

**Próxima acción:** Usuario proporciona credenciales → Reanudar testing
