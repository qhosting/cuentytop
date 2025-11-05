const { query } = require('../config/database');

class Usuario {
    // Crear nuevo usuario
    static async crear({ telefono, nombre, email, delivery_preference = 'whatsapp' }) {
        const sql = `
            INSERT INTO usuarios (telefono, nombre, email, delivery_preference, verified)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        try {
            const result = await query(sql, [telefono, nombre, email, delivery_preference, false]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creando usuario: ${error.message}`);
        }
    }

    // Buscar usuario por teléfono
    static async buscarPorTelefono(telefono) {
        const sql = `SELECT * FROM usuarios WHERE telefono = $1`;
        
        try {
            const result = await query(sql, [telefono]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando usuario por teléfono: ${error.message}`);
        }
    }

    // Buscar usuario por ID
    static async buscarPorId(id) {
        const sql = `SELECT * FROM usuarios WHERE id = $1`;
        
        try {
            const result = await query(sql, [id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando usuario por ID: ${error.message}`);
        }
    }

    // Buscar usuario por UUID
    static async buscarPorUUID(uuid) {
        const sql = `SELECT * FROM usuarios WHERE uuid = $1`;
        
        try {
            const result = await query(sql, [uuid]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error buscando usuario por UUID: ${error.message}`);
        }
    }

    // Verificar usuario
    static async verificar(id) {
        const sql = `UPDATE usuarios SET verified = true WHERE id = $1 RETURNING *`;
        
        try {
            const result = await query(sql, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error verificando usuario: ${error.message}`);
        }
    }

    // Actualizar perfil de usuario
    static async actualizarPerfil(id, { nombre, email, delivery_preference }) {
        const campos = [];
        const valores = [];
        let paramIndex = 1;

        if (nombre) {
            campos.push(`nombre = $${paramIndex}`);
            valores.push(nombre);
            paramIndex++;
        }

        if (email) {
            campos.push(`email = $${paramIndex}`);
            valores.push(email);
            paramIndex++;
        }

        if (delivery_preference) {
            campos.push(`delivery_preference = $${paramIndex}`);
            valores.push(delivery_preference);
            paramIndex++;
        }

        if (campos.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        campos.push(`updated_at = CURRENT_TIMESTAMP`);
        valores.push(id);

        const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        
        try {
            const result = await query(sql, valores);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error actualizando perfil: ${error.message}`);
        }
    }

    // Actualizar último login
    static async actualizarUltimoLogin(id) {
        const sql = `UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = $1`;
        
        try {
            await query(sql, [id]);
        } catch (error) {
            throw new Error(`Error actualizando último login: ${error.message}`);
        }
    }

    // Listar todos los usuarios (admin)
    static async listar(filtros = {}) {
        let sql = `SELECT * FROM usuarios`;
        const condiciones = [];
        const valores = [];

        // Filtros
        if (filtros.verified !== undefined) {
            condiciones.push(`verified = $${valores.length + 1}`);
            valores.push(filtros.verified);
        }

        if (filtros.buscar) {
            condiciones.push(`(nombre ILIKE $${valores.length + 1} OR telefono ILIKE $${valores.length + 1} OR email ILIKE $${valores.length + 1})`);
            valores.push(`%${filtros.buscar}%`);
        }

        if (condiciones.length > 0) {
            sql += ` WHERE ${condiciones.join(' AND ')}`;
        }

        sql += ` ORDER BY created_at DESC`;

        // Paginación
        if (filtros.limit) {
            sql += ` LIMIT $${valores.length + 1}`;
            valores.push(parseInt(filtros.limit));
        }

        if (filtros.offset) {
            sql += ` OFFSET $${valores.length + 1}`;
            valores.push(parseInt(filtros.offset));
        }

        try {
            const result = await query(sql, valores);
            return result.rows;
        } catch (error) {
            throw new Error(`Error listando usuarios: ${error.message}`);
        }
    }

    // Obtener estadísticas de usuarios
    static async obtenerEstadisticas() {
        const sql = `
            SELECT 
                COUNT(*) as total_usuarios,
                COUNT(*) FILTER (WHERE verified = true) as usuarios_verificados,
                COUNT(*) FILTER (WHERE verified = false) as usuarios_no_verificados,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as nuevos_ultimos_30_dias
            FROM usuarios
        `;

        try {
            const result = await query(sql);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }

    // Eliminar usuario (solo si no tiene órdenes)
    static async eliminar(id) {
        // Verificar que no tenga órdenes
        const sqlOrdenes = `SELECT COUNT(*) FROM ordenes WHERE usuario_id = $1`;
        const resultOrdenes = await query(sqlOrdenes, [id]);
        
        if (parseInt(resultOrdenes.rows[0].count) > 0) {
            throw new Error('No se puede eliminar usuario con órdenes existentes');
        }

        // Elim carrito primero
        await query(`DELETE FROM shopping_cart WHERE usuario_id = $1`, [id]);
        
        // Eliminar usuario
        const sql = `DELETE FROM usuarios WHERE id = $1 RETURNING *`;
        
        try {
            const result = await query(sql, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error eliminando usuario: ${error.message}`);
        }
    }
}

module.exports = Usuario;