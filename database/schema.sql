-- =====================================================
-- SISTEMA DE GESTIÓN DE SUSCRIPCIONES - ESQUEMA DE BASE DE DATOS
-- Versión: 2.0.0
-- Descripción: Esquema completo para plataforma de suscripciones
-- =====================================================

-- =====================================================
-- EXTENSIONES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLA: usuarios
-- Descripción: Tabla principal de usuarios del sistema
-- =====================================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    delivery_preference VARCHAR(50) DEFAULT 'whatsapp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_telefono ON usuarios(telefono);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_verified ON usuarios(verified);

-- =====================================================
-- TABLA: phone_verifications
-- Descripción: Códigos de verificación telefónica
-- =====================================================

CREATE TABLE phone_verifications (
    id SERIAL PRIMARY KEY,
    telefono VARCHAR(20) NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para phone_verifications
CREATE INDEX idx_phone_verifications_telefono ON phone_verifications(telefono);
CREATE INDEX idx_phone_verifications_expires ON phone_verifications(expires_at);
CREATE INDEX idx_phone_verifications_code ON phone_verifications(codigo);

-- =====================================================
-- TABLA: servicios
-- Descripción: Catálogo de servicios de streaming
-- =====================================================

CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    imagen_url VARCHAR(500),
    categoria VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para servicios
CREATE INDEX idx_servicios_activo ON servicios(activo);
CREATE INDEX idx_servicios_categoria ON servicios(categoria);

-- =====================================================
-- TABLA: service_plans
-- Descripción: Planes de cada servicio con precios
-- =====================================================

CREATE TABLE service_plans (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
    duracion_meses INTEGER NOT NULL,
    nombre_plan VARCHAR(255) NOT NULL,
    costo DECIMAL(10,2) NOT NULL,
    margen DECIMAL(10,2) NOT NULL,
    precio_venta DECIMAL(10,2) GENERATED ALWAYS AS (costo + margen) STORED,
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para service_plans
CREATE INDEX idx_service_plans_servicio ON service_plans(servicio_id);
CREATE INDEX idx_service_plans_activo ON service_plans(activo);

-- =====================================================
-- TABLA: shopping_cart
-- Descripción: Carritos de compra de usuarios
-- =====================================================

CREATE TABLE shopping_cart (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    servicio_id INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES service_plans(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_usuario_servicio_plan UNIQUE (usuario_id, servicio_id, plan_id)
);

-- Índices para shopping_cart
CREATE INDEX idx_shopping_cart_usuario ON shopping_cart(usuario_id);
CREATE INDEX idx_shopping_cart_servicio ON shopping_cart(servicio_id);

-- =====================================================
-- TABLA: ordenes
-- Descripción: Órdenes de compra
-- =====================================================

CREATE TABLE ordenes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    numero_orden VARCHAR(50) UNIQUE NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pending',
    notas TEXT,
    instrucciones_pago TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Estados posibles: pending, pending_payment, paid, processing, delivered, cancelled
    CONSTRAINT valid_estado CHECK (estado IN ('pending', 'pending_payment', 'paid', 'processing', 'delivered', 'cancelled'))
);

-- Índices para ordenes
CREATE INDEX idx_ordenes_usuario ON ordenes(usuario_id);
CREATE INDEX idx_ordenes_numero ON ordenes(numero_orden);
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_created ON ordenes(created_at);

-- =====================================================
-- TABLA: order_items
-- Descripción: Items de cada orden
-- =====================================================

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    orden_id INTEGER REFERENCES ordenes(id) ON DELETE CASCADE,
    servicio_id INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES service_plans(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (precio_unitario * cantidad) STORED,
    estado VARCHAR(50) DEFAULT 'pending',
    credenciales_asignadas BOOLEAN DEFAULT FALSE,
    credenciales_entregadas BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_item_estado CHECK (estado IN ('pending', 'assigned', 'delivered', 'cancelled'))
);

-- Índices para order_items
CREATE INDEX idx_order_items_orden ON order_items(orden_id);
CREATE INDEX idx_order_items_servicio ON order_items(servicio_id);
CREATE INDEX idx_order_items_estado ON order_items(estado);

-- =====================================================
-- TABLA: inventario_cuentas
-- Descripción: Inventario de credenciales para cada servicio
-- =====================================================

CREATE TABLE inventario_cuentas (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES service_plans(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    otros_datos TEXT,
    estado VARCHAR(50) DEFAULT 'available',
    assigned_order_item_id INTEGER REFERENCES order_items(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_cuenta_estado CHECK (estado IN ('available', 'assigned', 'used'))
);

-- Índices para inventario_cuentas
CREATE INDEX idx_inventario_servicio ON inventario_cuentas(servicio_id);
CREATE INDEX idx_inventario_plan ON inventario_cuentas(plan_id);
CREATE INDEX idx_inventario_estado ON inventario_cuentas(estado);
CREATE INDEX idx_inventario_assigned ON inventario_cuentas(assigned_order_item_id);

-- =====================================================
-- TABLA: delivery_credentials
-- Descripción: Registro de entregas de credenciales
-- =====================================================

CREATE TABLE delivery_credentials (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    delivery_method VARCHAR(50) NOT NULL,
    delivery_address VARCHAR(500),
    delivered_at TIMESTAMP,
    delivery_status VARCHAR(50) DEFAULT 'pending',
    delivery_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_delivery_method CHECK (delivery_method IN ('whatsapp', 'email', 'website')),
    CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed'))
);

-- Índices para delivery_credentials
CREATE INDEX idx_delivery_order_item ON delivery_credentials(order_item_id);
CREATE INDEX idx_delivery_usuario ON delivery_credentials(usuario_id);
CREATE INDEX idx_delivery_status ON delivery_credentials(delivery_status);

-- =====================================================
-- TABLA: payment_instructions
-- Descripción: Instrucciones de pago para órdenes
-- =====================================================

CREATE TABLE payment_instructions (
    id SERIAL PRIMARY KEY,
    orden_id INTEGER REFERENCES ordenes(id) ON DELETE CASCADE,
    banco_nombre VARCHAR(255) NOT NULL,
    titular VARCHAR(255) NOT NULL,
    clabe_interbancaria VARCHAR(20),
    numero_cuenta VARCHAR(20),
    concepto_pago VARCHAR(255) NOT NULL,
    instrucciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para payment_instructions
CREATE INDEX idx_payment_instructions_orden ON payment_instructions(orden_id);
CREATE INDEX idx_payment_instructions_activo ON payment_instructions(activo);

-- =====================================================
-- TABLA: admin_users
-- Descripción: Usuarios administradores del sistema
-- =====================================================

CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para admin_users
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_active ON admin_users(active);

-- =====================================================
-- TABLA: system_logs
-- Descripción: Logs del sistema para auditoría
-- =====================================================

CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    admin_user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para system_logs
CREATE INDEX idx_system_logs_user ON system_logs(user_id);
CREATE INDEX idx_system_logs_admin ON system_logs(admin_user_id);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_created ON system_logs(created_at);

-- =====================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================

-- Función para actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON usuarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servicios_updated_at 
    BEFORE UPDATE ON servicios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_plans_updated_at 
    BEFORE UPDATE ON service_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_cart_updated_at 
    BEFORE UPDATE ON shopping_cart 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordenes_updated_at 
    BEFORE UPDATE ON ordenes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventario_cuentas_updated_at 
    BEFORE UPDATE ON inventario_cuentas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_credentials_updated_at 
    BEFORE UPDATE ON delivery_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_instructions_updated_at 
    BEFORE UPDATE ON payment_instructions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Usuario administrador por defecto
INSERT INTO admin_users (username, password_hash, nombre_completo, email) VALUES 
('admin', '$2b$12$LQv3c1yqBwlV3eQj8v7qEuKQyYVZzQ0jR/ZQK8zB7nX8mN4pR3sT', 'Administrador del Sistema', 'admin@sistema.com');

-- Servicios de streaming principales
INSERT INTO servicios (nombre, descripcion, categoria, orden) VALUES
('Netflix', 'Plataforma de streaming de películas y series', 'Entretenimiento', 1),
('Disney+', 'Contenido de Disney, Marvel, Star Wars y más', 'Entretenimiento', 2),
('HBO Max', 'Contenido premium de HBO y Warner Bros', 'Entretenimiento', 3),
('Amazon Prime Video', 'Streaming incluido con Amazon Prime', 'Entretenimiento', 4),
('Spotify', 'Plataforma de música en streaming', 'Música', 5);

-- Planes por servicio
-- Netflix
INSERT INTO service_plans (servicio_id, duracion_meses, nombre_plan, costo, margen, orden) VALUES
(1, 1, 'Plan Mensual', 120.00, 30.00, 1),
(1, 3, 'Plan Trimestral', 340.00, 80.00, 2),
(1, 6, 'Plan Semestral', 650.00, 150.00, 3),
(1, 12, 'Plan Anual', 1200.00, 300.00, 4);

-- Disney+
INSERT INTO service_plans (servicio_id, duracion_meses, nombre_plan, costo, margen, orden) VALUES
(2, 1, 'Plan Mensual', 150.00, 35.00, 1),
(2, 3, 'Plan Trimestral', 420.00, 100.00, 2),
(2, 6, 'Plan Semestral', 780.00, 180.00, 3),
(2, 12, 'Plan Anual', 1440.00, 360.00, 4);

-- HBO Max
INSERT INTO service_plans (servicio_id, duracion_meses, nombre_plan, costo, margen, orden) VALUES
(3, 1, 'Plan Mensual', 180.00, 40.00, 1),
(3, 3, 'Plan Trimestral', 500.00, 120.00, 2),
(3, 6, 'Plan Semestral', 900.00, 200.00, 3),
(3, 12, 'Plan Anual', 1680.00, 420.00, 4);

-- Amazon Prime Video
INSERT INTO service_plans (servicio_id, duracion_meses, nombre_plan, costo, margen, orden) VALUES
(4, 1, 'Plan Mensual', 100.00, 25.00, 1),
(4, 3, 'Plan Trimestral', 280.00, 70.00, 2),
(4, 6, 'Plan Semestral', 520.00, 130.00, 3),
(4, 12, 'Plan Anual', 960.00, 240.00, 4);

-- Spotify
INSERT INTO service_plans (servicio_id, duracion_meses, nombre_plan, costo, margen, orden) VALUES
(5, 1, 'Plan Individual', 80.00, 20.00, 1),
(5, 3, 'Plan Trimestral', 220.00, 55.00, 2),
(5, 6, 'Plan Semestral', 400.00, 100.00, 3),
(5, 12, 'Plan Anual', 720.00, 180.00, 4);

-- Instrucciones de pago por defecto
INSERT INTO payment_instructions (banco_nombre, titular, clabe_interbancaria, numero_cuenta, concepto_pago, instrucciones) VALUES
('BBVA Bancomer', 'TU EMPRESA S.A. DE C.V.', '012345678901234567', '0123456789', 'Orden #', 
'1. Realiza la transferencia por el monto exacto
2. Incluye el número de orden en el concepto
3. Envía tu comprobante por WhatsApp
4. Recibirás tus credenciales en menos de 2 horas');

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para órdenes con información de usuario
CREATE VIEW ordenes_detalladas AS
SELECT 
    o.id,
    o.uuid,
    o.numero_orden,
    o.total,
    o.estado,
    o.created_at,
    u.nombre as usuario_nombre,
    u.telefono as usuario_telefono,
    u.email as usuario_email
FROM ordenes o
JOIN usuarios u ON o.usuario_id = u.id;

-- Vista para items de orden con detalles del servicio
CREATE VIEW order_items_detallados AS
SELECT 
    oi.id,
    oi.orden_id,
    oi.cantidad,
    oi.precio_unitario,
    oi.subtotal,
    oi.estado,
    oi.credenciales_asignadas,
    oi.credenciales_entregadas,
    s.nombre as servicio_nombre,
    sp.nombre_plan,
    sp.duracion_meses,
    o.numero_orden,
    u.nombre as usuario_nombre,
    u.telefono as usuario_telefono
FROM order_items oi
JOIN servicios s ON oi.servicio_id = s.id
JOIN service_plans sp ON oi.plan_id = sp.id
JOIN ordenes o ON oi.orden_id = o.id
JOIN usuarios u ON o.usuario_id = u.id;

-- Vista para estadísticas de órdenes
CREATE VIEW ordenes_estadisticas AS
SELECT 
    estado,
    COUNT(*) as cantidad,
    SUM(total) as ingresos_totales,
    AVG(total) as ticket_promedio
FROM ordenes 
GROUP BY estado;

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================

COMMENT ON TABLE usuarios IS 'Tabla principal de usuarios del sistema con información personal';
COMMENT ON TABLE phone_verifications IS 'Códigos de verificación telefónica para autenticación';
COMMENT ON TABLE servicios IS 'Catálogo de servicios de streaming disponibles';
COMMENT ON TABLE service_plans IS 'Planes y precios de cada servicio de streaming';
COMMENT ON TABLE shopping_cart IS 'Carritos de compra de usuarios';
COMMENT ON TABLE ordenes IS 'Órdenes de compra del sistema';
COMMENT ON TABLE order_items IS 'Items específicos de cada orden de compra';
COMMENT ON TABLE inventario_cuentas IS 'Inventario de credenciales disponibles para venta';
COMMENT ON TABLE delivery_credentials IS 'Registro de entregas de credenciales a usuarios';
COMMENT ON TABLE payment_instructions IS 'Instrucciones de pago para transferencias bancarias';
COMMENT ON TABLE admin_users IS 'Usuarios administradores del sistema';
COMMENT ON TABLE system_logs IS 'Logs del sistema para auditoría y seguimiento';

-- =====================================================
-- FINAL DEL ESQUEMA
-- =====================================================

-- Mostrar resumen final
SELECT 
    'Esquema de Base de Datos Creado Exitosamente' as mensaje,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tablas,
    'v2.0.0' as version;