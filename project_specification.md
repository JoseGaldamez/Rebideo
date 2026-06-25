# System Specification: Event-Driven Video Streaming Platform

This document serves as the structural and architectural specification for the portfolio video streaming platform. The system leverages an event-driven, microservices-based architecture built with **Go**, **Nuxt.js (Vue 3)**, and **Google Cloud Platform (GCP)** to achieve efficient, cost-optimized, and highly scalable adaptive bitrate video streaming.

---

## 1. Executive Summary & Architecture Overview

The system is designed around modern cloud-native principles to bypass traditional monolithic bottlenecks associated with heavy multimedia processing. Instead of uploading and transcoding files through a central API, the platform decouples components using an asynchronous, event-driven pattern.

### Core Highlights:
* **Zero Compute Ingestion:** Large media files completely bypass the application servers during ingestion.
* **Adaptive Bitrate Streaming (ABR):** Raw video inputs are transcoded into standardized HLS format to guarantee smooth, device-optimized streaming.
* **Automated Lifecycle Infrastructure:** Cloud-native lifecycle rules prune media assets automatically after 30 days, keeping maintenance overhead at zero.
* **Scale-to-Zero Compute:** Every production service runs on serverless container infrastructure that incurs costs only during active execution.

```
+----------+   (1) Get Signed URL   +-------------+
|  Nuxt.js | <====================> |   Go API    |
| Frontend |                        | (Cloud Run) |
+----+-----+                        +-------------+
     |
     | (2) Direct Upload (Max 100MB)
     v
+----+---------------------+
| GCS Bucket: `raw-videos` |
+----+---------------------+
     |
     | (3) Event: OBJECT_FINALIZE
     v
+----+---------------------+
| GCP Pub/Sub Topic        |
+----+---------------------+
     |
     | (4) Push Webhook / Local Pull Poll
     v
+----+-----------------------+      (5) Process      +--------------------------+
| Go Transcoder Service      | ====================> | FFmpeg (HLS Generation)  |
| (Cloud Run / Local Worker) |                       +--------------------------+
+----+-----------------------+
     |
     | (6) Write Streaming Assets
     v
+----+-------------------------------+
| GCS Bucket: `processed-videos`     | <--- Lifecycle: Delete after 30 days
+------------------------------------+
```

---

## 2. Component Specifications

### 2.1 Frontend: Nuxt.js (Vue 3 Framework)
* **Responsibility:** User interface, video ingestion facilitation, and client-side modern media streaming.
* **Rendering Strategy:** **Server-Side Rendering (SSR)** for dynamic `/watch/[id]` viewing routes to properly feed Open Graph / SEO crawlers with unique metadata tags (title, descriptions, previews); Single Page Application (SPA) behaviors for the internal ingestion workflow.
* **Video Playback Engine:** Integration of **HLS.js** within the Vue 3 Composition API (`setup`) to provide Media Source Extensions (MSE) polyfills for browsers lacking native HLS support (Chrome, Firefox, Edge). Safari will utilize its built-in native streaming layer.

### 2.2 API Service: Go (Lightweight Core)
* **Responsibility:** Authentication, resource metadata management, and temporary ingestion authorization.
* **Infrastructure Profile:** Low resource mapping (1 vCPU, 512MiB RAM) configured with a high concurrency limit (80+ concurrent connections per instance).
* **Primary Ingestion Endpoint:** Generates Google Cloud Storage **Signed URLs** leveraging cryptographically assigned service accounts. Configured explicitly with `content-length-range` variables to strictly enforce a **100MB maximum file size** directly at the bucket storage perimeter.

### 2.3 Transcoder Service: Go + FFmpeg (Heavy Engine)
* **Responsibility:** Heavy-duty computational media slicing and playlist construction.
* **Infrastructure Profile:** High resource mapping (4 vCPU, 4GiB RAM) configured with strict low concurrency constraints (1 to 2 concurrent tasks per container) to isolate system resource exhaustion.
* **Media Processing Framework:** Spawns a localized sub-process executing an optimized multi-pass `ffmpeg` script.

