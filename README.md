# Rebideo — Video Streaming Platform

This is the monorepo root for **Rebideo**, an event-driven, microservices-based video streaming platform built with **Go**, **Next.js**, and **Google Cloud Platform (GCP)**. It implements adaptive bitrate streaming (ABR) using HLS format.

---

## Repository Structure

```text
/
├── docker-compose.yml         # Local emulators (Firestore, Pub/Sub, Storage, Auth)
├── run.ps1                    # Windows PowerShell orchestrator script (starts/stops everything)
├── run.sh                     # Bash orchestrator script for Linux, macOS, and Git Bash
├── api-service/              # Go core API service
├── transcoder-service/        # Go worker service utilizing FFmpeg for transcoding
└── frontend/                  # Next.js frontend with HLS streaming player
```

---

## Local Development Prerequisites

Before running the project locally, ensure you have the following installed on your machine:

1. **Go** (1.21 or later) — to run the backend microservices.
2. **Node.js** (v20+) & **pnpm** (or `npm`) — to run the frontend.
3. **Docker Desktop** — to run the emulators via Docker Compose.
4. **FFmpeg** — required locally by the `transcoder-service`.
   - *Windows:* Install via Chocolatey: `choco install ffmpeg` or download from official website and ensure it is in your system's `PATH`.
   - *macOS:* Install via Homebrew: `brew install ffmpeg`
   - *Linux:* Install via apt: `sudo apt install ffmpeg`

---

## Running the Project with Orchestrator Scripts

We provide both a **PowerShell script** (`run.ps1`) for Windows and a **Bash script** (`run.sh`) for macOS, Linux, and Git Bash to manage the startup and shutdown of all 3 services and Docker Compose with a single command.

### Windows (PowerShell)

Ensure you run your PowerShell terminal with execution permissions enabled (e.g. `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`).

#### Start all services:
```powershell
.\run.ps1 up
# Or simply
.\run.ps1
```
*This command starts Docker Compose in detached mode, then spawns three separate terminal windows for the API, Transcoder, and Frontend. This keeps logs visible, and leaves the windows open (using `/k`) if a command exits, making debugging extremely easy.*

#### Stop all services:
```powershell
.\run.ps1 down
```
*This command reads the spawned process IDs, force-terminates their entire process trees (including Go and Next.js child processes), and stops Docker Compose.*

---

### macOS, Linux, and Git Bash (`run.sh`)

Ensure the script is marked as executable:
```bash
chmod +x run.sh
```

#### Start all services:
```bash
./run.sh up
# Or simply
./run.sh
```
*This starts Docker Compose and launches the 3 microservices in the background. Their output logs are written to `api.log`, `transcoder.log`, and `frontend.log` respectively in the project root.*

#### Stop all services:
```bash
./run.sh down
```
*This kills all background microservice process trees and stops the Docker Compose containers.*

---

## Individual Service Details

### 1. Local Emulators (Docker Compose)
Spawns local emulators mimicking the GCP stack:
- **Firestore Emulator:** Port `8082` (Map to port `8080` internally)
- **Pub/Sub Emulator:** Port `8085`
- **Fake GCS Server (Storage Emulator):** Port `4443`
- **Firebase Auth Emulator:** Port `9099`

### 2. API Service (Go)
Exposes the core JSON API endpoints on port `8080`.
- Configured via `api-service/.env`

### 3. Transcoder Service (Go + FFmpeg)
A CPU-intensive service that subscribes to the local Pub/Sub emulator pull-loop. Upon detecting an `OBJECT_FINALIZE` upload event, it downloads the video from the fake GCS server, spawns an FFmpeg command to slice it into HLS `.ts` chunks/`.m3u8` playlists, uploads them back to GCS, and updates the database record.
- Configured via `transcoder-service/.env`

### 4. Frontend (Next.js)
A Next.js application running on port `3000`.
- Configured via `frontend/.env`
