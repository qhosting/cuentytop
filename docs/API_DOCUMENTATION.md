# Sistema de Gestión de Suscripciones - Documentación de API

## 📋 Índice

1. [Información General](#información-general)
2. [Autenticación](#autenticación)
3. [Servicios](#servicios)
4. [Planes](#planes)
5. [Carrito de Compras](#carrito-de-compras)
6. [Órdenes](#órdenes)
7. [Administración](#administración)
8. [Códigos de Estado](#códigos-de-estado)
9. [Ejemplos de Uso](#ejemplos-de-uso)

## 🏷️ Información General

**URL Base:** `http://localhost:3000/api`

**Versión:** 2.0.0

**Autenticación:** JWT Token

**Formatos:** JSON

### Headers Requeridos
```http
Content-Type: application/json
Authorization: Bearer <token>
```

## 🔐 Autenticación

### Solicitar Código de Verificación
```http
POST /api/auth/user/phone/request-code
```

**Request Body:**
```json
{
  "telefono": "+525551234567"
}
```

**Response:**
```json
{
  "success": true,
  "mensaje": "Código de verificación enviado",
  "tiempo_expiracion": 10
}
```

### Verificar Código
```http
POST /api/auth/user/phone/verify-code
```

**Request Body:**
```json
{
  "telefono": "+525551234567",
  "codigo": "123456",
  "nombre": "Juan Pérez",
  "email": "juan@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "mensaje": "Verificación exitosa",
  "token": "jwt_token_here",
  "usuario": {
    "id": 1,
    "uuid": "uuid-string",
    "telefono": "+525551234567",
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "verified": true,
    "delivery_preference": "whatsapp"
  }
}
```

### Obtener Perfil
```http
GET /api/auth/user/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "usuario": {
    "id": 1,
    "uuid": "uuid-string",
    "telefono": "+525551234567",
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "verified": true,
    "delivery_preference": "whatsapp",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-01T00:00:00Z"
  }
}
```

### Actualizar Perfil
```http
PUT /api/auth/user/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "nombre": "Juan Pérez Actualizado",
  "email": "juan.nuevo@email.com",
  "delivery_preference": "email"
}
```

### Cerrar Sesión
```http
POST /api/auth/user/logout
Authorization: Bearer <token>
```

## 📺 Servicios

### Obtener Servicios Activos
```http
GET /api/servicios/activos
```

**Response:**
```json
{
  "success": true,
  "servicios": [
    {
      "id": 1,
      "nombre": "Netflix",
      "descripcion": "Plataforma de streaming de películas y series",
      "categoria": "Entretenimiento",
      "imagen_url": "https://ejemplo.com/netflix.png",
      "planes": [
        {
          "id": 1,
          "nombre_plan": "Plan Mensual",
          "duracion_meses": 1,
          "costo": 120.00,
          "margen": 30.00,
          "precio_venta": 150.00,
          "activo": true
        }
      ]
    }
  ]
}
```

### Obtener Servicio por ID
```http
GET /api/servicios/:id
```

### Crear Servicio (Admin)
```http
POST /api/servicios
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "nombre": "Nuevo Servicio",
  "descripcion": "Descripción del servicio",
  "categoria": "Entretenimiento",
  "imagen_url": "https://ejemplo.com/imagen.png",
  "orden": 1
}
```

### Actualizar Servicio (Admin)
```http
PUT /api/servicios/:id
Authorization: Bearer <admin_token>
```

### Eliminar Servicio (Admin)
```http
DELETE /api/servicios/:id
Authorization: Bearer <admin_token>
```

## 🎯 Planes

### Obtener Planes Activos
```http
GET /api/planes/activos
```

**Response:**
```json
{
  "success": true,
  "planes": [
    {
      "id": 1,
      "nombre_plan": "Plan Mensual",
      "duracion_meses": 1,
      "costo": 120.00,
      "margen": 30.00,
      "precio_venta": 150.00,
      "servicio_nombre": "Netflix",
      "categoria": "Entretenimiento"
    }
  ]
}
```

### Crear Plan (Admin)
```http
POST /api/planes
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "servicio_id": 1,
  "duracion_meses": 3,
  "nombre_plan": "Plan Trimestral",
  "costo": 340.00,
  "margen": 80.00,
  "orden": 2
}
```

## 🛒 Carrito de Compras

### Obtener Carrito
```http
GET /api/cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "carrito": [
    {
      "id": 1,
      "servicio": {
        "id": 1,
        "nombre": "Netflix",
        "categoria": "Entretenimiento"
      },
      "plan": {
        "id": 1,
        "nombre_plan": "Plan Mensual",
        "duracion_meses": 1,
        "precio_venta": 150.00
      },
      "cantidad": 2,
      "subtotal": 300.00
    }
  ],
  "total": 300.00,
  "total_items": 2
}
```

### Agregar Item al Carrito
```http
POST /api/cart/items
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "servicio_id": 1,
  "plan_id": 1,
  "cantidad": 1
}
```

### Actualizar Cantidad
```http
PUT /api/cart/items/:item_id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "cantidad": 3
}
```

### Eliminar Item
```http
DELETE /api/cart/items/:item_id
Authorization: Bearer <token>
```

### Verificar Disponibilidad
```http
GET /api/cart/disponibilidad
Authorization: Bearer <token>
```

## 📋 Órdenes

### Crear Orden desde Carrito
```http
POST /api/ordenes-new
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "mensaje": "Orden creada exitosamente",
  "orden": {
    "id": 1,
    "uuid": "uuid-string",
    "numero_orden": "ORD-001",
    "total": 300.00,
    "estado": "pending_payment",
    "instrucciones_pago": "...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Obtener Mis Órdenes
```http
GET /api/ordenes-new/mis-ordenes
Authorization: Bearer <token>
```

### Obtener Orden Específica
```http
GET /api/ordenes-new/:id
Authorization: Bearer <token>
```

### Cambiar Estado de Orden (Admin)
```http
PUT /api/ordenes-new/:id/estado
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "estado": "paid"
}
```

### Asignar Credenciales (Admin)
```http
POST /api/ordenes-new/items/:id/asignar
Authorization: Bearer <admin_token>
```

### Marcar como Entregado (Admin)
```http
POST /api/ordenes-new/items/:id/entregar
Authorization: Bearer <admin_token>
```

## 👨‍💼 Administración

### Login de Administrador
```http
POST /api/auth/admin/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Obtener Estadísticas (Admin)
```http
GET /api/ordenes-new/admin/estadisticas
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "estadisticas": {
    "total_ordenes": 100,
    "ordenes_pendientes": 15,
    "ordenes_pagadas": 20,
    "ordenes_entregadas": 65,
    "ingresos_totales": 15000.00,
    "ticket_promedio": 150.00
  }
}
```

### Listar Todas las Órdenes (Admin)
```http
GET /api/ordenes-new
Authorization: Bearer <admin_token>
```

## 📊 Códigos de Estado

### Respuestas Exitosas
- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `204 No Content` - Operación exitosa sin contenido

### Errores del Cliente
- `400 Bad Request` - Solicitud inválida
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - No autorizado
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto (recurso duplicado)
- `422 Unprocessable Entity` - Error de validación
- `429 Too Many Requests` - Demasiadas solicitudes

### Errores del Servidor
- `500 Internal Server Error` - Error interno del servidor
- `502 Bad Gateway` - Error del gateway
- `503 Service Unavailable` - Servicio no disponible

## 🔧 Ejemplos de Uso

### cURL

#### Solicitar Código de Verificación
```bash
curl -X POST http://localhost:3000/api/auth/user/phone/request-code \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "+525551234567"
  }'
```

#### Verificar Código
```bash
curl -X POST http://localhost:3000/api/auth/user/phone/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "+525551234567",
    "codigo": "123456",
    "nombre": "Juan Pérez"
  }'
```

#### Obtener Servicios Activos
```bash
curl -X GET http://localhost:3000/api/servicios/activos
```

#### Agregar al Carrito
```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "servicio_id": 1,
    "plan_id": 1,
    "cantidad": 1
  }'
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Solicitar código
const requestCode = async (telefono) => {
  try {
    const response = await api.post('/auth/user/phone/request-code', {
      telefono
    });
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
};

// Verificar código
const verifyCode = async (telefono, codigo, nombre) => {
  try {
    const response = await api.post('/auth/user/phone/verify-code', {
      telefono,
      codigo,
      nombre
    });
    
    // Guardar token
    localStorage.setItem('token', response.data.token);
    
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

// Obtener servicios
const getServices = async () => {
  try {
    const response = await api.get('/servicios/activos');
    return response.data.servicios;
  } catch (error) {
    console.error(error);
  }
};
```

### Python (requests)

```python
import requests

API_BASE = 'http://localhost:3000/api'

def request_verification_code(phone):
    response = requests.post(
        f'{API_BASE}/auth/user/phone/request-code',
        json={'telefono': phone}
    )
    return response.json()

def verify_code(phone, code, name):
    response = requests.post(
        f'{API_BASE}/auth/user/phone/verify-code',
        json={
            'telefono': phone,
            'codigo': code,
            'nombre': name
        }
    )
    return response.json()

def get_services():
    response = requests.get(f'{API_BASE}/servicios/activos')
    return response.json()
```

## 📝 Notas Importantes

### Autenticación
- Todos los endpoints protegidos requieren un JWT token válido
- El token debe incluirse en el header `Authorization: Bearer <token>`
- Los tokens expiran después de 7 días (configurable)

### Validaciones
- Los números de teléfono deben seguir el formato internacional (+52...)
- Los códigos de verificación expiran en 10 minutos
- Máximo 5 intentos de verificación por hora

### Límites
- Rate limiting: 100 requests por 15 minutos
- Autenticación: 10 intentos por 15 minutos
- Cantidad máxima por item: 10 unidades

### Errores Comunes
- `401 Unauthorized`: Token inválido o expirado
- `422 Unprocessable Entity`: Datos de validación incorrectos
- `429 Too Many Requests`: Exceso de solicitudes

---

**Desarrollado por:** MiniMax Agent  
**Versión:** 2.0.0  
**Última actualización:** Enero 2024