package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
	"github.com/JoseGaldamez/rebideo-api-service/internal/db"
	"github.com/JoseGaldamez/rebideo-api-service/internal/handlers"
	"github.com/JoseGaldamez/rebideo-api-service/internal/middleware"
)

func main() {
	// Cargar archivo .env local si existe
	_ = godotenv.Load()

	ctx := context.Background()

	// --- Database ---
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = os.Getenv("PROJECT_ID")
	}
	repo, err := db.NewRepository(ctx, projectID)
	if err != nil {
		log.Fatalf("api: failed to initialise repository: %v", err)
	}
	defer repo.Close()

	// --- Initialise Buckets (Emulator only) ---
	if os.Getenv("STORAGE_EMULATOR_HOST") != "" {
		raw := os.Getenv("GCS_RAW_BUCKET")
		processed := os.Getenv("GCS_PROCESSED_BUCKET")
		log.Println("api: GCS Emulator detected, verifying buckets...")
		if err := ensureLocalBuckets(ctx, projectID, raw, processed); err != nil {
			log.Printf("api: warning: failed to ensure local GCS buckets: %v", err)
		}
	}

	// --- Firebase App & Auth Client ---
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID})
	if err != nil {
		log.Fatalf("api: failed to initialize firebase app: %v", err)
	}
	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("api: failed to initialize firebase auth client: %v", err)
	}

	// --- Handlers ---
	uploadTokenHandler := handlers.NewUploadTokenHandler(repo)
	videoMetadataHandler := handlers.NewVideoMetadataHandler(repo, authClient)
	healthHandler := handlers.NewHealthHandler(repo)

	// --- Router ---
	mux := http.NewServeMux()

	// GET /health — public diagnostics endpoint.
	mux.Handle("GET /health", healthHandler)

	// POST /upload-token — protected by Firebase Auth middleware.
	mux.Handle("POST /upload-token", middleware.AuthMiddleware(authClient, uploadTokenHandler))

	// GET /videos/{id} — public endpoint, no auth required (Requirement 8.3, 16.1).
	mux.Handle("GET /videos/{id}", videoMetadataHandler)

	// --- Server ---
	addr := os.Getenv("PORT")
	if addr == "" {
		addr = "8080"
	}
	addr = ":" + addr

	log.Printf("api: listening on %s", addr)
	if err := http.ListenAndServe(addr, middleware.CORSMiddleware(mux)); err != nil {
		log.Fatalf("api: server error: %v", err)
	}
}

func ensureLocalBuckets(ctx context.Context, projectID, raw, processed string) error {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return err
	}
	defer client.Close()

	for _, bName := range []string{raw, processed} {
		if bName == "" {
			continue
		}
		bucket := client.Bucket(bName)
		_, err := bucket.Attrs(ctx)
		if err != nil {
			log.Printf("api: creating local bucket %s...", bName)
			err = bucket.Create(ctx, projectID, nil)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
