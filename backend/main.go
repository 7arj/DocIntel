package main

import (
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"

	"docintel-backend/handlers"
	"docintel-backend/middleware"

	"github.com/gorilla/mux"
)

func main() {
	// Load .env file if it exists
	loadEnv(".env")

	r := mux.NewRouter()
	r.Use(middleware.CORS)

	r.HandleFunc("/upload", handlers.Upload).Methods("POST", "OPTIONS")
	r.HandleFunc("/analyze/{id}", handlers.Analyze).Methods("GET", "OPTIONS")
	r.HandleFunc("/document/{id}", handlers.GetDocument).Methods("GET", "OPTIONS")
	r.HandleFunc("/documents", handlers.ListDocuments).Methods("GET", "OPTIONS")
	r.HandleFunc("/export/{id}", handlers.Export).Methods("GET", "OPTIONS")
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	supabaseConfigured := os.Getenv("SUPABASE_URL") != ""
	if supabaseConfigured {
		log.Printf("🗄️  Supabase persistence: ENABLED")
	} else {
		log.Printf("⚠️  Supabase not configured — using in-memory storage")
	}

	log.Printf("🔒 DocIntel backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

// loadEnv reads a .env file and sets environment variables.
// Variables already set in the environment take precedence.
func loadEnv(filename string) {
	f, err := os.Open(filename)
	if err != nil {
		return // file doesn't exist — silently skip
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		// Don't override if already set (e.g. from system env or CI)
		if os.Getenv(key) == "" {
			os.Setenv(key, val)
		}
	}
}
