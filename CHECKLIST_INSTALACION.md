# 📋 CHECKLIST DE INSTALACIÓN - SISTEMA MEXICANO

## ⚡ Instalación Express (30 minutos)

### **PASO 1: Aplicar Migraciones** (5 min)
```bash
# 1. Ir al directorio del proyecto
cd /path/to/sistema_suscripciones

# 2. Aplicar migración SPEI
psql -U postgres -d suscripciones_db -f database/migrations/001_add_spei_system.sql

# 3. Verificar tablas creadas
psql -U postgres -d suscripciones_db -c "\dt"
```

### **PASO 2: Configurar Cuenta SPEI** (5 min)
```bash
# Conectar a la base de datos
psql -U postgres -d suscripciones_db

# Actualizar con TUS datos bancarios
UPDATE spei_accounts SET
  banco = 'BBVA México',
  titular = 'TU EMPRESA S.A. DE C.V.',
  clabe = '012180001234567890',
  numero_cuenta = '1234567890'
WHERE id = 1;

# Salir: \q
```

### **PASO 3: Variables de Entorno** (10 min)
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con TUS credenciales
nano .env

# Variables CRÍTICAS a configurar:
DATABASE_URL=postgresql://user:pass@localhost:5432/suscripciones_db
JWT_SECRET=tu_secret_de_minimo_32_caracteres
SPEI_BANCO=BBVA México
SPEI_TITULAR=TU EMPRESA S.A. DE C.V.
SPEI_CLABE=012180001234567890
```

### **PASO 4: Credenciales Externas** (10 min)

#### **A) Twilio (SMS/WhatsApp)**
1. Ir a: https://www.twilio.com/console
2. Crear cuenta gratuita
3. Obtener: Account SID, Auth Token
4. Verificar número de teléfono

#### **B) Chatwoot (Atención al Cliente)**
1. Ir a: https://app.chatwoot.com
2. Crear cuenta gratuita
3. Crear inbox para web
4. Obtener Website Token

#### **C) Email (Gmail)**
1. Habilitar autenticación de 2 pasos
2. Crear password de aplicación
3. Usar email y password de aplicación

---

## 🧪 **TESTING INMEDIATO**

### **Health Check** (2 min)
```bash
# Verificar que el servidor inicia
npm start

# En otra terminal, probar endpoints:
curl http://localhost:3000/health
```

### **Probar SPEI** (5 min)
```bash
# 1. Crear orden en la base de datos
psql -U postgres -d suscripciones_db
INSERT INTO ordenes (usuario_id, total, estado, created_at) 
VALUES (1, 299.00, 'pending', NOW()) RETURNING id;
# Anotar el ID que devuelve (ej: 15)

# 2. Generar transacción SPEI
curl -X POST http://localhost:3000/api/spei/transactions \
  -H "Content-Type: application/json" \
  -d '{"ordenId": 15}'

# 3. Ver instrucciones SPEI generadas
# Debería devolver banco, CLABE, referencia, etc.
```

### **Probar Panel Admin** (5 min)
```bash
# 1. Acceder en navegador:
http://localhost:3000/admin

# 2. Login con credenciales admin
# Usuario: admin
# Password: admin123

# 3. Verificar dashboard con métricas
# 4. Probar gestión de usuarios
# 5. Verificar que el chat Chatwoot aparece
```

---

## 🚨 **SOLUCIÓN DE PROBLEMAS COMUNES**

### **Error: Puerto ocupado**
```bash
# Ver qué usa el puerto 3000
lsof -i :3000

# Matar proceso si es necesario
kill -9 PID_DEL_PROCESO

# O cambiar puerto en .env
PORT=3001
```

### **Error: Base de datos no conecta**
```bash
# Verificar que PostgreSQL está corriendo
sudo service postgresql status

# Reiniciar PostgreSQL
sudo service postgresql restart

# Verificar credenciales en .env
cat .env | grep DATABASE
```

### **Error: No llegan emails**
1. Verificar credenciales Gmail en .env
2. Confirmar que la app password es correcta
3. Verificar que el email existe y es válido

### **Error: No funciona Chatwoot**
1. Verificar Website Token en variables de entorno
2. Confirmar que Chatwoot está configurado
3. Revisar consola del navegador por errores JS

---

## 🎯 **FLUJO COMPLETO DE USUARIO**

### **1. Usuario hace orden:**
- Selecciona servicios → Agrega al carrito → Confirma orden
- Sistema genera orden con ID único

### **2. Sistema genera SPEI:**
- Crea transacción SPEI con referencia única
- Envía email con instrucciones de pago
- Muestra instrucciones en la página de confirmación

### **3. Cliente paga SPEI:**
- Va a su banco ( BBVA, Santander, etc.)
- Realiza transferencia con CLABE y referencia
- El sistema detecta el pago automáticamente

### **4. Sistema procesa pago:**
- Cambia estado a "paid"
- Envía credenciales por email/WhatsApp
- Notifica al admin de la venta

### **5. Cliente recibe credenciales:**
- Email con cuentas y passwords
- Acceso inmediato a sus suscripciones
- Chat soporte disponible 24/7

---

## 💰 **INGRESOS ESPERADOS**

### **Configuración típica de servicios:**
- Netflix: $149/mes (precio venta)
- Disney+: $129/mes
- HBO Max: $139/mes
- Spotify: $99/mes
- Prime Video: $109/mes

### **Margen típico:** 40-60% sobre precio de costo
### **Ticket promedio:** $299-499 MXN por orden

---

## 📞 **SOPORTE POST-INSTALACIÓN**

### **URLs Importantes:**
- **Sitio Principal:** http://localhost:3000
- **Panel Admin:** http://localhost:3000/admin  
- **Chat Cliente:** Widget visible en todo el sitio
- **API SPEI:** http://localhost:3000/api/spei/*

### **Archivos de Referencia:**
- `docs/GUIA_MEJORAS_MEXICO.md` - Documentación técnica completa
- `TESTING_GUIDE.md` - Guía detallada de testing
- `README_V3.md` - README actualizado con todas las funciones

---

## ✅ **CHECKLIST FINAL**

- [ ] ✅ Migraciones aplicadas
- [ ] ✅ Cuenta SPEI configurada
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Twilio configurado
- [ ] ✅ Chatwoot configurado
- [ ] ✅ Email configurado
- [ ] ✅ Health check pasando
- [ ] ✅ SPEI generando referencias
- [ ] ✅ Panel admin funcionando
- [ ] ✅ Chat visible en sitio
- [ ] ✅ Notificaciones enviando

**¡SISTEMA LISTO PARA GENERAR INGRESOS! 🎉**