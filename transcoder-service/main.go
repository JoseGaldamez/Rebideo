package main

import (
	"context"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/JoseGaldamez/rebideo-transcoder-service/internal/pubsub"
	"github.com/joho/godotenv"
)

func main() {
	// Load local .env file if it exists
	_ = godotenv.Load()

	// Verify ffmpeg exists in PATH
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		log.Fatalf("transcoder: critical error: 'ffmpeg' executable not found in your system's PATH. Please install FFmpeg (e.g. run 'choco install ffmpeg' in Windows as Admin, or download from official website) and make sure it is added to your PATH before running the service locally.")
	}

	// Initialize concurrency limit
	maxJobs := 2
	maxStr := os.Getenv("MAX_CONCURRENT_JOBS")
	if maxStr != "" {
		if val, err := strconv.Atoi(maxStr); err == nil && val > 0 {
			maxJobs = val
		}
	}
	pubsub.InitConcurrency(maxJobs)

	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "local"
	}

	projectID := os.Getenv("PROJECT_ID")
	if projectID == "" {
		projectID = os.Getenv("GOOGLE_CLOUD_PROJECT")
	}
	if projectID == "" {
		projectID = "rebideo"
	}

	log.Printf("transcoder: starting service in '%s' mode (Project ID: %s)...", appEnv, projectID)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Capture interrupt signals for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	if appEnv == "local" {
		topicID := os.Getenv("PUBSUB_TOPIC_ID")
		if topicID == "" {
			topicID = "raw-video-uploads"
		}
		subID := os.Getenv("PUBSUB_SUB_ID")
		if subID == "" {
			subID = "transcoder-sub"
		}

		go func() {
			pubsub.StartLocalPullLoop(ctx, projectID, topicID, subID)
		}()
	} else {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8081"
		}
		go func() {
			pubsub.StartWebhookServer(port)
		}()
	}

	// Wait for shutdown signal
	sig := <-sigChan
	log.Printf("transcoder: received signal %v, shutting down...", sig)
	cancel()

	// Give a brief window to finish active tasks
	time.Sleep(2 * time.Second)
	log.Println("transcoder: service stopped")
}
