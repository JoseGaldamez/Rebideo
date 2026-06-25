package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"firebase.google.com/go/v4/auth"
	"github.com/google/uuid"

	"github.com/JoseGaldamez/rebideo-api-service/internal/db"
	"github.com/JoseGaldamez/rebideo-api-service/internal/models"
)

// videoMetadataResponse is the JSON body returned by GET /videos/{id}.
// PlaylistURL is omitted from the response when the video is not active.
type videoMetadataResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Visibility  string `json:"visibility"`
	Status      string `json:"status"`
	PlaylistURL string `json:"playlist_url,omitempty"`
}

// VideoMetadataHandler handles GET /videos/{id} requests.
// It is a public endpoint — no auth middleware is applied.
type VideoMetadataHandler struct {
	repo            *db.Repository
	authClient      *auth.Client
	processedBucket string
}

// NewVideoMetadataHandler constructs a VideoMetadataHandler. The
// GCS_PROCESSED_BUCKET environment variable is read once at construction time.
func NewVideoMetadataHandler(repo *db.Repository, authClient *auth.Client) *VideoMetadataHandler {
	return &VideoMetadataHandler{
		repo:            repo,
		authClient:      authClient,
		processedBucket: os.Getenv("GCS_PROCESSED_BUCKET"),
	}
}

// ServeHTTP implements http.Handler.
//
// Flow (per design.md Metadata Retrieval Flow):
//  1. Validate id format → 400 if malformed or empty.
//  2. Lookup Video_Record → 404 if not found; 500 on other DB errors.
//  3. If status == active: probe GCS for master .m3u8.
//     - Absent: UPDATE status to expired, return {id, title, status: "expired"}.
//     - Present: generate pre-signed GET URL (TTL 60 min), return full record + playlist_url.
//  4. If status != active: return {id, title, status} without playlist_url.
func (h *VideoMetadataHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Step 1 — extract and validate the video ID from the URL path.
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}
	if _, err := uuid.Parse(id); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id must be a valid UUID"})
		return
	}

	// Step 2 — fetch the Video_Record from the database.
	video, err := h.repo.GetVideoRecordByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "video not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to retrieve video record"})
		return
	}

	// Step 2.5 — check visibility permission if private.
	if video.Visibility == "private" {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing or invalid authorization header for private video"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := h.authClient.VerifyIDToken(r.Context(), tokenString)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired token"})
			return
		}

		userID, ok := token.Claims["user_id"].(string)
		if !ok || userID != video.UserID {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden: you do not own this private video"})
			return
		}
	}

	// Step 3 / 4 — build response based on current status.
	if video.Status == models.StatusActive {
		h.handleActiveVideo(w, r.Context(), video)
		return
	}

	// Status is not active — return current status without a playlist URL.
	writeJSON(w, http.StatusOK, videoMetadataResponse{
		ID:          video.ID,
		Title:       video.Title,
		Description: video.Description,
		Visibility:  video.Visibility,
		Status:      video.Status,
	})
}

// handleActiveVideo probes GCS for the master playlist.
// If absent it lazily expires the record and returns the expired status.
// If present it generates a pre-signed GET URL and returns the full response.
func (h *VideoMetadataHandler) handleActiveVideo(w http.ResponseWriter, ctx context.Context, video models.VideoRecord) {
	objectKey := fmt.Sprintf("%s/master.m3u8", video.ID)

	exists, err := h.objectExists(ctx, objectKey)
	if err != nil {
		// GCS probe failed — treat as internal error; do not change status.
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to probe storage"})
		return
	}

	if !exists {
		// Master playlist is gone — lazily expire the record.
		if updateErr := h.repo.UpdateVideoRecordStatus(ctx, video.ID, models.StatusExpired); updateErr != nil {
			// Log the update failure but still return the expired status to
			// the caller; a subsequent request will retry the update.
			_ = updateErr
		}
		writeJSON(w, http.StatusOK, videoMetadataResponse{
			ID:          video.ID,
			Title:       video.Title,
			Description: video.Description,
			Visibility:  video.Visibility,
			Status:      models.StatusExpired,
		})
		return
	}

	// Master playlist exists — generate a pre-signed GET URL (TTL 60 min).
	playlistURL, err := h.generateSignedURL(ctx, objectKey)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to generate playlist URL"})
		return
	}

	writeJSON(w, http.StatusOK, videoMetadataResponse{
		ID:          video.ID,
		Title:       video.Title,
		Description: video.Description,
		Visibility:  video.Visibility,
		Status:      video.Status,
		PlaylistURL: playlistURL,
	})
}

// objectExists returns true if the given object key exists in the processed
// bucket, false if it is absent (storage.ErrObjectNotExist), and an error for
// any other failure.
func (h *VideoMetadataHandler) objectExists(ctx context.Context, objectKey string) (bool, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return false, fmt.Errorf("handlers: create storage client: %w", err)
	}
	defer client.Close()

	_, err = client.Bucket(h.processedBucket).Object(objectKey).Attrs(ctx)
	if err != nil {
		if errors.Is(err, storage.ErrObjectNotExist) {
			return false, nil
		}
		return false, fmt.Errorf("handlers: get object attrs: %w", err)
	}

	return true, nil
}

// generateSignedURL creates a GCS V4 signed GET URL for the given object key
// with a 60-minute TTL. It follows the same ADC pattern as upload_token.go.
func (h *VideoMetadataHandler) generateSignedURL(ctx context.Context, objectKey string) (string, error) {
	if emulatorHost := os.Getenv("STORAGE_EMULATOR_HOST"); emulatorHost != "" {
		return fmt.Sprintf("%s/%s/%s", emulatorHost, h.processedBucket, objectKey), nil
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return "", fmt.Errorf("handlers: create storage client: %w", err)
	}
	defer client.Close()

	opts := &storage.SignedURLOptions{
		Method:  "GET",
		Expires: time.Now().Add(60 * time.Minute),
		Scheme:  storage.SigningSchemeV4,
	}

	url, err := client.Bucket(h.processedBucket).SignedURL(objectKey, opts)
	if err != nil {
		return "", fmt.Errorf("handlers: sign URL: %w", err)
	}

	return url, nil
}
