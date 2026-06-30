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
