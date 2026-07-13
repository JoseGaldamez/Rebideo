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
		// Self-healing fallback chain: If it's an AV1 video and standard libaom-av1 decoding failed,
		// try software 'dav1d' first (standard in production), then Nvidia hardware acceleration.
		if strings.Contains(string(output), "libaom-av1") || strings.Contains(string(output), "av1") {
			log.Printf("transcoder: detection of AV1 decoding issue. Attempting fallback chain...")
			
			// Fallback 1: Try software decoder 'dav1d' (great for CPU-only production containers)
			log.Printf("transcoder: trying software 'dav1d' decoder fallback...")
			dav1dCmd := exec.Command("ffmpeg",
				"-c:v", "dav1d",
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
			dav1dCmd.Dir = tempDir
			dav1dOutput, dav1dErr := dav1dCmd.CombinedOutput()
			if dav1dErr == nil {
				log.Printf("transcoder: HLS transcoding completed successfully using dav1d software fallback!")
				output = dav1dOutput
				err = nil
			} else {
				log.Printf("transcoder: dav1d software fallback failed: %v. Trying Nvidia hardware fallback...", dav1dErr)
				
				// Fallback 2: Try Nvidia CUVID AV1 hardware decoder (great for local GPU development)
				cuvidCmd := exec.Command("ffmpeg",
					"-c:v", "av1_cuvid",
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
				cuvidCmd.Dir = tempDir
				cuvidOutput, cuvidErr := cuvidCmd.CombinedOutput()
				if cuvidErr == nil {
					log.Printf("transcoder: HLS transcoding completed successfully using av1_cuvid hardware fallback!")
					output = cuvidOutput
					err = nil
				} else {
					log.Printf("transcoder: av1_cuvid hardware fallback failed: %v, output: %s", cuvidErr, string(cuvidOutput))
					return fmt.Errorf("ffmpeg conversion failed: %w", err)
				}
			}
		} else {
			return fmt.Errorf("ffmpeg conversion failed: %w", err)
		}
	}
	log.Printf("transcoder: HLS transcoding completed successfully")

	// Generate thumbnail frame at 5-second mark
	log.Printf("transcoder: extracting thumbnail frame at 5s from %s...", localInputFile)
	thumbCmd := exec.Command("ffmpeg",
		"-y",
		"-ss", "00:00:05",
		"-i", "input.mp4",
		"-vframes", "1",
		"-q:v", "2",
		"thumbnail.jpg",
	)
	thumbCmd.Dir = tempDir

	if thumbOutput, thumbErr := thumbCmd.CombinedOutput(); thumbErr != nil {
		log.Printf("transcoder: warning: failed to extract thumbnail: %v (output: %s). Trying AV1 fallback chain...", thumbErr, string(thumbOutput))
		
		// Fallback 1: dav1d software
		dav1dThumbCmd := exec.Command("ffmpeg",
			"-y",
			"-c:v", "dav1d",
			"-ss", "00:00:05",
			"-i", "input.mp4",
			"-vframes", "1",
			"-q:v", "2",
			"thumbnail.jpg",
		)
		dav1dThumbCmd.Dir = tempDir
		if _, dav1dThumbErr := dav1dThumbCmd.CombinedOutput(); dav1dThumbErr == nil {
			log.Printf("transcoder: thumbnail extracted successfully using dav1d software fallback")
		} else {
			log.Printf("transcoder: warning: dav1d fallback for thumbnail failed: %v. Trying av1_cuvid...", dav1dThumbErr)
			
			// Fallback 2: av1_cuvid hardware
			fallbackThumbCmd := exec.Command("ffmpeg",
				"-y",
				"-c:v", "av1_cuvid",
				"-ss", "00:00:05",
				"-i", "input.mp4",
				"-vframes", "1",
				"-q:v", "2",
				"thumbnail.jpg",
			)
			fallbackThumbCmd.Dir = tempDir
			if fallbackThumbOutput, fallbackThumbErr := fallbackThumbCmd.CombinedOutput(); fallbackThumbErr != nil {
				log.Printf("transcoder: warning: av1_cuvid fallback for thumbnail failed: %v (output: %s)", fallbackThumbErr, string(fallbackThumbOutput))
			} else {
				log.Printf("transcoder: thumbnail extracted successfully using av1_cuvid fallback")
			}
		}
	} else {
		log.Printf("transcoder: thumbnail extracted successfully as thumbnail.jpg")
	}

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
		} else if strings.HasSuffix(file.Name(), ".jpg") || strings.HasSuffix(file.Name(), ".jpeg") {
			contentType = "image/jpeg"
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
