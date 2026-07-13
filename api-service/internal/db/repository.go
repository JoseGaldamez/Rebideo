package db

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/JoseGaldamez/rebideo-api-service/internal/models"
)

// ErrNotFound is returned when a video record does not exist.
var ErrNotFound = errors.New("db: video record not found")

// Repository wraps a *firestore.Client and provides data access methods
// for Video_Record entities in Firestore.
type Repository struct {
	client *firestore.Client
}

// NewRepository opens a connection to Firestore using the given project ID.
// The caller is responsible for closing the repository when done.
func NewRepository(ctx context.Context, projectID string) (*Repository, error) {
	if projectID == "" {
		return nil, fmt.Errorf("db: project ID must not be empty")
	}

	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("db: failed to create firestore client: %w", err)
	}

	return &Repository{client: client}, nil
}

// Close releases the underlying Firestore client resources.
func (r *Repository) Close() error {
	return r.client.Close()
}

// InsertVideoRecord inserts a new video record with the given parameters.
// It generates a new UUID for the document ID, creates the record with status "pending",
// and saves it in Firestore.
func (r *Repository) InsertVideoRecord(ctx context.Context, userID, title, description, visibility, rawObject string) (models.VideoRecord, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	v := models.VideoRecord{
		ID:          id,
		UserID:      userID,
		Title:       title,
		Description: description,
		Visibility:  visibility,
		Status:      models.StatusPending,
		RawObject:   rawObject,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	_, err := r.client.Collection("videos").Doc(id).Set(ctx, v)
	if err != nil {
		return models.VideoRecord{}, fmt.Errorf("db: insert video record in firestore: %w", err)
	}

	return v, nil
}

// UpdateVideoRecordStatus updates the status and updated_at timestamp for the
// video identified by id. If statusVal is "active", it also constructs and
// updates the thumbnail_url. If statusVal is "processing", it increments
// processing_attempts. If statusVal is "failed", it records errMsg.
func (r *Repository) UpdateVideoRecordStatus(ctx context.Context, id, statusVal string, errMsg string) error {
	updates := []firestore.Update{
		{Path: "status", Value: statusVal},
		{Path: "updated_at", Value: time.Now().UTC()},
	}

	if statusVal == "processing" {
		updates = append(updates, firestore.Update{
			Path:  "processing_attempts",
			Value: firestore.Increment(1),
		})
		updates = append(updates, firestore.Update{
			Path:  "error_message",
			Value: "",
		})
	}

	if statusVal == "failed" && errMsg != "" {
		updates = append(updates, firestore.Update{
			Path:  "error_message",
			Value: errMsg,
		})
	}

	if statusVal == "active" {
		processedBucket := os.Getenv("GCS_PROCESSED_BUCKET")
		if processedBucket == "" {
			processedBucket = "rebideo-processed-videos"
		}
		var thumbURL string
		if emulatorHost := os.Getenv("STORAGE_EMULATOR_HOST"); emulatorHost != "" {
			thumbURL = fmt.Sprintf("%s/%s/%s/thumbnail.jpg", emulatorHost, processedBucket, id)
		} else {
			thumbURL = fmt.Sprintf("https://storage.googleapis.com/%s/%s/thumbnail.jpg", processedBucket, id)
		}
		updates = append(updates, firestore.Update{Path: "thumbnail_url", Value: thumbURL})
	}

	_, err := r.client.Collection("videos").Doc(id).Update(ctx, updates)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return ErrNotFound
		}
		return fmt.Errorf("db: update video status: %w", err)
	}
	return nil
}

// UpdateVideoRecordRawObject sets the raw_object column for the video identified
// by id.
func (r *Repository) UpdateVideoRecordRawObject(ctx context.Context, id, rawObject string) error {
	_, err := r.client.Collection("videos").Doc(id).Update(ctx, []firestore.Update{
		{Path: "raw_object", Value: rawObject},
		{Path: "updated_at", Value: time.Now().UTC()},
	})
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return ErrNotFound
		}
		return fmt.Errorf("db: update video raw_object: %w", err)
	}
	return nil
}

// GetVideoRecordByID fetches the video record with the given id.
func (r *Repository) GetVideoRecordByID(ctx context.Context, id string) (models.VideoRecord, error) {
	doc, err := r.client.Collection("videos").Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return models.VideoRecord{}, ErrNotFound
		}
		return models.VideoRecord{}, fmt.Errorf("db: get video record by id: %w", err)
	}

	var v models.VideoRecord
	if err := doc.DataTo(&v); err != nil {
		return models.VideoRecord{}, fmt.Errorf("db: populate video record: %w", err)
	}

	return v, nil
}

// Ping verifies Firestore connectivity by attempting to list collections.
func (r *Repository) Ping(ctx context.Context) error {
	iter := r.client.Collections(ctx)
	_, err := iter.Next()
	if err != nil && err != iterator.Done {
		return err
	}
	return nil
}
