package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"cloud.google.com/go/storage"

	"github.com/JoseGaldamez/rebideo-api-service/internal/db"
)

// uploadTokenRequest is the expected JSON body for POST /upload-token.
type uploadTokenRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

// uploadTokenResponse is the JSON body returned on success.
type uploadTokenResponse struct {
	VideoID   string `json:"video_id"`
	SignedURL string `json:"signed_url"`
}

// UploadTokenHandler handles POST /upload-token requests.
// It validates the request, creates a pending Video_Record in the database,
// generates a GCS V4 Signed URL, and returns both video_id and signed_url.
type UploadTokenHandler struct {
	repo      *db.Repository
	rawBucket string
}

// NewUploadTokenHandler constructs an UploadTokenHandler. The GCS_RAW_BUCKET
// environment variable is read once at construction time.
func NewUploadTokenHandler(repo *db.Repository) *UploadTokenHandler {
	return &UploadTokenHandler{
		repo:      repo,
		rawBucket: os.Getenv("GCS_RAW_BUCKET"),
	}
}

// ServeHTTP implements http.Handler.
//
// Flow (per design.md):
//  1. Auth is enforced upstream by AuthMiddleware → 401 if missing/invalid.
//  2. Validate request body (filename, content_type) → 400 if malformed.
//  3. INSERT Video_Record {status: pending} → 500 if DB write fails.
//  4. Call GCS SignedURL API with content-length-range: 1–104857600, TTL 15 min.
//  5. Return {video_id, signed_url}.
func (h *UploadTokenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Step 2 — decode and validate request body.
	var req uploadTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return
	}
	if req.Filename == "" || req.ContentType == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "filename and content_type are required and must not be empty",
		})
		return
	}

	// Step 3 — insert Video_Record with status "pending" before generating the URL.
	//
	// PostgreSQL generates the UUID on INSERT via gen_random_uuid(), so we don't
	// know the video ID until after the insert. We therefore insert with a temporary
	// raw_object value, obtain the returned ID, compute the canonical GCS object key
	// (videos/<id>/<filename>), and update raw_object in a second statement.
	video, err := h.repo.InsertVideoRecord(r.Context(), req.Filename, req.Filename)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create video record"})
		return
	}

	objectKey := fmt.Sprintf("videos/%s/%s", video.ID, req.Filename)
	if err := h.repo.UpdateVideoRecordRawObject(r.Context(), video.ID, objectKey); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update video record object key"})
		return
	}

	// Step 4 — generate the GCS Signed URL.
	signedURL, err := h.generateSignedURL(r.Context(), objectKey, req.ContentType)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to generate signed URL"})
		return
	}

	// Step 5 — return video_id + signed_url.
	writeJSON(w, http.StatusOK, uploadTokenResponse{
		VideoID:   video.ID,
		SignedURL: signedURL,
	})
}

// generateSignedURL creates a GCS V4 signed PUT URL for the given object key.
// It enforces a content-length-range of 1–104857600 bytes via the
// x-goog-content-length-range extension header and sets a 15-minute expiry.
func (h *UploadTokenHandler) generateSignedURL(ctx context.Context, objectKey, contentType string) (string, error) {
	if emulatorHost := os.Getenv("STORAGE_EMULATOR_HOST"); emulatorHost != "" {
		return fmt.Sprintf("%s/%s/%s?uploadType=media&name=%s", emulatorHost, h.rawBucket, objectKey, url.QueryEscape(objectKey)), nil
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return "", fmt.Errorf("handlers: create storage client: %w", err)
	}
	defer client.Close()

	opts := &storage.SignedURLOptions{
		Method:      "PUT",
		Expires:     time.Now().Add(15 * time.Minute),
		ContentType: contentType,
		Scheme:      storage.SigningSchemeV4,
		// The x-goog-content-length-range header is included in the signed string
		// so GCS rejects uploads outside the [1, 104857600] byte range.
		Headers: []string{"x-goog-content-length-range:1,104857600"},
	}

	url, err := client.Bucket(h.rawBucket).SignedURL(objectKey, opts)
	if err != nil {
		return "", fmt.Errorf("handlers: sign URL: %w", err)
	}

	return url, nil
}

// writeJSON encodes v as JSON and writes it with the given HTTP status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
