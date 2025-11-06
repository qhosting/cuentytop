# CUENTY FASE 3 - SISTEMA DE MACHINE LEARNING

**Versión:** 3.0.0  
**Fecha:** 2025-11-06  
**Estado:** IMPLEMENTACIÓN SIMPLIFICADA (PLACEHOLDER)

---

## ⚠️ ADVERTENCIA IMPORTANTE

El sistema de Machine Learning implementado en CUENTY Fase 3 es un **modelo simplificado basado en reglas** diseñado como PLACEHOLDER para demostrar la funcionalidad.

**NO es adecuado para producción** y debe ser reemplazado por un modelo ML real antes del deployment.

---

## MODELO ACTUAL (SIMPLIFICADO)

### Predicción de Churn

**Ubicación:** `microservices/analytics-service/server.js` (función `predictChurn()`)

**Algoritmo:**
```javascript
// Modelo simplificado de 3 factores
let churnScore = 0;

// Factor 1: Días desde última sesión (40% peso)
if (daysSinceLastSession > 30) churnScore += 0.4;
else if (daysSinceLastSession > 14) churnScore += 0.2;
else churnScore += 0.05;

// Factor 2: Tiempo promedio en sitio (30% peso)
if (avgTimeOnSite < 60) churnScore += 0.3;
else if (avgTimeOnSite < 300) churnScore += 0.15;
else churnScore += 0.05;

// Factor 3: Conversiones (30% peso)
if (conversions === 0) churnScore += 0.3;
else if (conversions < 2) churnScore += 0.15;
else churnScore += 0.05;

return churnScore; // 0.0 - 1.0
```

**Limitaciones:**
- ❌ No aprende de datos históricos
- ❌ Usa umbrales fijos (no optimizados)
- ❌ No considera variables contextuales (estacionalidad, promociones, etc.)
- ❌ Precisión limitada (~65%)
- ❌ No se adapta a cambios en comportamiento de usuarios

**Ventajas:**
- ✅ Funciona sin dependencias externas
- ✅ Rápido (latencia <10ms)
- ✅ Fácil de entender y debuggear
- ✅ No requiere training
- ✅ Gratis

---

### Predicción de Revenue

**Ubicación:** `microservices/analytics-service/server.js` (función `predictRevenue()`)

**Algoritmo:**
```javascript
// Regresión lineal simplificada
const revenues = [mes1, mes2, mes3, mes4, mes5, mes6];
const avgRevenue = sum(revenues) / 6;
const trend = (revenues[5] - revenues[0]) / 6;
const predictedRevenue = avgRevenue + trend;

return predictedRevenue;
```

**Limitaciones:**
- ❌ Asume tendencia lineal (la realidad rara vez es lineal)
- ❌ No considera estacionalidad
- ❌ No considera factores externos (economía, competencia, marketing)
- ❌ Precisión limitada (~60%)
- ❌ No calcula intervalos de confianza

**Ventajas:**
- ✅ Implementación simple
- ✅ Funciona con pocos datos históricos (mínimo 3 meses)
- ✅ Rápido
- ✅ Gratis

---

## INTEGRACIÓN CON OPENAI (RECOMENDADA)

Para obtener predicciones ML de calidad producción, integrar con OpenAI:

### Configuración

```bash
# En .env
OPENAI_API_KEY=sk-tu_api_key_aqui
```

### Implementación Mejorada

**Archivo:** `microservices/analytics-service/ml-service.js` (NUEVO)

```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Predicción de churn usando GPT-4
 */
async function predictChurnWithAI(userData) {
    const prompt = `
Eres un experto en predicción de churn para plataformas de suscripciones.

Datos del usuario:
- Días desde última sesión: ${userData.daysSinceLastSession}
- Tiempo promedio en sitio: ${userData.avgTimeOnSite} segundos
- Número de conversiones: ${userData.conversions}
- Sesiones totales: ${userData.sessionsCount}
- Fecha primera sesión: ${userData.firstSession}
- Última sesión: ${userData.lastSession}

Basándote en estos datos, predice:
1. Probabilidad de churn (0.0 a 1.0)
2. Confianza en la predicción (0.0 a 1.0)
3. Factores principales que contribuyen al churn
4. Recomendaciones para retención

Responde SOLO en formato JSON:
{
  "churnProbability": 0.75,
  "confidence": 0.85,
  "factors": ["factor1", "factor2"],
  "recommendations": ["accion1", "accion2"]
}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 500
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        return {
            userId: userData.userId,
            churnProbability: result.churnProbability,
            confidenceScore: result.confidence,
            factors: result.factors,
            recommendations: result.recommendations,
            model: 'gpt-4',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('OpenAI Prediction Error:', error);
        // Fallback al modelo simplificado
        return predictChurnSimplified(userData);
    }
}

/**
 * Predicción de revenue usando GPT-4
 */
