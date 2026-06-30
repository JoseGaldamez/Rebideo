# Guía de Configuración en GCP (Producción)

Este documento detalla los pasos y comandos de `gcloud` necesarios para aprovisionar la infraestructura en Google Cloud Platform (GCP) para el entorno de producción de **Rebideo** (Proyecto: `rebideo`, Proyecto N°: `824884253703`).

---

## 1. Valores de Referencia del Proyecto

- **ID de Proyecto**: `rebideo`
- **Número de Proyecto**: `824884253703`
- **Región**: Reemplaza `[REGION_GCP]` por tu región (ej. `us-central1`).
- **Cuenta de Servicio del Backend**: `824884253703-compute@developer.gserviceaccount.com` (Default Compute Service Account)

---

## 2. Configuración de Buckets de Google Cloud Storage (GCS)

### 2.1 Crear los Buckets si no existen ya

Crea los buckets para almacenar los videos originales y los videos procesados en formato HLS.

```bash
# Bucket para videos crudos
gcloud storage buckets create gs://rebideo-raw-videos-rebideo \
    --project=rebideo \
    --location=[REGION_GCP] \
    --uniform-bucket-level-access

# Bucket para videos HLS procesados
gcloud storage buckets create gs://rebideo-processed-videos-rebideo \
    --project=rebideo \
    --location=[REGION_GCP] \
    --uniform-bucket-level-access
```

### 2.2 Configurar Política de Ciclo de Vida en el Bucket Procesado

Para evitar costos excesivos, los videos procesados se eliminarán automáticamente después de 30 días.

1. Crea un archivo local llamado `lifecycle.json` con el siguiente contenido:

```json
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": {
        "age": 30
      }
    }
  ]
}
```

2. Aplica la regla de ciclo de vida al bucket de salida (procesados):

```bash
gcloud storage buckets update gs://rebideo-processed-videos-rebideo --lifecycle-file=lifecycle.json
```

---

## 3. Configuración del Canal de Eventos (Storage -> Pub/Sub)

### 3.1 Crear el Tema de Pub/Sub

```bash
gcloud pubsub topics create raw-video-uploads-pub-sub-topic --project=rebideo
```

### 3.2 Autorizar a Cloud Storage a publicar en Pub/Sub

Debemos dar permisos a la cuenta de servicio interna del sistema de GCS para publicar eventos en nuestro tema de Pub/Sub.

Otorga el rol de Publicador de Pub/Sub (`roles/pubsub.publisher`) a la cuenta de GCS correspondiente a tu número de proyecto:

```bash
gcloud pubsub topics add-iam-policy-binding raw-video-uploads-pub-sub-topic \
    --project=rebideo \
    --member="serviceAccount:service-824884253703@gs-project-accounts.iam.gserviceaccount.com" \
    --role="roles/pubsub.publisher"
```

### 3.3 Crear Notificación de Storage a Pub/Sub

Registra una notificación que dispare un evento `OBJECT_FINALIZE` cuando un archivo sea subido con éxito al bucket de entrada:

```bash
gcloud storage buckets notifications create gs://rebideo-raw-videos-rebideo \
    --project=rebideo \
    --event-types=OBJECT_FINALIZE \
    --topic=raw-video-uploads-pub-sub-topic
```

---

## 4. Despliegue de `transcoder-service` vía GCP Console

Para desplegar el servicio de transcripción de videos utilizando integración continua desde GitHub:

### 4.1 Pasos en la Consola de GCP (Cloud Run)

1. Ve a la consola de **Cloud Run** y haz clic en **Crear servicio** (Create Service).
2. En la opción de origen del código, selecciona **Implementar continuamente desde un repositorio** (Continuously deploy from a repository) y haz clic en **Configurar con Cloud Build** (Set up Cloud Build).
3. Selecciona tu proveedor de Git (GitHub), autorízalo si es necesario, y selecciona tu repositorio de **Rebideo**.
4. Haz clic en **Siguiente** (Next) y configura los detalles de compilación:
   - **Rama (Branch)**: `main` (o la rama que uses para producción).
   - **Tipo de compilación (Build Type)**: Selecciona **Dockerfile**.
   - **Directorio de origen (Source directory)**: Especifica `/transcoder-service` (ya que es allí donde se encuentra el Dockerfile del transcoder).
   - **Ruta del Dockerfile (Dockerfile path)**: Déjalo como `Dockerfile` (se buscará relativo al directorio de origen).
