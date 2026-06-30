package transcoder

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"cloud.google.com/go/storage"
)

// ProcessVideo handles downloading the raw video, transcoding it to HLS, and uploading the segments.
func ProcessVideo(ctx context.Context, bucket, objectName, videoID string) error {
	log.Printf("transcoder: setting up transcoding directory for video %s", videoID)
	tempDir, err := os.MkdirTemp("", "transcode-*")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer func() {
		log.Printf("transcoder: cleaning up temp directory: %s", tempDir)
		os.RemoveAll(tempDir)
	}()

	localInputFile := filepath.Join(tempDir, "input.mp4")

	log.Printf("transcoder: downloading raw video from gs://%s/%s...", bucket, objectName)
	storageClient, err := storage.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("create GCS client: %w", err)
	}
	defer storageClient.Close()

	rc, err := storageClient.Bucket(bucket).Object(objectName).NewReader(ctx)
	if err != nil {
		return fmt.Errorf("create GCS reader: %w", err)
	}
	defer rc.Close()

	outFile, err := os.Create(localInputFile)
	if err != nil {
		return fmt.Errorf("create local input file: %w", err)
	}

	_, err = io.Copy(outFile, rc)
	outFile.Close()
	if err != nil {
		return fmt.Errorf("download object: %w", err)
	}

	log.Printf("transcoder: raw video successfully downloaded to %s", localInputFile)

	// Verify ffmpeg exists in path
	_, err = exec.LookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("ffmpeg binary not found in PATH: please install ffmpeg before running: %w", err)
	}

	log.Printf("transcoder: running ffmpeg on %s to generate HLS segments...", localInputFile)
	cmd := exec.Command("ffmpeg",
		"-i", "input.mp4",
		"-codec:v", "libx264",
		"-preset", "fast",
		"-codec:a", "aac",
		"-b:a", "128k",
		"-f", "hls",
		"-hls_time", "6",
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", "stream_%03d.ts",
		"master.m3u8",
	)
	cmd.Dir = tempDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("transcoder: ffmpeg error output: %s", string(output))
		return fmt.Errorf("ffmpeg conversion failed: %w", err)
	}
	log.Printf("transcoder: HLS transcoding completed successfully")

	// Upload HLS output files to processed bucket
	files, err := os.ReadDir(tempDir)
	if err != nil {
		return fmt.Errorf("read temp dir: %w", err)
	}

	processedBucketName := os.Getenv("GCS_PROCESSED_BUCKET")
	if processedBucketName == "" {
		processedBucketName = "rebideo-processed-videos"
	}

	log.Printf("transcoder: uploading HLS output files to gs://%s/%s/...", processedBucketName, videoID)
	for _, file := range files {
		if file.IsDir() || file.Name() == "input.mp4" {
			continue
		}

		localFilePath := filepath.Join(tempDir, file.Name())
		objectKey := fmt.Sprintf("%s/%s", videoID, file.Name())

		contentType := "application/octet-stream"
		if strings.HasSuffix(file.Name(), ".m3u8") {
			contentType = "application/x-mpegURL"
		} else if strings.HasSuffix(file.Name(), ".ts") {
			contentType = "video/MP2T"
		}

		log.Printf("transcoder: uploading %s with content-type %s...", file.Name(), contentType)
		if err := uploadToGCS(ctx, storageClient, processedBucketName, objectKey, localFilePath, contentType); err != nil {
			return fmt.Errorf("upload %s to GCS: %w", file.Name(), err)
		}
	}

	log.Printf("transcoder: all files successfully uploaded for video %s", videoID)
	return nil
}

func uploadToGCS(ctx context.Context, client *storage.Client, bucket, key, localPath, contentType string) error {
	f, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer f.Close()

	wc := client.Bucket(bucket).Object(key).NewWriter(ctx)
	wc.ContentType = contentType

	if _, err := io.Copy(wc, f); err != nil {
		wc.Close()
		return err
	}

	return wc.Close()
}