---

## 3. Storage & Event Pipeline Strategy

### 3.1 Data Flow Sequence
1.  **Authorization:** Client requests an upload token from the `api-service`.
2.  **Ingestion:** Client issues a binary `PUT` stream directly into `gs://raw-videos-[unique_id]`.
3.  **Event Generation:** GCS emits an infrastructure-level `OBJECT_FINALIZE` event notification.
4.  **Broker Dissemination:** Google Cloud Pub/Sub picks up the event and delivers the payload structure.
5.  **Execution:** The `transcoder-service` processes the message, handles file slicing, writes outputs to `gs://processed-videos-[unique_id]`, and flags database records as active.

### 3.2 Automated Storage Lifecycle Rules
To maintain cost control and prevent infrastructure bloat, the processed asset bucket runs an immutable native GCP lifecycle policy:
```json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "age": 30
      }
    }
  ]
}
```

---

## 4. Multi-Environment Execution Architecture

The codebase handles local testing entirely offline by abstracting the event protocol and storage boundaries.

### 4.1 Production Execution Mode (`APP_ENV=production`)
* **Event Broker:** Real Google Cloud Pub/Sub pushes incoming messages via secure **HTTPS POST webhooks** directly to the transcoder's exposed endpoint routing matrix.
* **Storage Boundaries:** True, geographically designated Google Cloud Storage buckets.

### 4.2 Local Development Mode (`APP_ENV=local`)
* **Event Broker:** A local Google Cloud SDK **Pub/Sub Emulator** run inside Docker Compose.
* **Subscriber Mechanic:** To bypass the lack of an external public HTTPS domain routing locally, the Go `transcoder-service` dynamically converts its event handler from a *Push Webhook listener* into an active *Pull Loop Subscriber* matching the local emulator container's exposed wire port (`8085`).

---

## 5. Repository Layout (Monorepo Blueprint)

To optimize visibility and present a professional software architecture to evaluators, the codebase organizes under a unified monorepo model:

```text
/
├── README.md                 # Main overview, structural maps, and initialization guides
├── docker-compose.yml         # Declares localized database and Pub/Sub emulator instances
├── infra/                    # Declarative configuration definitions (Terraform / HCL scripts)
├── frontend/                  # Nuxt.js / Vue 3 Application Layer
│   ├── components/            # Reusable interface parts (e.g., HlsVideoPlayer.vue)
│   ├── pages/                 # Route mappings (index.vue, watch/[id].vue)
│   └── package.json
├── api-service/              # Core Go API Engine
│   ├── main.go               # Router routing logic and signed token endpoints
│   ├── go.mod
│   └── Dockerfile            # Lightweight scratch/alpine layer completely devoid of FFmpeg
└── transcoder-service/        # Computational Go Processing Worker
    ├── main.go               # Unified entrance handling local Pull Loops or production Webhooks
    ├── go.mod
    └── Dockerfile            # Custom built, injection-packed Alpine container housing FFmpeg binaries
```

---

## 6. Continuous Integration & Deployment (CI/CD)

Automated application deployment is handled cleanly by leveraging GitHub Actions workflows driven by isolated **Path Filters**. This guarantees that overlapping code revisions do not cause massive, unnecessary workspace container builds.

### Pipeline Rules Matrix:
* **Trigger Rules:** Code check-ins targeting `api-service/**` compile and release exclusively the API platform to Cloud Run. Check-ins targeted at `transcoder-service/**` build and refresh exclusively the computing engine.
* **Authentication Security:** Employs **GCP Workload Identity Federation**, utilizing OpenID Connect (OIDC) tokens issued dynamically by GitHub to access Google's internal Artifact Registry. No static, persistent JSON service account files or access keys are stored inside GitHub Repository Secrets.
