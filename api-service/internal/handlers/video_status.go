package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"

	"github.com/JoseGaldamez/rebideo-api-service/internal/db"
	"github.com/JoseGaldamez/rebideo-api-service/internal/models"
)

// VideoStatusHandler handles PATCH /videos/{id}/status requests.
type VideoStatusHandler struct {
	repo          *db.Repository
	internalToken string
}

// NewVideoStatusHandler constructs a VideoStatusHandler. The INTERNAL_API_TOKEN
// environment variable is read once at construction time.
func NewVideoStatusHandler(repo *db.Repository) *VideoStatusHandler {
	return &VideoStatusHandler{
		repo:          repo,
		internalToken: os.Getenv("INTERNAL_API_TOKEN"),
	}
}

type videoStatusRequest struct {
	Status string `json:"status"`
}

func (h *VideoStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Optional security token check for internal requests
	if h.internalToken != "" {
		token := r.Header.Get("X-Internal-Token")
		if token != h.internalToken {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized: invalid internal token"})
			return
		}
	}

	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	var req videoStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return
	}

	// Validate status values
	switch req.Status {
	case models.StatusPending, models.StatusProcessing, models.StatusActive, models.StatusFailed, models.StatusExpired:
		// valid status
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid status: %s", req.Status)})
		return
	}

	err := h.repo.UpdateVideoRecordStatus(r.Context(), id, req.Status)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "video not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update video status"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "status updated successfully"})
}
