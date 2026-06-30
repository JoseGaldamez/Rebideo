package pubsub

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	gpubsub "cloud.google.com/go/pubsub"
	"github.com/JoseGaldamez/rebideo-transcoder-service/internal/api"
	"github.com/JoseGaldamez/rebideo-transcoder-service/internal/transcoder"
)

var concurrencySem chan struct{}

// InitConcurrency initializes the concurrency semaphore for throttling active transcoding jobs.
func InitConcurrency(max int) {
	log.Printf("pubsub: initialized concurrency semaphore with max %d concurrent jobs", max)
	concurrencySem = make(chan struct{}, max)
}

type GCSObjectEvent struct {
	Name   string `json:"name"`
	Bucket string `json:"bucket"`
}

type pubsubPushRequest struct {
	Message struct {
		Data       string            `json:"data"` // base64 encoded
		Attributes map[string]string `json:"attributes"`
		MessageID  string            `json:"messageId"`
	} `json:"message"`
	Subscription string `json:"subscription"`
}

// StartLocalPullLoop checks if the topic/sub exist and runs the pulling loop.
func StartLocalPullLoop(ctx context.Context, projectID, topicID, subID string) {
	client, err := gpubsub.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("pubsub: failed to create client: %v", err)
	}
	defer client.Close()

	// Ensure topic and subscription exist (emulator only)
	topic := client.Topic(topicID)
	topicExists, err := topic.Exists(ctx)
	if err != nil {
		log.Fatalf("pubsub: failed to check topic: %v", err)
	}
	if !topicExists {
		log.Printf("pubsub: creating local topic: %s", topicID)
		topic, err = client.CreateTopic(ctx, topicID)
		if err != nil {
			log.Fatalf("pubsub: failed to create topic: %v", err)
		}
	}

	sub := client.Subscription(subID)
	subExists, err := sub.Exists(ctx)
	if err != nil {
		log.Fatalf("pubsub: failed to check subscription: %v", err)
	}
	if !subExists {
		log.Printf("pubsub: creating local subscription: %s", subID)
		_, err = client.CreateSubscription(ctx, subID, gpubsub.SubscriptionConfig{
			Topic:       topic,
			AckDeadline: 60 * time.Second,
		})
		if err != nil {
			log.Fatalf("pubsub: failed to create subscription: %v", err)
		}
	}

	log.Printf("pubsub: listening for messages on subscription '%s'...", subID)
	err = sub.Receive(ctx, func(receiveCtx context.Context, msg *gpubsub.Message) {
		log.Printf("pubsub: received message ID %s", msg.ID)

		err := handlePubSubPayload(receiveCtx, msg.Data)
		if err != nil {
			log.Printf("pubsub: error processing message: %v", err)
			msg.Nack()
		} else {
			log.Printf("pubsub: successfully processed message ID %s", msg.ID)
			msg.Ack()
		}
	})
	if err != nil && ctx.Err() == nil {
		log.Fatalf("pubsub: receive error: %v", err)
	}
}

// StartWebhookServer starts the HTTP server listening on the specified port.
func StartWebhookServer(port string) {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /pubsub", handleWebhook)
	mux.HandleFunc("POST /", handleWebhook)
	mux.HandleFunc("GET /health", handleHealth)

	addr := ":" + port
	log.Printf("pubsub: listening for webhooks on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("pubsub: server error: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	var req pubsubPushRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}

	decodedData, err := base64.StdEncoding.DecodeString(req.Message.Data)
	if err != nil {
		http.Error(w, "failed to decode base64 message data", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	err = handlePubSubPayload(ctx, decodedData)
	if err != nil {
		log.Printf("pubsub: webhook error processing event: %v", err)
		http.Error(w, fmt.Sprintf("processing error: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Acknowledged"))
}

func handlePubSubPayload(ctx context.Context, data []byte) error {
	var event GCSObjectEvent
	if err := json.Unmarshal(data, &event); err != nil {
		log.Printf("pubsub: failed to unmarshal GCS object metadata: %v. Body was: %s", err, string(data))
		return nil
	}

	if event.Name == "" || event.Bucket == "" {
		log.Printf("pubsub: event metadata is missing name or bucket: %+v", event)
		return nil
	}

	parts := strings.Split(event.Name, "/")
	if len(parts) < 3 || parts[0] != "videos" {
		log.Printf("pubsub: ignoring object %s because it is not under 'videos/{id}/'", event.Name)
		return nil
	}

	videoID := parts[1]
	log.Printf("pubsub: starting processing for video ID %s", videoID)

	// Throttling via concurrency semaphore
	if concurrencySem != nil {
		select {
		case concurrencySem <- struct{}{}:
			defer func() { <-concurrencySem }()
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	// Update status to processing
	log.Printf("pubsub: updating status to processing for video %s", videoID)
	if err := api.UpdateVideoStatus(videoID, "processing"); err != nil {
		return fmt.Errorf("failed to set status to processing: %w", err)
	}

	// Process transcoding
	err := transcoder.ProcessVideo(ctx, event.Bucket, event.Name, videoID)
	if err != nil {
		log.Printf("pubsub: transcoding failed for video %s: %v", videoID, err)
		if setErr := api.UpdateVideoStatus(videoID, "failed"); setErr != nil {
			log.Printf("pubsub: failed to set status to failed: %v", setErr)
		}
		return err
	}

	// Update status to active
	log.Printf("pubsub: updating status to active for video %s", videoID)
	if err := api.UpdateVideoStatus(videoID, "active"); err != nil {
		return fmt.Errorf("failed to set status to active: %w", err)
	}

	log.Printf("pubsub: completed processing for video ID %s", videoID)
	return nil
}