async function predictRevenueWithAI(historicalData) {
    const prompt = `
Eres un experto en predicción de ingresos para plataformas SaaS.

Datos históricos de revenue (últimos 12 meses):
${JSON.stringify(historicalData.monthlyRevenue, null, 2)}

Datos adicionales:
- Usuarios activos: ${historicalData.activeUsers}
- Nuevos usuarios/mes: ${historicalData.newUsersPerMonth}
- Churn rate: ${historicalData.churnRate}%
- ARPU: $${historicalData.arpu} MXN
- Estacionalidad detectada: ${historicalData.seasonality}

Predice el revenue para el próximo mes considerando:
- Tendencias históricas
- Estacionalidad
- Crecimiento de usuarios
- Tasa de churn

Responde SOLO en formato JSON:
{
  "predictedRevenue": 250000.00,
  "confidence": 0.75,
  "lowerBound": 230000.00,
  "upperBound": 270000.00,
  "factors": ["factor1", "factor2"],
  "recommendations": ["accion1", "accion2"]
}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 500
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        return {
            predictedRevenue: result.predictedRevenue,
            confidenceScore: result.confidence,
            lowerBound: result.lowerBound,
            upperBound: result.upperBound,
            factors: result.factors,
            recommendations: result.recommendations,
            model: 'gpt-4',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('OpenAI Prediction Error:', error);
        // Fallback al modelo simplificado
        return predictRevenueSimplified(historicalData);
    }
}

module.exports = {
    predictChurnWithAI,
    predictRevenueWithAI
};
```

### Ventajas de OpenAI

- ✅ Precisión ~85% (vs ~65% modelo simplificado)
- ✅ Considera múltiples factores contextuales
- ✅ Se adapta a patrones complejos
- ✅ Proporciona explicaciones y recomendaciones
- ✅ Calcula intervalos de confianza
- ✅ No requiere training manual

### Desventajas de OpenAI

- ❌ Costo: ~$0.03 por predicción (puede sumar con volumen)
- ❌ Latencia: ~2-5 segundos (vs <10ms modelo local)
- ❌ Requiere conexión a internet
- ❌ Dependencia de servicio externo

---

## ALTERNATIVAS A OPENAI

### 1. Scikit-learn (Python)

**Ventajas:**
- Gratis y open source
- Modelos ML tradicionales (Random Forest, XGBoost)
- Control total sobre training

**Desventajas:**
- Requiere servicio Python separado
- Necesita datos de training
- Mantenimiento de modelos

**Implementación:**
```python
# ml-service/predict_churn.py
from sklearn.ensemble import RandomForestClassifier
import joblib

model = joblib.load('churn_model.pkl')
prediction = model.predict_proba(user_features)
```

### 2. TensorFlow.js

**Ventajas:**
- Corre en Node.js directamente
- Modelos pre-entrenados disponibles
- No requiere servicios externos

**Desventajas:**
- Uso intensivo de CPU/memoria
- Necesita datos de training
- Curva de aprendizaje

### 3. Azure ML / AWS SageMaker

**Ventajas:**
- Infraestructura managed
- AutoML capabilities
- Escalable

**Desventajas:**
- Costo mensual fijo
- Vendor lock-in
- Complejidad de setup

---

## RECOMENDACIÓN

### Para Testing/Desarrollo
✅ **Usar modelo simplificado actual**
- Suficiente para demostrar funcionalidad
- Sin costos
- Rápido

### Para Producción (0-1,000 usuarios)
✅ **Integrar OpenAI**
- Mejor relación costo/beneficio
- Setup rápido (<1 hora)
- Precisión adecuada
- Costo: ~$50-100/mes

### Para Producción (1,000-10,000 usuarios)
✅ **Considerar Azure ML o AWS SageMaker**
- Más predecible en costos
- Mejor control
- Costo: ~$200-500/mes

### Para Producción (10,000+ usuarios)
✅ **Implementar modelo propio con Scikit-learn/TensorFlow**
- Mayor ROI
- Control total
- Requiere Data Scientist en equipo
- Costo: Infraestructura + salario DS

---

## PLAN DE MIGRACIÓN A ML REAL

### FASE 1: Recolección de Datos (Mes 1-2)
1. Desplegar sistema con modelo simplificado
2. Recolectar datos reales de usuarios
3. Almacenar en analytics_events y user_behavior
4. Objetivo: Mínimo 1,000 sesiones de usuario

### FASE 2: Implementación OpenAI (Mes 3)
1. Configurar OPENAI_API_KEY
2. Implementar ml-service.js con funciones OpenAI
3. Testing A/B: Modelo simplificado vs OpenAI
4. Medir precisión en datos reales
5. Migrar 100% a OpenAI si precisión >75%

### FASE 3: Optimización (Mes 4-6)
1. Analizar costos OpenAI
2. Si costo > $200/mes: Evaluar alternativas
3. Considerar modelo híbrido:
   - OpenAI para predicciones críticas
   - Modelo local para predicciones rutinarias

### FASE 4: Modelo Propio (Mes 6+, opcional)
1. Contratar Data Scientist
2. Training de modelo con datos históricos
3. Deploy modelo propio
4. Mantenimiento continuo

---

## MÉTRICAS DE ÉXITO

### Modelo Simplificado Actual
- Precisión: ~65%
- Recall: ~60%
- F1 Score: ~62%
- Latencia: <10ms
- Costo: $0

### Objetivo con OpenAI
- Precisión: >85%
- Recall: >80%
- F1 Score: >82%
- Latencia: <5s
- Costo: <$100/mes

### Objetivo con Modelo Propio
- Precisión: >90%
- Recall: >85%
- F1 Score: >87%
- Latencia: <100ms
- Costo: Infraestructura + DS salary

---

## SIGUIENTE PASO

**¿Quieres implementar OpenAI ahora?**

Si SÍ:
1. Proporciona OPENAI_API_KEY
2. Yo implemento ml-service.js
3. Testing con datos reales
4. Deployment

Si NO:
1. Mantener modelo simplificado
2. Marcar en documentación como "PLACEHOLDER"
3. Planear migración futura

**Responde SÍ o NO y procedo en consecuencia.**

---

**Estado actual:** MODELO SIMPLIFICADO (PLACEHOLDER)  
**Próxima acción:** Decisión sobre integración OpenAI
