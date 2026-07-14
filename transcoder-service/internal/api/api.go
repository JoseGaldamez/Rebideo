package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// UpdateVideoStatus sends a PATCH request to the api-service to update the video's processing status.
func UpdateVideoStatus(videoID, status string) error {
	apiServiceURL := os.Getenv("API_SERVICE_URL")
	if apiServiceURL == "" {
		apiServiceURL = "http://127.0.0.1:8080"
	}
	url := fmt.Sprintf("%s/videos/%s/status", apiServiceURL, videoID)

	reqBody, err := json.Marshal(map[string]string{"status": status})
	if err != nil {
		return err
	}

	req, err := http.NewRequest("PATCH", url, bytes.NewReader(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	token := os.Getenv("INTERNAL_API_TOKEN")
	if token != "" {
		req.Header.Set("X-Internal-Token", token)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("status update failed: code %d, body %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// VideoMetadata represents the response structure of GET /videos/{id}.
type VideoMetadata struct {
	ID                 string `json:"id"`
	Status             string `json:"status"`
	ProcessingAttempts int    `json:"processing_attempts"`
	ErrorMessage       string `json:"error_message,omitempty"`
}

// GetVideoMetadata fetches the metadata of the video from the api-service.
func GetVideoMetadata(videoID string) (*VideoMetadata, error) {
	apiServiceURL := os.Getenv("API_SERVICE_URL")
	if apiServiceURL == "" {
		apiServiceURL = "http://127.0.0.1:8080"
	}
	url := fmt.Sprintf("%s/videos/%s", apiServiceURL, videoID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	token := os.Getenv("INTERNAL_API_TOKEN")
	if token != "" {
		req.Header.Set("X-Internal-Token", token)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("video not found")
	}

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("metadata fetch failed: code %d, body %s", resp.StatusCode, string(bodyBytes))
	}

	var meta VideoMetadata
	if err := json.NewDecoder(resp.Body).Decode(&meta); err != nil {
		return nil, err
	}

	return &meta, nil
}

// UpdateVideoStatusWithError sends a PATCH request to update the status and error message of a failed transcoding.
func UpdateVideoStatusWithError(videoID, status string, errorMsg string) error {
	apiServiceURL := os.Getenv("API_SERVICE_URL")
	if apiServiceURL == "" {
		apiServiceURL = "http://127.0.0.1:8080"
	}
	url := fmt.Sprintf("%s/videos/%s/status", apiServiceURL, videoID)

	reqBody, err := json.Marshal(map[string]string{
		"status":        status,
		"error_message": errorMsg,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest("PATCH", url, bytes.NewReader(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	token := os.Getenv("INTERNAL_API_TOKEN")
	if token != "" {
		req.Header.Set("X-Internal-Token", token)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("status update failed: code %d, body %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// UpdateVideoStatusWithThumbnail sends a PATCH request to update the status and thumbnail URL of a video.
func UpdateVideoStatusWithThumbnail(videoID, status, thumbnailURL string) error {
	apiServiceURL := os.Getenv("API_SERVICE_URL")
	if apiServiceURL == "" {
		apiServiceURL = "http://127.0.0.1:8080"
	}
	url := fmt.Sprintf("%s/videos/%s/status", apiServiceURL, videoID)

	reqBody, err := json.Marshal(map[string]string{
		"status":        status,
		"thumbnail_url": thumbnailURL,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest("PATCH", url, bytes.NewReader(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	token := os.Getenv("INTERNAL_API_TOKEN")
	if token != "" {
		req.Header.Set("X-Internal-Token", token)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("status update failed: code %d, body %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
