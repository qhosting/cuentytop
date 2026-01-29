# Configuración de Backups Automáticos a Google Drive

Este documento explica cómo configurar el sistema de backups automáticos a Google Drive.

## 1. Crear Proyecto y Service Account en Google Cloud

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/).
2.  Crea un nuevo proyecto o selecciona uno existente.
3.  Ve a **APIs & Services > Library**.
4.  Busca **Google Drive API** y habilítala.
5.  Ve a **APIs & Services > Credentials**.
6.  Haz clic en **Create Credentials > Service Account**.
7.  Dale un nombre (ej. `backup-service`) y crea la cuenta.
8.  Una vez creada, haz clic en la cuenta de servicio (email tipo `backup-service@tu-proyecto.iam.gserviceaccount.com`).
9.  Ve a la pestaña **Keys**.
10. Haz clic en **Add Key > Create new key**.
11. Selecciona **JSON** y descarga el archivo.
12. Renombra este archivo como `credentials.json` y colócalo en la raíz de `backend/`.
    *   **Alternativa:** Copia el contenido del JSON y configúralo en la variable de entorno `GOOGLE_SERVICE_ACCOUNT_JSON` (útil para Docker/Producción).

## 2. Preparar Carpeta en Google Drive

1.  Ve a tu Google Drive personal o de empresa.
2.  Crea una nueva carpeta donde se guardarán los backups (ej. `Backups-Cuenty`).
3.  Abre la carpeta y copia el **ID de la carpeta** desde la URL.
    *   URL ejemplo: `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
    *   ID: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
4.  **Importante:** Debes dar permisos de escritura a la Service Account.
    *   Haz clic derecho en la carpeta > **Share (Compartir)**.
    *   Agrega el email de la Service Account (`backup-service@tu-proyecto.iam.gserviceaccount.com`).
    *   Asígnale el rol de **Editor**.

## 3. Configuración del Entorno (.env)

Asegúrate de tener las siguientes variables en tu archivo `.env` del backend:

```env
# ID de la carpeta de Drive (obtenido en paso 2)
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id_aqui

# Contenido del JSON de credenciales (Opcional si usas archivo credentials.json)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Habilitar backups en desarrollo (por defecto solo corre en producción)
ENABLE_BACKUPS=true
```

## 4. Verificación

El sistema está configurado para ejecutarse automáticamente a las **3:00 AM**.

Para probar manualmente, puedes ejecutar el script de backup directo (si se implementó script npm) o esperar al cron.

Los archivos generados tendrán el formato: `backup-YYYY-MM-DD_HH-mm-ss.zip`.