5. Haz clic en **Guardar** (Save).

### 4.2 Parámetros del Servicio en Cloud Run

Configura los siguientes campos en la sección de configuración del servicio:

- **Nombre del servicio**: `transcoder-service`
- **Región**: Selecciona tu región geográfica (ej. `us-central1`).
- **Autenticación**: Selecciona **Requerir autenticación** (Require authentication). _Esto asegura que solo Pub/Sub pueda llamar al transcoder mediante tokens OIDC privados_.

### 4.3 Configuración de CPU, Memoria y Concurrencia (Sección Contenedor)

Despliega el menú de configuración de recursos de la instancia:

- **Capacidad de CPU**: Selecciona **4 vCPUs** (para procesamiento rápido de FFmpeg).
- **Memoria**: Selecciona **4 GiB**.
- **Concurrencia**: Limita el número de peticiones simultáneas a **1** (o máximo 2) concurrentes por instancia. _Esto aísla y protege los recursos de CPU/Memoria de cada contenedor para que FFmpeg corra sin saturar la máquina_.
- **Cuenta de servicio (Service Account)**: Selecciona `824884253703-compute@developer.gserviceaccount.com` (Default Compute Service Account).

### 4.4 Variables de Entorno

En la pestaña de variables de entorno, añade las siguientes claves:

| Variable               | Valor                                                      |
| :--------------------- | :--------------------------------------------------------- |
| `APP_ENV`              | `production`                                               |
| `PROJECT_ID`           | `rebideo`                                                  |
| `GCS_RAW_BUCKET`       | `rebideo-raw-videos-rebideo`                               |
| `GCS_PROCESSED_BUCKET` | `rebideo-processed-videos-rebideo`                         |
| `API_SERVICE_URL`      | _[URL de tu api-service ya desplegado]_                    |
| `INTERNAL_API_TOKEN`   | _[El token que configuraste en tu api-service desplegado]_ |

Haz clic en **Crear** (Create) para iniciar la compilación inicial y el despliegue automático.

_(Guarda la URL del servicio que retorna al finalizar, ej: `https://transcoder-service-abcde-uc.a.run.app`)_.

---

## 5. Asegurar e Integrar Pub/Sub Push Webhook en Producción

En producción, Pub/Sub empuja los eventos vía HTTPS POST al transcoder de forma privada y autenticada.

### 5.1 Cuenta de Servicio para Invocación de Pub/Sub

Crea una cuenta de servicio dedicada para que Pub/Sub pueda invocar de forma segura al Transcoder Service (el cual se desplegó con la bandera `--no-allow-unauthenticated`).

```bash
# Crear cuenta de servicio de Pub/Sub para invocar Cloud Run
gcloud iam service-accounts create pubsub-invoker-sa \
    --display-name="PubSub Invoker Service Account" \
    --project=rebideo

# Dar permiso de invocar el servicio de Cloud Run del transcoder
gcloud run services add-iam-policy-binding transcoder-service \
    --region [REGION_GCP] \
    --member="serviceAccount:pubsub-invoker-sa@rebideo.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --project=rebideo
```

### 5.2 Crear Suscripción Push

Crea la suscripción de Pub/Sub configurada para enviar peticiones POST seguras a la ruta `/pubsub` del Transcoder, inyectando un token OIDC.

```bash
gcloud pubsub subscriptions create transcoder-push-sub \
    --topic=raw-video-uploads-pub-sub-topic \
    --push-endpoint="[URL_DEL_TRANSCODER_SERVICE_OBTENIDO_ARRIBA]/pubsub" \
    --push-auth-service-account="pubsub-invoker-sa@rebideo.iam.gserviceaccount.com" \
    --ack-deadline=60 \
    --project=rebideo
```

¡Listo! Con estos pasos, cuando un usuario suba un video al bucket crudo, GCS notificará a Pub/Sub, y Pub/Sub enviará un webhook cifrado con token OIDC a Cloud Run para iniciar el procesamiento automático con FFmpeg.
