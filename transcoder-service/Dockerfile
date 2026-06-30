# Stage 1: Build target
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o transcoder ./main.go

# Stage 2: Final runtime image
FROM alpine:3.19
RUN apk --no-cache add ca-certificates ffmpeg

WORKDIR /root/
COPY --from=builder /app/transcoder .

EXPOSE 8081

# Run the transcoder
CMD ["./transcoder"]
