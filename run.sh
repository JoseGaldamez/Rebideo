#!/bin/bash

# Default action is "up"
ACTION=${1:-up}
PIDS_FILE="./.services.pids"

# Detect package manager for frontend
get_packager() {
  if command -v pnpm &> /dev/null; then
    echo "pnpm dev"
  elif command -v yarn &> /dev/null; then
    echo "yarn dev"
  elif command -v bun &> /dev/null; then
    echo "bun dev"
  else
    echo "npm run dev"
  fi
}

if [ "$ACTION" = "up" ]; then
  echo "Starting Docker Compose services..."
  docker compose up -d
  if [ $? -ne 0 ]; then
    echo "Error: Failed to start Docker Compose services."
    exit 1
  fi

  # Clear existing PIDs file
  > "$PIDS_FILE"

  echo "Starting API Service (Go)..."
  (cd api-service && go run cmd/api/main.go) > api.log 2>&1 &
  echo $! >> "$PIDS_FILE"

  echo "Starting Transcoder Service (Go)..."
  (cd transcoder-service && go run main.go) > transcoder.log 2>&1 &
  echo $! >> "$PIDS_FILE"

  echo "Starting Frontend..."
  PACKAGER=$(get_packager)
  (cd frontend && $PACKAGER) > frontend.log 2>&1 &
  echo $! >> "$PIDS_FILE"

  echo -e "\n[SUCCESS] All services started in the background."
  echo "Logs are being written to: api.log, transcoder.log, frontend.log"
  echo "To stop all services, run: ./run.sh down"

elif [ "$ACTION" = "down" ]; then
  echo "Stopping local services..."
  
  if [ -f "$PIDS_FILE" ]; then
    while read -r pid; do
      if [ -n "$pid" ]; then
        echo "Stopping process group/tree for PID $pid..."
        # Kill the parent and child processes
        pids_to_kill=$(pgrep -P "$pid" 2>/dev/null)
        kill -9 "$pid" 2>/dev/null || true
        for child in $pids_to_kill; do
          kill -9 "$child" 2>/dev/null || true
        done
      fi
    done < "$PIDS_FILE"
    rm "$PIDS_FILE"
  else
    echo "No active service PIDs file found. Proceeding to Docker shutdown."
  fi

  # Fallback: Kill lingering processes on known ports
  if command -v lsof &> /dev/null; then
    for port in 8080 3000; do
      port_pid=$(lsof -t -i :$port 2>/dev/null)
      if [ -n "$port_pid" ]; then
        echo "Cleaning up lingering process on port $port (PID: $port_pid)..."
        kill -9 "$port_pid" 2>/dev/null || true
      fi
    done
  fi

  echo "Stopping Docker Compose services..."
  docker compose down

  echo -e "\n[SUCCESS] All services stopped."

else
  echo "Usage: ./run.sh [up|down]"
  exit 1
fi
