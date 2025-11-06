// ============================================================================
// CUENTY - Servicio de Compliance LFPDPPP
// Ley Federal de Proteccion de Datos Personales en Posesion de Particulares
// ============================================================================

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Servicio de Compliance LFPDPPP
 */
class ComplianceService {
    /**
     * Registrar consentimiento del usuario
     */
    async registerConsent(userId, consentType, consentText, metadata = {}) {
        try {
            await pool.query(
                `INSERT INTO consent_logs 
                 (user_id, consent_type, consent_version, consent_granted, consent_text,
                  consent_source, ip_address, user_agent, granted_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                [
                    userId,
                    consentType,
                    metadata.version || '1.0',
                    true,
                    consentText,
                    metadata.source || 'web',
                    metadata.ipAddress,
                    metadata.userAgent
                ]
            );
            
            return { success: true, message: 'Consentimiento registrado' };
        } catch (error) {
            console.error('Register Consent Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Revocar consentimiento del usuario
     */
    async revokeConsent(userId, consentType) {
        try {
            await pool.query(
                `UPDATE consent_logs 
                 SET consent_granted = false, revoked_at = NOW()
                 WHERE user_id = $1 AND consent_type = $2 AND consent_granted = true`,
                [userId, consentType]
            );
            
            return { success: true, message: 'Consentimiento revocado' };
        } catch (error) {
            console.error('Revoke Consent Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Solicitar acceso a datos personales (Art. 34 LFPDPPP)
     */
    async requestDataAccess(userId, requestMetadata = {}) {
        try {
            // Create data request
            const result = await pool.query(
                `INSERT INTO data_requests 
                 (user_id, request_type, request_status, requested_at)
                 VALUES ($1, 'access', 'pending', NOW())
                 RETURNING id`,
                [userId]
            );
            
            const requestId = result.rows[0].id;
            
            // Collect user data
            const userData = await this.collectUserData(userId);
            
            // Update request with data
            await pool.query(
                `UPDATE data_requests 
                 SET data_exported = $1, processed_at = NOW(), request_status = 'completed'
                 WHERE id = $2`,
                [JSON.stringify(userData), requestId]
            );
            
            return {
                success: true,
                requestId,
                data: userData,
                message: 'Solicitud procesada exitosamente'
            };
        } catch (error) {
            console.error('Data Access Request Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Solicitar rectificacion de datos (Art. 34 LFPDPPP)
     */
    async requestDataRectification(userId, fieldsToUpdate, requestMetadata = {}) {
        try {
            const result = await pool.query(
                `INSERT INTO data_requests 
                 (user_id, request_type, request_status, notes)
                 VALUES ($1, 'rectification', 'pending', $2)
                 RETURNING id`,
                [userId, JSON.stringify(fieldsToUpdate)]
            );
            
            return {
                success: true,
                requestId: result.rows[0].id,
                message: 'Solicitud de rectificación recibida'
            };
        } catch (error) {
            console.error('Rectification Request Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Solicitar cancelacion de datos (Derecho al olvido)
     */
    async requestDataDeletion(userId, reason = '') {
        try {
            const result = await pool.query(
                `INSERT INTO data_requests 
                 (user_id, request_type, request_status, notes, requested_at)
                 VALUES ($1, 'deletion', 'pending', $2, NOW())
                 RETURNING id`,
                [userId, reason]
            );
            
            const requestId = result.rows[0].id;
            
            // Schedule deletion for 30 days (grace period)
            const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            await pool.query(
                `UPDATE data_requests 
                 SET expiry_date = $1
                 WHERE id = $2`,
                [deletionDate, requestId]
            );
            
            return {
                success: true,
                requestId,
                deletionDate,
                message: 'Solicitud de eliminación recibida. Se procesará en 30 días.'
            };
        } catch (error) {
            console.error('Deletion Request Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Ejecutar eliminacion de datos (Derecho al olvido)
     */
    async executeDeletion(requestId) {
        try {
            // Get request
            const request = await pool.query(
                'SELECT user_id, request_type FROM data_requests WHERE id = $1',
                [requestId]
            );
            
            if (request.rows.length === 0) {
                return { success: false, error: 'Solicitud no encontrada' };
            }
            
            const userId = request.rows[0].user_id;
            
            // Start transaction
            await pool.query('BEGIN');
            
            // Anonymize user data
            await pool.query(
                `UPDATE users 
                 SET email = CONCAT('deleted_', id, '@deleted.cuenty.com'),
                     name = 'Usuario Eliminado',
                     phone = NULL,
                     password = '',
                     deleted_at = NOW()
                 WHERE id = $1`,
                [userId]
            );
            
            // Delete sensitive data
            await pool.query('DELETE FROM consent_logs WHERE user_id = $1', [userId]);
            await pool.query('DELETE FROM two_factor_auth WHERE user_id = $1', [userId]);
            
            // Keep audit trail (required by law)
            await pool.query(
                `INSERT INTO audit_trails 
                 (user_id, action_type, action_name, resource_type, severity)
                 VALUES ($1, 'DELETE', 'user_data_deleted', 'users', 'high')`,
                [userId]
            );
            
            // Update request status
            await pool.query(
                `UPDATE data_requests 
                 SET request_status = 'completed', processed_at = NOW(), completed_at = NOW()
                 WHERE id = $1`,
                [requestId]
            );
            
            await pool.query('COMMIT');
            
            return {
                success: true,
                message: 'Datos eliminados exitosamente conforme a LFPDPPP'
            };
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Execute Deletion Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Solicitar oposicion al tratamiento de datos
     */
    async requestDataOpposition(userId, dataTypes = [], reason = '') {
        try {
            await pool.query(
                `INSERT INTO data_requests 
                 (user_id, request_type, request_status, notes)
                 VALUES ($1, 'opposition', 'pending', $2)`,
                [userId, JSON.stringify({ dataTypes, reason })]
            );
            
            // Update consent for specified data types
            for (const dataType of dataTypes) {
                await this.revokeConsent(userId, dataType);
            }
            
            return {
                success: true,
                message: 'Oposición registrada exitosamente'
            };
        } catch (error) {
            console.error('Opposition Request Error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Recopilar todos los datos del usuario
     */
    async collectUserData(userId) {
        try {
            // User profile
            const user = await pool.query(
                'SELECT id, email, name, phone, created_at FROM users WHERE id = $1',
                [userId]
            );
            
            // Orders
            const orders = await pool.query(
                'SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1',
                [userId]
            );
            
            // Subscriptions
            const subscriptions = await pool.query(
                'SELECT id, service_id, status, created_at FROM subscriptions WHERE user_id = $1',
                [userId]
            );
            
            // Consents
            const consents = await pool.query(
                'SELECT consent_type, consent_granted, granted_at FROM consent_logs WHERE user_id = $1',
                [userId]
            );
            
            // Behavior data
            const behavior = await pool.query(
                'SELECT session_id, entry_page, pages_visited, time_on_site FROM user_behavior WHERE user_id = $1 LIMIT 100',
                [userId]
            );
            
            return {
                user: user.rows[0],
                orders: orders.rows,
                subscriptions: subscriptions.rows,
                consents: consents.rows,
                behavior: behavior.rows
            };
        } catch (error) {
            console.error('Collect User Data Error:', error);
            return null;
        }
    }
    
    /**
     * Generar aviso de privacidad
     */
    async getPrivacyNotice(version = 'latest') {
        try {
            let query;
            
            if (version === 'latest') {
                query = 'SELECT * FROM privacy_policies WHERE is_active = true ORDER BY effective_date DESC LIMIT 1';
            } else {
                query = 'SELECT * FROM privacy_policies WHERE version = $1';
            }
            
            const result = await pool.query(
                query,
                version === 'latest' ? [] : [version]
            );
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return result.rows[0];
        } catch (error) {
            console.error('Get Privacy Notice Error:', error);
            return null;
        }
    }
    
    /**
     * Generar reporte INAI (Instituto Nacional de Transparencia)
     */
    async generateINAIReport(startDate, endDate) {
        try {
            const report = {
                period: { startDate, endDate },
                generatedAt: new Date().toISOString(),
                sections: {}
            };
            
            // Data requests summary
            const requests = await pool.query(
                `SELECT 
                    request_type,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE request_status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE request_status = 'pending') as pending
                 FROM data_requests
                 WHERE requested_at >= $1 AND requested_at <= $2
                 GROUP BY request_type`,
                [startDate, endDate]
            );
            
            report.sections.dataRequests = requests.rows;
            
            // Consents summary
            const consents = await pool.query(
                `SELECT 
                    consent_type,
                    COUNT(*) as total_granted,
                    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as total_revoked
                 FROM consent_logs
                 WHERE granted_at >= $1 AND granted_at <= $2
                 GROUP BY consent_type`,
                [startDate, endDate]
            );
            
            report.sections.consents = consents.rows;
            
            // Security incidents (from audit trails)
            const incidents = await pool.query(
                `SELECT COUNT(*) as total_incidents
                 FROM audit_trails
                 WHERE severity = 'high' 
                   AND created_at >= $1 AND created_at <= $2`,
                [startDate, endDate]
            );
            
            report.sections.securityIncidents = incidents.rows[0];
            
            return report;
        } catch (error) {
            console.error('Generate INAI Report Error:', error);
            return null;
        }
    }
    
    /**
     * Verificar cumplimiento LFPDPPP
     */
    async checkCompliance() {
        const checks = {
            compliant: true,
            issues: [],
            recommendations: []
        };
        
        try {
            // Check 1: Privacy policy exists and is active
            const privacyPolicy = await this.getPrivacyNotice();
            if (!privacyPolicy) {
                checks.compliant = false;
                checks.issues.push('No existe aviso de privacidad activo');
            }
            
            // Check 2: Pending data requests older than 20 days
            const pendingRequests = await pool.query(
                `SELECT COUNT(*) as count
                 FROM data_requests
                 WHERE request_status = 'pending'
                   AND requested_at < NOW() - INTERVAL '20 days'`
            );
            
            if (parseInt(pendingRequests.rows[0].count) > 0) {
                checks.compliant = false;
                checks.issues.push(`${pendingRequests.rows[0].count} solicitudes pendientes >20 días (Art. 32 LFPDPPP)`);
            }
            
            // Check 3: Users without consent records
            const usersWithoutConsent = await pool.query(
                `SELECT COUNT(*) as count
                 FROM users u
                 LEFT JOIN consent_logs cl ON u.id = cl.user_id
                 WHERE cl.id IS NULL 
                   AND u.created_at < NOW() - INTERVAL '7 days'`
            );
            
            if (parseInt(usersWithoutConsent.rows[0].count) > 0) {
                checks.recommendations.push(`${usersWithoutConsent.rows[0].count} usuarios sin registro de consentimiento`);
            }
            
            return checks;
        } catch (error) {
            console.error('Check Compliance Error:', error);
            return {
                compliant: false,
                issues: ['Error al verificar cumplimiento'],
                error: error.message
            };
        }
    }
}

module.exports = new ComplianceService();
