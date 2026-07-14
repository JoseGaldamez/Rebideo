package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"cloud.google.com/go/storage"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"github.com/google/uuid"
	"google.golang.org/api/iterator"

	"github.com/JoseGaldamez/rebideo-api-service/internal/db"
	"github.com/JoseGaldamez/rebideo-api-service/internal/middleware"
)

type VideoEditHandler struct {
	repo       *db.Repository
	authClient *firebaseAuth.Client
}

func NewVideoEditHandler(repo *db.Repository, authClient *firebaseAuth.Client) *VideoEditHandler {
	return &VideoEditHandler{
		repo:       repo,
		authClient: authClient,
	}
}

type updateMetadataRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Visibility  string `json:"visibility"`
}

func (h *VideoEditHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPatch:
		h.handleUpdate(w, r)
	case http.MethodDelete:
		h.handleDelete(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (h *VideoEditHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}
	if _, err := uuid.Parse(id); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id must be a valid UUID"})
		return
	}

	// Retrieve authenticated user from context claims
	claims, ok := r.Context().Value(middleware.ClaimsKey).(map[string]interface{})
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	userID, _ := claims["user_id"].(string)
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized: missing user id"})
		return
	}

	// Fetch existing record to check ownership
	video, err := h.repo.GetVideoRecordByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "video not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to retrieve video"})
		return
	}

	if video.UserID != userID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden: you are not the owner of this video"})
		return
	}

	// Parse body
	var req updateMetadataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return
	}

	// Validate fields
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title must not be empty"})
		return
	}
	req.Visibility = strings.TrimSpace(req.Visibility)
	if req.Visibility != "public" && req.Visibility != "private" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "visibility must be either 'public' or 'private'"})
		return
	}

	// Update DB
	err = h.repo.UpdateVideoMetadata(r.Context(), id, req.Title, req.Description, req.Visibility)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update video metadata"})
		return
	}

	// Respond with updated values
	writeJSON(w, http.StatusOK, map[string]string{
		"message":     "video updated successfully",
		"title":       req.Title,
		"description": req.Description,
		"visibility":  req.Visibility,
	})
}

func (h *VideoEditHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}
	if _, err := uuid.Parse(id); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id must be a valid UUID"})
		return
	}

	// Retrieve authenticated user from context claims
	claims, ok := r.Context().Value(middleware.ClaimsKey).(map[string]interface{})
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	userID, _ := claims["user_id"].(string)
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized: missing user id"})
		return
	}

	// Fetch existing record to check ownership
	video, err := h.repo.GetVideoRecordByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "video not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to retrieve video"})
		return
	}

	if video.UserID != userID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden: you are not the owner of this video"})
		return
	}

	// Clean up storage objects synchronously
	err = h.deleteGCSObjects(r.Context(), video.RawObject, video.ID)
	if err != nil {
		log.Printf("api: warning during storage deletion: %v", err)
	}

	// Delete Firestore doc
	err = h.repo.DeleteVideoRecord(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete video record from database"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "video deleted successfully"})
}

func (h *VideoEditHandler) deleteGCSObjects(ctx context.Context, rawObject string, videoID string) error {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("create storage client: %w", err)
	}
	defer client.Close()

	// 1. Delete raw file
	if rawObject != "" {
		rawBucket := os.Getenv("GCS_RAW_BUCKET")
		if rawBucket != "" {
			log.Printf("api: deleting raw object gs://%s/%s", rawBucket, rawObject)
			err := client.Bucket(rawBucket).Object(rawObject).Delete(ctx)
			if err != nil && !errors.Is(err, storage.ErrObjectNotExist) {
				log.Printf("api: warning: failed to delete raw object: %v", err)
			}
		}
	}

	// 2. Delete processed HLS folder content
	processedBucket := os.Getenv("GCS_PROCESSED_BUCKET")
	if processedBucket != "" {
		bucket := client.Bucket(processedBucket)
		prefix := fmt.Sprintf("%s/", videoID)
		log.Printf("api: deleting processed objects in gs://%s/%s*", processedBucket, prefix)

		it := bucket.Objects(ctx, &storage.Query{Prefix: prefix})
		for {
			attrs, err := it.Next()
			if errors.Is(err, iterator.Done) {
				break
			}
			if err != nil {
				log.Printf("api: warning: failed to list processed objects: %v", err)
				break
			}
			log.Printf("api: deleting processed object %s", attrs.Name)
			err = bucket.Object(attrs.Name).Delete(ctx)
			if err != nil && !errors.Is(err, storage.ErrObjectNotExist) {
				log.Printf("api: warning: failed to delete processed object %s: %v", attrs.Name, err)
			}
		}
	}

	return nil
}
