# Sistema de Gestión de Suscripciones

## 🎯 Descripción del Proyecto

Sistema completo de gestión de suscripciones para servicios de streaming (Netflix, Disney+, HBO Max, Amazon Prime Video, Spotify, etc.) con autenticación por teléfono, carrito de compras, gestión de órdenes y panel administrativo.

## ✨ Características Principales

### 🔐 Sistema de Autenticación
- Verificación por SMS/WhatsApp con código de 6 dígitos
- Registro y login con número telefónico
- Tokens JWT con expiración de 7 días
- Gestión de perfiles de usuario

### 🛒 Carrito de Compras
- Agregar múltiples servicios al carrito
- Actualizar cantidades (1-10 unidades)
- Verificar disponibilidad en tiempo real
- Cálculo automático de totales

### 📺 Gestión de Servicios
- Catálogo de 5 servicios de streaming principales
- Múltiples planes por servicio (1, 3, 6, 12 meses)
- Precios flexibles: Costo + Margen = Precio de Venta
- Estado activo/inactivo por servicio

### 📋 Sistema de Órdenes
- Creación de órdenes desde el carrito
- Múltiples estados: pendiente, pago pendiente, pagado, procesando, entregado, cancelado
- Instrucciones de pago automáticas
- Seguimiento de órdenes

### 🎫 Entrega de Credenciales
- 3 métodos de entrega: WhatsApp, Email, Panel web
- Asignación automática desde inventario
- Seguimiento de entregas
- Preferencias de entrega por usuario

### 👨‍💼 Panel Administrativo
- CRUD completo de servicios y planes
- Gestión de órdenes y estados
- Asignación de credenciales
- Estadísticas y dashboard
- Configuración de precios y márgenes

### 🔒 Seguridad
- Validación de solicitudes
- Autenticación JWT
- Separación de roles (admin/usuario)
- Encriptación de credenciales
- Protección contra SQL injection

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos principal
- **JWT** - Autenticación
- **bcrypt** - Hash de contraseñas
- **Twilio/WhatsApp API** - Verificación SMS

### Frontend
- **React** - Biblioteca de interfaces
- **Redux Toolkit** - Gestión de estado
- **Material-UI** - Componentes UI
- **Axios** - Cliente HTTP

### Infraestructura
- **Nginx** - Servidor web/proxy
- **PM2** - Gestión de procesos
- **Docker** - Contenedorización

## 📊 Estructura de la Base de Datos

### Tablas Principales
- `usuarios` - Información de usuarios
- `phone_verifications` - Códigos de verificación
- `servicios` - Catálogo de servicios de streaming
- `service_plans` - Planes de cada servicio
- `shopping_cart` - Carritos de usuarios
- `ordenes` - Órdenes de compra
- `order_items` - Items de cada orden
- `inventario_cuentas` - Inventario de credenciales
- `payment_instructions` - Instrucciones de pago

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 16+
- PostgreSQL 13+
- npm/yarn

### Pasos de Instalación

1. **Clonar repositorio**
```bash
git clone https://github.com/tu-repo/sistema-suscripciones.git
cd sistema-suscripciones
```

2. **Instalar dependencias backend**
```bash
cd backend
npm install
```

3. **Configurar base de datos**
```bash
# Crear base de datos PostgreSQL
createdb suscripciones_db

# Ejecutar esquema
psql suscripciones_db < database/schema.sql
```

4. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

5. **Iniciar servidor**
```bash
npm run dev
```

6. **Instalar dependencias frontend**
```bash
cd ../frontend
npm install
npm start
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/user/phone/request-code` - Solicitar código de verificación
- `POST /api/auth/user/phone/verify-code` - Verificar código
- `GET /api/auth/user/profile` - Obtener perfil
- `PUT /api/auth/user/profile` - Actualizar perfil
- `POST /api/auth/user/logout` - Cerrar sesión

### Servicios
- `GET /api/servicios/activos` - Obtener servicios activos
- `GET /api/servicios/:id` - Obtener servicio específico
- `GET /api/servicios` - Listar todos los servicios (admin)
- `POST /api/servicios` - Crear servicio (admin)
- `PUT /api/servicios/:id` - Actualizar servicio (admin)
- `DELETE /api/servicios/:id` - Eliminar servicio (admin)

