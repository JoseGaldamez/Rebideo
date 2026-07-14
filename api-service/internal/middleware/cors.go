package middleware

import "net/http"

// CORSMiddleware maneja las cabeceras CORS para permitir peticiones cruzadas desde el frontend.
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Permitir cualquier origen en desarrollo local. En producción se puede restringir.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-goog-content-length-range")

		// Si es una petición preflight (OPTIONS), retornar 200 de inmediato.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
