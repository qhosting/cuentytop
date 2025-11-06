/**
 * SERVICIO DE AUTOMATIZACIÓN COMPLETA
 * Workflows automáticos y triggers del sistema
 */

const pool = require('../config/database');

class AutomationService {

  /**
   * Ejecuta un workflow automático
   */
  async executeWorkflow(triggerEvento, triggerData = {}) {
    const client = await pool.connect();
    
    try {
      // Buscar workflows activos para este trigger
      const workflowsResult = await client.query(
        `SELECT * FROM automation_workflows
         WHERE trigger_evento = $1 AND activo = TRUE
         ORDER BY prioridad DESC`,
        [triggerEvento]
      );

      if (workflowsResult.rows.length === 0) {
        return {
          success: true,
          message: 'No hay workflows configurados para este evento',
          workflowsExecuted: 0
        };
      }

      const results = [];

      for (const workflow of workflowsResult.rows) {
        const startTime = Date.now();
        
        try {
          // Verificar condiciones del trigger
          if (!this.checkTriggerConditions(workflow.trigger_condiciones, triggerData)) {
            continue;
          }

          // Ejecutar acciones del workflow
          const accionesEjecutadas = await this.executeActions(workflow.acciones, triggerData);

          const executionTime = Date.now() - startTime;

          // Registrar ejecución exitosa
          await client.query(
            `INSERT INTO automation_logs
             (workflow_id, trigger_data, acciones_ejecutadas, estado, tiempo_ejecucion)
             VALUES ($1, $2, $3, $4, $5)`,
            [workflow.id, JSON.stringify(triggerData), JSON.stringify(accionesEjecutadas), 
             'success', executionTime]
          );

          // Actualizar contador y última ejecución del workflow
          await client.query(
            `UPDATE automation_workflows SET
             veces_ejecutado = veces_ejecutado + 1,
             ultima_ejecucion = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [workflow.id]
          );

          results.push({
            workflowId: workflow.id,
            workflowNombre: workflow.nombre,
            success: true,
            accionesEjecutadas: accionesEjecutadas.length,
            executionTime
          });

        } catch (error) {
          console.error(`Error ejecutando workflow ${workflow.id}:`, error);

          const executionTime = Date.now() - startTime;

          // Registrar error
          await client.query(
            `INSERT INTO automation_logs
             (workflow_id, trigger_data, estado, error_mensaje, tiempo_ejecucion)
             VALUES ($1, $2, $3, $4, $5)`,
            [workflow.id, JSON.stringify(triggerData), 'failed', error.message, executionTime]
          );

          results.push({
            workflowId: workflow.id,
            workflowNombre: workflow.nombre,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        workflowsExecuted: results.length,
        results
      };

    } catch (error) {
      console.error('Error ejecutando workflows:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica si se cumplen las condiciones del trigger
   */
  checkTriggerConditions(condiciones, triggerData) {
    if (!condiciones || Object.keys(condiciones).length === 0) {
      return true; // Sin condiciones = siempre ejecutar
    }

    for (const [key, value] of Object.entries(condiciones)) {
      if (triggerData[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Ejecuta las acciones de un workflow
   */
  async executeActions(acciones, triggerData) {
    const accionesEjecutadas = [];

    for (const accion of acciones) {
      try {
        let resultado;

        switch (accion.tipo) {
          case 'notificacion':
            resultado = await this.executeNotificationAction(accion, triggerData);
            break;
          
          case 'actualizar_orden':
            resultado = await this.executeUpdateOrderAction(accion, triggerData);
            break;
          
          case 'asignar_credenciales':
            resultado = await this.executeAssignCredentialsAction(accion, triggerData);
            break;
          
          case 'activar_orden':
            resultado = await this.executeActivateOrderAction(accion, triggerData);
            break;
          
          case 'validar_rfc_sat':
            resultado = await this.executeValidateRFCAction(accion, triggerData);
            break;
          
          case 'aplicar_iva':
            resultado = await this.executeApplyTaxAction(accion, triggerData);
            break;
          
          default:
            resultado = { success: false, error: `Tipo de acción desconocido: ${accion.tipo}` };
        }

        accionesEjecutadas.push({
          tipo: accion.tipo,
          ...resultado
        });

      } catch (error) {
        console.error(`Error ejecutando acción ${accion.tipo}:`, error);
        accionesEjecutadas.push({
          tipo: accion.tipo,
          success: false,
          error: error.message
        });
      }
    }

    return accionesEjecutadas;
  }

  /**
   * Ejecuta acción de notificación
   */
  async executeNotificationAction(accion, triggerData) {
    const notificationService = require('./notificationService');
    
    const { canal, template, destinatario } = accion;
    const { usuarioId, ordenId } = triggerData;

    try {
      // Si hay template, usar servicio de templates
      if (template) {
        await notificationService.sendFromTemplate(
          template,
          usuarioId,
          canal,
          triggerData
        );
      } else {
        // Notificación simple
        await notificationService.sendNotification({
          usuarioId,
          tipo: accion.tipoNotificacion || 'general',
          canal,
          destinatario,
          mensaje: accion.mensaje
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecuta acción de actualizar orden
   */
  async executeUpdateOrderAction(accion, triggerData) {
    const { ordenId } = triggerData;
    const { estado } = accion;

    try {
      await pool.query(
        'UPDATE ordenes SET estado = $1 WHERE id = $2',
        [estado, ordenId]
      );

      return { success: true, ordenId, nuevoEstado: estado };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecuta acción de asignar credenciales
   */
  async executeAssignCredentialsAction(accion, triggerData) {
    const { ordenId } = triggerData;

    try {
      // Obtener items de la orden
      const itemsResult = await pool.query(
        `SELECT * FROM order_items 
         WHERE orden_id = $1 AND credenciales_asignadas = FALSE`,
        [ordenId]
      );

      const assigned = [];

      for (const item of itemsResult.rows) {
        // Buscar credencial disponible
        const credResult = await pool.query(
          `SELECT * FROM inventario_cuentas
           WHERE servicio_id = $1 AND plan_id = $2 AND estado = 'available'
           LIMIT 1`,
          [item.servicio_id, item.plan_id]
        );

        if (credResult.rows.length > 0) {
          const credencial = credResult.rows[0];

          // Asignar credencial al item
          await pool.query(
            `UPDATE inventario_cuentas SET
             estado = 'assigned',
             assigned_order_item_id = $1
             WHERE id = $2`,
            [item.id, credencial.id]
          );

          // Marcar item como asignado
          await pool.query(
            'UPDATE order_items SET credenciales_asignadas = TRUE WHERE id = $1',
            [item.id]
          );

          assigned.push({
            itemId: item.id,
            credencialId: credencial.id
          });
        }
      }

      return {
        success: true,
        credencialesAsignadas: assigned.length
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecuta acción de activar orden
   */
  async executeActivateOrderAction(accion, triggerData) {
    const { ordenId } = triggerData;
    const { estado } = accion;

    try {
      await pool.query(
        `UPDATE ordenes SET
         estado = $1,
         paid_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [estado, ordenId]
      );

      return { success: true, ordenId, estado };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecuta acción de validar RFC con SAT
   */
  async executeValidateRFCAction(accion, triggerData) {
    const { usuarioId, rfc } = triggerData;

    try {
      const taxService = require('./taxService');
      
      // Validar formato de RFC
      const isValid = taxService.validateRFC(rfc);

      if (isValid) {
        // Marcar como validado en la BD
        await pool.query(
          `UPDATE tax_data SET
           validado = TRUE,
           fecha_validacion = CURRENT_TIMESTAMP
           WHERE usuario_id = $1 AND rfc = $2`,
          [usuarioId, rfc]
        );
      }

      return { success: isValid, rfc, validado: isValid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecuta acción de aplicar IVA
   */
  async executeApplyTaxAction(accion, triggerData) {
    const { usuarioId } = triggerData;
    const { tasa } = accion;

    try {
      const taxService = require('./taxService');
      
      // Actualizar carrito con impuestos
      await taxService.updateCartTax(usuarioId);

      return { success: true, tasa };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Crea un nuevo workflow
   */
  async createWorkflow(workflowData) {
    try {
      const {
        nombre,
        descripcion,
        triggerEvento,
        triggerCondiciones,
        acciones,
        prioridad,
        ejecutarAsincrono,
        delaySegundos
      } = workflowData;

      const result = await pool.query(
        `INSERT INTO automation_workflows
         (nombre, descripcion, trigger_evento, trigger_condiciones, acciones, 
          prioridad, ejecutar_asincrono, delay_segundos, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         RETURNING *`,
        [nombre, descripcion, triggerEvento, JSON.stringify(triggerCondiciones),
         JSON.stringify(acciones), prioridad || 1, ejecutarAsincrono !== false,
         delaySegundos || 0]
      );

      return {
        success: true,
        workflow: result.rows[0]
      };
    } catch (error) {
      console.error('Error creando workflow:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los workflows
   */
  async getAllWorkflows() {
    try {
      const result = await pool.query(
        'SELECT * FROM automation_workflows ORDER BY prioridad DESC, created_at DESC'
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo workflows:', error);
      throw error;
    }
  }

  /**
   * Activa/desactiva un workflow
   */
  async toggleWorkflow(workflowId, activo) {
    try {
      const result = await pool.query(
        'UPDATE automation_workflows SET activo = $1 WHERE id = $2 RETURNING *',
        [activo, workflowId]
      );

      return {
        success: true,
        workflow: result.rows[0]
      };
    } catch (error) {
      console.error('Error activando/desactivando workflow:', error);
      throw error;
    }
  }

  /**
   * Obtiene logs de ejecución de un workflow
   */
  async getWorkflowLogs(workflowId, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT * FROM automation_logs
         WHERE workflow_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [workflowId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo logs de workflow:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de automatización
   */
  async getAutomationStatistics() {
    const client = await pool.connect();
    
    try {
      // Estadísticas de workflows
      const workflowStats = await client.query(
        `SELECT 
          COUNT(*) as total_workflows,
          COUNT(CASE WHEN activo = TRUE THEN 1 END) as workflows_activos,
          SUM(veces_ejecutado) as total_ejecuciones
         FROM automation_workflows`
      );

      // Estadísticas de ejecuciones
      const executionStats = await client.query(
        `SELECT 
          estado,
          COUNT(*) as cantidad,
          AVG(tiempo_ejecucion) as tiempo_promedio
         FROM automation_logs
         GROUP BY estado`
      );

      // Workflows más ejecutados
      const topWorkflows = await client.query(
        `SELECT 
          aw.nombre,
          aw.trigger_evento,
          aw.veces_ejecutado,
          aw.ultima_ejecucion
         FROM automation_workflows aw
         WHERE aw.activo = TRUE
         ORDER BY aw.veces_ejecutado DESC
         LIMIT 10`
      );

      return {
        workflows: workflowStats.rows[0],
        ejecuciones: executionStats.rows,
        topWorkflows: topWorkflows.rows
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas de automatización:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = new AutomationService();
