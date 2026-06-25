package handlers

import (
	"context"
	"net/http"
	"os"
	"strings"

	"cloud.google.com/go/pubsub"
	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/JoseGaldamez/rebideo-api-service/internal/db"
)

type HealthHandler struct {
	repo      *db.Repository
	projectID string
	rawBucket string
}

func NewHealthHandler(repo *db.Repository) *HealthHandler {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = os.Getenv("PROJECT_ID")
	}
	return &HealthHandler{
		repo:      repo,
		projectID: projectID,
		rawBucket: os.Getenv("GCS_RAW_BUCKET"),
	}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	health := map[string]string{
		"status":    "OK",
		"firestore": "connected",
		"storage":   "connected",
		"pubsub":    "connected",
	}
	hasError := false

	// 1. Check Firestore
	if err := h.repo.Ping(ctx); err != nil {
		health["firestore"] = "error: " + err.Error()
		hasError = true
	}

	// 2. Check Storage
	if err := h.checkStorage(ctx); err != nil {
		health["storage"] = "error: " + err.Error()
		hasError = true
	}

	// 3. Check PubSub
	if err := h.checkPubSub(ctx); err != nil {
		if isPermissionDenied(err) {
			health["pubsub"] = "connected (bypassed IAM checks)"
		} else {
			health["pubsub"] = "error: " + err.Error()
			hasError = true
		}
	}

	if hasError {
		health["status"] = "ERROR"
		writeJSON(w, http.StatusInternalServerError, health)
		return
	}

	writeJSON(w, http.StatusOK, health)
}

func (h *HealthHandler) checkStorage(ctx context.Context) error {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return err
	}
	defer client.Close()

	bucket := client.Bucket(h.rawBucket)
	_, err = bucket.Attrs(ctx)
	if err != nil {
		// Auto-provision bucket in GCS emulator if it doesn't exist
		if os.Getenv("STORAGE_EMULATOR_HOST") != "" {
			_ = bucket.Create(ctx, h.projectID, nil)
			// Probar de nuevo tras crearlo
			_, err = bucket.Attrs(ctx)
			if err == nil {
				return nil
			}
		}
		return err
	}
	return nil
}

func (h *HealthHandler) checkPubSub(ctx context.Context) error {
	client, err := pubsub.NewClient(ctx, h.projectID)
	if err != nil {
		return err
	}
	defer client.Close()

	it := client.Topics(ctx)
	_, err = it.Next()
	if err != nil && err != iterator.Done {
		return err
	}
	return nil
}

func isPermissionDenied(err error) bool {
	if s, ok := status.FromError(err); ok {
		return s.Code() == codes.PermissionDenied
	}
	return strings.Contains(err.Error(), "PermissionDenied") || strings.Contains(err.Error(), "IAM_PERMISSION_DENIED")
}

