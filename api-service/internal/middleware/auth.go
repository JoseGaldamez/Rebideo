package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	firebaseAuth "firebase.google.com/go/v4/auth"
)

// contextKey is an unexported type for context keys in this package,
// preventing collisions with keys defined in other packages.
type contextKey string

// ClaimsKey is the context key under which verified Firebase claims are stored.
const ClaimsKey contextKey = "claims"

// errorResponse writes a JSON error body with the given message and HTTP status code.
func errorResponse(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// AuthMiddleware validates a Bearer Firebase ID token from the Authorization header.
// On success it attaches the verified token claims to the request context
// under ClaimsKey and delegates to the next handler.
// On failure it responds with HTTP 401 and does not call the next handler.
func AuthMiddleware(authClient *firebaseAuth.Client, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			errorResponse(w, http.StatusUnauthorized, "missing or invalid authorization header")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := authClient.VerifyIDToken(r.Context(), tokenString)
		if err != nil {
			log.Printf("api: auth error verifying firebase token: %v", err)
			errorResponse(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		ctx := context.WithValue(r.Context(), ClaimsKey, token.Claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
