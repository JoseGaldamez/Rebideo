package db

import (
	"context"
	"os"
	"testing"

	"github.com/JoseGaldamez/rebideo-api-service/internal/models"
)

func TestFirestoreRepository(t *testing.T) {
	emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST")
	if emulatorHost == "" {
		t.Skip("Skipping test: FIRESTORE_EMULATOR_HOST environment variable not set")
	}

	ctx := context.Background()
	projectID := "test-project"

	repo, err := NewRepository(ctx, projectID)
	if err != nil {
		t.Fatalf("Failed to initialize repository: %v", err)
	}
	defer repo.Close()

	// Test Insert
	userID := "test-user"
	title := "My Test Video"
	description := "Test Description"
	visibility := "public"
	rawObject := "videos/temp/test.mp4"
	v, err := repo.InsertVideoRecord(ctx, userID, title, description, visibility, rawObject)
	if err != nil {
		t.Fatalf("Failed to insert video record: %v", err)
	}

	if v.UserID != userID {
		t.Errorf("Expected userID %q, got %q", userID, v.UserID)
	}
	if v.Title != title {
		t.Errorf("Expected title %q, got %q", title, v.Title)
	}
	if v.Description != description {
		t.Errorf("Expected description %q, got %q", description, v.Description)
	}
	if v.Visibility != visibility {
		t.Errorf("Expected visibility %q, got %q", visibility, v.Visibility)
	}
	if v.Status != models.StatusPending {
		t.Errorf("Expected status %q, got %q", models.StatusPending, v.Status)
	}

	// Test Get
	fetched, err := repo.GetVideoRecordByID(ctx, v.ID)
	if err != nil {
		t.Fatalf("Failed to fetch video record: %v", err)
	}
	if fetched.ID != v.ID || fetched.Title != v.Title {
		t.Errorf("Fetched record does not match inserted record")
	}

	// Test Update Status
	err = repo.UpdateVideoRecordStatus(ctx, v.ID, models.StatusProcessing, "", "")
	if err != nil {
		t.Fatalf("Failed to update status: %v", err)
	}

	fetched, err = repo.GetVideoRecordByID(ctx, v.ID)
	if err != nil {
		t.Fatalf("Failed to fetch after status update: %v", err)
	}
	if fetched.Status != models.StatusProcessing {
		t.Errorf("Expected status %q, got %q", models.StatusProcessing, fetched.Status)
	}

	// Test Update Raw Object
	newRaw := "videos/new/path.mp4"
	err = repo.UpdateVideoRecordRawObject(ctx, v.ID, newRaw)
	if err != nil {
		t.Fatalf("Failed to update raw object: %v", err)
	}

	fetched, err = repo.GetVideoRecordByID(ctx, v.ID)
	if err != nil {
		t.Fatalf("Failed to fetch after raw object update: %v", err)
	}
	if fetched.RawObject != newRaw {
		t.Errorf("Expected raw object %q, got %q", newRaw, fetched.RawObject)
	}
}
