const { query } = require('../config/database');

class PhoneVerification {
    // Generar nuevo código de verificación
    static async generarCodigo(telefono) {
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        // Eliminar códigos anteriores del mismo teléfono
        await query('DELETE FROM phone_verifications WHERE telefono = $1', [telefono]);

        // Crear nuevo código
        const sql = `
            INSERT INTO phone_verifications (telefono, codigo, expires_at)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        try {
            const result = await query(sql, [telefono, codigo, expiresAt]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error generando código de verificación: ${error.message}`);
        }
    }

    // Verificar código
    static async verificarCodigo(telefono, codigo) {
        const sql = `
            SELECT * FROM phone_verifications 
            WHERE telefono = $1 
            AND codigo = $2 
            AND expires_at > CURRENT_TIMESTAMP
            AND verified = false
            AND attempts < 5
            ORDER BY created_at DESC
            LIMIT 1
        `;

        try {
            const result = await query(sql, [telefono, codigo]);
            const verification = result.rows[0];

            if (!verification) {
                // Incrementar intentos para códigos inválidos
                await query(
                    'UPDATE phone_verifications SET attempts = attempts + 1 WHERE telefono = $1',
                    [telefono]
                );
                return { valido: false, mensaje: 'Código inválido o expirado' };
            }

            // Marcar como verificado
            await query(
                'UPDATE phone_verifications SET verified = true WHERE id = $1',
                [verification.id]
            );

            return { 
                valido: true, 
                mensaje: 'Código verificado exitosamente',
                verificacion: verification 
            };
        } catch (error) {
            throw new Error(`Error verificando código: ${error.message}`);
        }
    }

    // Verificar si un teléfono tiene código válido pendiente
    static async tieneCodigoValido(telefono) {
        const sql = `
            SELECT * FROM phone_verifications 
            WHERE telefono = $1 
            AND expires_at > CURRENT_TIMESTAMP
            AND verified = false
            ORDER BY created_at DESC
            LIMIT 1
        `;

        try {
            const result = await query(sql, [telefono]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error verificando código pendiente: ${error.message}`);
        }
    }

    // Obtener último código enviado (para reenvío)
    static async obtenerUltimoCodigo(telefono) {
        const sql = `
            SELECT * FROM phone_verifications 
            WHERE telefono = $1 
            ORDER BY created_at DESC
            LIMIT 1
        `;

        try {
            const result = await query(sql, [telefono]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error obteniendo último código: ${error.message}`);
        }
    }

    // Limpiar códigos expirados
    static async limpiarCodigosExpirados() {
        const sql = `DELETE FROM phone_verifications WHERE expires_at <= CURRENT_TIMESTAMP`;

        try {
            const result = await query(sql);
            console.log(`🧹 Limpieza de códigos: ${result.rowCount} códigos expirados eliminados`);
            return result.rowCount;
        } catch (error) {
            throw new Error(`Error limpiando códigos expirados: ${error.message}`);
        }
    }

    // Verificar intentos de un teléfono
    static async verificarIntentos(telefono) {
        const sql = `
            SELECT attempts, created_at 
            FROM phone_verifications 
            WHERE telefono = $1 
            AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
            ORDER BY attempts DESC
            LIMIT 1
        `;

        try {
            const result = await query(sql, [telefono]);
            const registro = result.rows[0];
            
            if (registro && registro.attempts >= 5) {
                const unaHora = new Date(registro.created_at.getTime() + 60 * 60 * 1000);
                const ahora = new Date();
                
                if (ahora < unaHora) {
                    const tiempoRestante = Math.ceil((unaHora - ahora) / (60 * 1000));
                    return {
                        bloqueado: true,
                        mensaje: `Demasiados intentos. Intenta nuevamente en ${tiempoRestante} minutos`,
                        tiempoRestante
                    };
                }
            }
            
            return { bloqueado: false };
        } catch (error) {
            throw new Error(`Error verificando intentos: ${error.message}`);
        }
    }

    // Generar nuevo código (reenvío)
    static async reenviarCodigo(telefono) {
        // Verificar que no esté bloqueado
        const verificacionBloqueo = await this.verificarIntentos(telefono);
        if (verificacionBloqueo.bloqueado) {
            throw new Error(verificacionBloqueo.mensaje);
        }

        // Verificar último código enviado
        const ultimoCodigo = await this.obtenerUltimoCodigo(telefono);
        if (ultimoCodigo) {
            const tiempoTranscurrido = Date.now() - ultimoCodigo.created_at.getTime();
            const UN_MINUTO = 60 * 1000;
            
            if (tiempoTranscurrido < UN_MINUTO) {
                const tiempoRestante = Math.ceil((UN_MINUTO - tiempoTranscurrido) / 1000);
                throw new Error(`Debes esperar ${tiempoRestante} segundos antes de solicitar otro código`);
            }
        }

        return await this.generarCodigo(telefono);
    }

    // Estadísticas de verificación
    static async obtenerEstadisticas() {
        const sql = `
            SELECT 
                COUNT(*) as total_codigos,
                COUNT(*) FILTER (WHERE verified = true) as codigos_verificados,
                COUNT(*) FILTER (WHERE attempts >= 3) as codigos_con_intentos,
                COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) as codigos_expirados
            FROM phone_verifications
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        `;

        try {
            const result = await query(sql);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }

    // Invalidate all codes for a phone number (when user logs out)
    static async invalidarCodigos(telefono) {
        const sql = `UPDATE phone_verifications SET verified = true WHERE telefono = $1`;
        
        try {
            await query(sql, [telefono]);
        } catch (error) {
            throw new Error(`Error invalidando códigos: ${error.message}`);
        }
    }
}

module.exports = PhoneVerification;