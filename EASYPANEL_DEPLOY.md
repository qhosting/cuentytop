# 🚀 Guía de Despliegue en Easypanel
## Sistema de Gestión de Suscripciones

### 📋 Requisitos Previos

- Easypanel instalado y funcionando
- Dominio configurado (opcional)
- Puertos disponibles: 80, 443, 3000, 5432

### 🏗️ Estructura del Proyecto

```
sistema_suscripciones/
├── docker-compose.yml          # Configuración principal de Docker
├── .env                        # Variables de entorno (NO subir a git)
├── .env.example               # Plantilla de variables de entorno
├── backend/
│   ├── Dockerfile             # Imagen del backend
│   ├── .dockerignore          # Archivos a ignorar en Docker
│   └── ...                    # Código fuente del backend
└── frontend/
    ├── Dockerfile             # Imagen del frontend
    ├── .dockerignore          # Archivos a ignorar en Docker
    ├── nginx.conf             # Configuración de Nginx
    └── ...                    # Código fuente del frontend
```

### 🔧 Configuración en Easypanel

#### 1. **Crear Proyecto**

1. Accede a tu panel de Easypanel
2. Crea un nuevo proyecto
3. Sube el código fuente o clona desde un repositorio
4. Selecciona la tecnología: "Docker Compose"

#### 2. **Configurar Variables de Entorno**

En la sección de variables de entorno, añade:

```bash
# Variables Obligatorias (Cambiar por valores seguros)
DB_PASSWORD=password_seguro_aqui
JWT_SECRET=jwt_secret_muy_seguro_aqui

# Variables Opcionales
TWILIO_ACCOUNT_SID=tu_sid_de_twilio
TWILIO_AUTH_TOKEN=tu_token_de_twilio
TWILIO_PHONE_NUMBER=tu_numero_twilio

# Configuración de Dominio
CORS_ORIGIN=https://tudominio.com
REACT_APP_API_URL=https://tudominio.com/api
```

#### 3. **Configurar Puertos**

Mapea los puertos según tu configuración:

- **Frontend**: 80 → 80 (HTTP)
- **Backend**: 3000 → 3000 (API)
- **Base de Datos**: 5432 → 5432 (solo para desarrollo)

#### 4. **Configurar Dominios**

Si tienes un dominio, configura:

```
tudominio.com → Frontend (Puerto 80)
api.tudominio.com → Backend (Puerto 3000)
```

#### 5. **Instalación Automática**

Easypanel ejecutará automáticamente:

```bash
# 1. Construir las imágenes
docker-compose build

# 2. Iniciar los servicios
docker-compose up -d

# 3. Verificar que todo funciona
docker-compose ps
```

### 🛡️ Configuración de Seguridad

#### **Cambiar Credenciales por Defecto**

1. **Base de Datos**: Modifica `DB_PASSWORD` en variables de entorno
2. **JWT Secret**: Genera un JWT_SECRET único y seguro
3. **CORS**: Configura el dominio correcto en `CORS_ORIGIN`

#### **Passwords Seguros**

- Mínimo 12 caracteres
- Combinar mayúsculas, minúsculas, números y símbolos
- Ejemplo: `MiP4ssw0rd_S3cur3_2024!`

### 📊 Monitoreo y Logs

#### **Ver Logs en Tiempo Real**

```bash
# Logs de todos los servicios
docker-compose logs -f

# Logs específicos
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

#### **Comandos de Estado**

```bash
# Ver estado de contenedores
docker-compose ps

# Ver uso de recursos
docker stats

# Conectar a base de datos
docker-compose exec database psql -U admin -d suscripciones_db
```

### 🔄 Actualización del Sistema

#### **Actualizar Código**

1. Sube el nuevo código a tu repositorio
2. En Easypanel, ve a la sección de "Deploy"
3. Reconstruye los contenedores:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 🗄️ Base de Datos

#### **Acceso a PostgreSQL**

```bash
# Desde el contenedor
docker-compose exec database psql -U admin -d suscripciones_db

# Desde el host (solo si tienes acceso)
psql -h localhost -U admin -d suscripciones_db
```

#### **Backup y Restore**

```bash
# Backup
docker-compose exec database pg_dump -U admin suscripciones_db > backup.sql

# Restore
docker-compose exec -i database psql -U admin suscripciones_db < backup.sql
```

### 🚨 Solución de Problemas

#### **Contenedores no inician**

```bash
# Verificar logs de error
docker-compose logs backend
docker-compose logs frontend

# Verificar conectividad de red
docker-compose exec backend ping database
```

#### **Problemas de Puertos**

```bash
# Verificar qué usa cada puerto
netstat -tlnp | grep :80
netstat -tlnp | grep :3000
netstat -tlnp | grep :5432

# Cambiar puertos en docker-compose.yml si es necesario
```

#### **Base de Datos no conecta**

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose exec database pg_isready -U admin

# Verificar variables de entorno
docker-compose exec backend env | grep DB_
```

### 📈 Configuración de Producción

#### **Optimizaciones para Producción**

1. **Habilita HTTPS** con certificados SSL
2. **Configura reverse proxy** con Nginx
3. **Implementa backup automático** de base de datos
4. **Configura alertas** de monitoreo
5. **Optimiza recursos** de contenedores

#### **Variables de Producción**

```bash
NODE_ENV=production
REACT_APP_ENVIRONMENT=production
CORS_ORIGIN=https://tudominio.com
```

### 📞 Soporte

Si tienes problemas durante el despliegue:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica las variables de entorno
3. Confirma que los puertos estén disponibles
4. Consulta la documentación oficial de Easypanel

---

### ✅ Checklist de Despliegue

- [ ] Credenciales de base de datos cambiadas
- [ ] JWT_SECRET configurado y seguro
- [ ] Dominio y CORS configurados
- [ ] Puertos disponibles y mapeados
- [ ] Variables de entorno configuradas
- [ ] SSL/HTTPS configurado (recomendado)
- [ ] Backup de base de datos configurado
- [ ] Monitoreo activado

¡Tu sistema de gestión de suscripciones estará funcionando en Easypanel! 🎉