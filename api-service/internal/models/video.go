package models

import "time"

// VideoRecord status constants
const (
	StatusPending    = "pending"
	StatusProcessing = "processing"
	StatusActive     = "active"
	StatusFailed     = "failed"
	StatusExpired    = "expired"
)

// VideoRecord represents a video asset and its processing state.
type VideoRecord struct {
	ID          string    `json:"id" db:"id" firestore:"id"`
	UserID      string    `json:"user_id" db:"user_id" firestore:"user_id"`
	Title       string    `json:"title" db:"title" firestore:"title"`
	Description string    `json:"description" db:"description" firestore:"description"`
	Visibility  string    `json:"visibility" db:"visibility" firestore:"visibility"`
	Status      string    `json:"status" db:"status" firestore:"status"`
	RawObject   string    `json:"raw_object" db:"raw_object" firestore:"raw_object"`
	CreatedAt    time.Time `json:"created_at" db:"created_at" firestore:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at" firestore:"updated_at"`
	ThumbnailURL       string    `json:"thumbnail_url,omitempty" db:"thumbnail_url" firestore:"thumbnail_url,omitempty"`
	ProcessingAttempts int       `json:"processing_attempts" db:"processing_attempts" firestore:"processing_attempts"`
	ErrorMessage       string    `json:"error_message,omitempty" db:"error_message" firestore:"error_message,omitempty"`
}
