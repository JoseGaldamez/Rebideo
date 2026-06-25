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
	ID        string    `json:"id" db:"id"`
	Title     string    `json:"title" db:"title"`
	Status    string    `json:"status" db:"status"`
	RawObject string    `json:"raw_object" db:"raw_object"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
