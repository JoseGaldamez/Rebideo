# Stage 1: Build target
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o api ./cmd/api

# Stage 2: Final runtime image
FROM alpine:3.19
RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /app/api .

EXPOSE 8080

# Run the API
CMD ["./api"]