### Planes
- `GET /api/planes/activos` - Obtener planes activos
- `GET /api/planes/:id` - Obtener plan específico
- `GET /api/planes` - Listar todos los planes (admin)
- `POST /api/planes` - Crear plan (admin)
- `PUT /api/planes/:id` - Actualizar plan (admin)
- `DELETE /api/planes/:id` - Eliminar plan (admin)

### Carrito
- `GET /api/cart` - Obtener carrito
- `POST /api/cart/items` - Agregar item al carrito
- `PUT /api/cart/items` - Actualizar item del carrito
- `DELETE /api/cart/items/:id` - Eliminar item del carrito
- `DELETE /api/cart` - Limpiar carrito
- `GET /api/cart/disponibilidad` - Verificar disponibilidad

### Órdenes
- `POST /api/ordenes-new` - Crear orden desde carrito
- `GET /api/ordenes-new/mis-ordenes` - Mis órdenes
- `GET /api/ordenes-new/:id` - Obtener orden específica
- `GET /api/ordenes-new` - Listar órdenes (admin)
- `PUT /api/ordenes-new/:id/estado` - Cambiar estado (admin)
- `POST /api/ordenes-new/items/:id/asignar` - Asignar credenciales (admin)
- `POST /api/ordenes-new/items/:id/entregar` - Marcar como entregado (admin)
- `GET /api/ordenes-new/admin/estadisticas` - Estadísticas (admin)

## 🎨 Frontend

### Páginas Principales
- **Inicio** - Catálogo de servicios
- **Carrito** - Gestión del carrito de compras
- **Mi Cuenta** - Perfil y configuraciones
- **Mis Órdenes** - Historial de órdenes
- **Panel Admin** - Administración completa

### Componentes
- `ServiceCard` - Tarjeta de servicio
- `PlanSelector` - Selector de planes
- `CartItem` - Item del carrito
- `OrderStatus` - Estado de orden
- `AdminDashboard` - Dashboard administrativo

## 📱 Flujo de Usuario

### Registro y Autenticación
1. Usuario ingresa número telefónico
2. Sistema envía código de 6 dígitos
3. Usuario verifica código
4. Sistema crea cuenta y genera token JWT
5. Usuario puede acceder a la plataforma

### Proceso de Compra
1. Usuario navega servicios disponibles
2. Selecciona servicio y plan deseado
3. Agrega al carrito
4. Revisa carrito y procede al pago
5. Sistema genera instrucciones de pago
6. Usuario realiza transferencia bancaria
7. Admin confirma pago y asigna credenciales
8. Sistema entrega credenciales según preferencias
9. Orden se marca como entregada

## 🔐 Configuración de Seguridad

### Variables de Entorno Requeridas
```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/suscripciones_db

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=7d

# Twilio/WhatsApp
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=tu_numero_twilio

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password_admin_seguro
```

### Configuración de Producción
1. Cambiar todas las contraseñas por defecto
2. Configurar SSL/TLS
3. Habilitar rate limiting
4. Configurar firewall
5. Habilitar logs de seguridad
6. Configurar backups automáticos

## 📈 Monitoreo y Métricas

### Métricas Disponibles
- Total de órdenes
- Órdenes pendientes de pago
- Órdenes pagadas
- Órdenes entregadas
- Ingresos totales
- Ticket promedio
- Servicios más vendidos

### Logs
- Autenticaciones
- Operaciones administrativas
- Errores de sistema
- Transacciones

## 🔄 Migración y Actualizaciones

### Versión Actual: 2.0.0
- ✅ Sistema completo implementado
- ✅ Todas las funcionalidades operativas
- ✅ Documentación completa
- ✅ Seguridad implementada

### Próximas Versiones
- **v2.1** - Métricas avanzadas y reportes
- **v2.2** - Sistema de afiliados
- **v2.3** - API pública para integraciones
- **v3.0** - Aplicación móvil nativa

## 🆘 Soporte y Documentación

### Documentación Disponible
- [Guía de API](docs/API_DOCUMENTATION.md)
- [Guía de Instalación](docs/SETUP_GUIDE.md)
- [Manual de Usuario](docs/USER_MANUAL.md)
- [Manual de Administración](docs/ADMIN_MANUAL.md)

### Contacto
- **Email**: soporte@tu-empresa.com
- **Teléfono**: +52 55 1234 5678
- **Documentación**: https://docs.tu-empresa.com

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.

---

**Desarrollado por MiniMax Agent** - Sistema de Gestión de Suscripciones v2.0.0