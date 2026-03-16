package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"docintel-backend/services"
	"docintel-backend/storage"

	"github.com/gorilla/mux"
)

// Analyze handles GET /analyze/:id — SSE endpoint streaming AI analysis
func Analyze(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	doc, ok := storage.Default.GetDocument(id)
	if !ok {
		http.Error(w, `{"error":"document not found"}`, http.StatusNotFound)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	// SSE writer function
	sendSSE := func(event, data string) error {
		select {
		case <-r.Context().Done():
			return fmt.Errorf("client disconnected")
		default:
		}
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
		flusher.Flush()
		return nil
	}

	// Send initial status
	sendSSE("status", `{"message":"Initializing intelligence analysis..."}`)

	// Run analysis
	if err := services.AnalyzeDocument(doc.ID, doc.Filename, doc.Text, sendSSE); err != nil {
		errData, _ := json.Marshal(map[string]string{"error": err.Error()})
		sendSSE("error", string(errData))
		return
	}

	sendSSE("done", `{"message":"Analysis complete"}`)
}
