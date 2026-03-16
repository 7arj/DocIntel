package handlers

import (
	"encoding/json"
	"net/http"

	"docintel-backend/storage"

	"github.com/gorilla/mux"
)

// GetDocument handles GET /document/:id — returns raw document text and metadata
func GetDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	doc, ok := storage.Default.GetDocument(id)
	if !ok {
		http.Error(w, `{"error":"document not found"}`, http.StatusNotFound)
		return
	}

	analysis, _ := storage.Default.GetAnalysis(id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       doc.ID,
		"filename": doc.Filename,
		"text":     doc.Text,
		"analysis": analysis,
	})
}

// ListDocuments handles GET /documents — returns list of all uploaded documents
func ListDocuments(w http.ResponseWriter, r *http.Request) {
	docs := storage.Default.ListDocuments()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}
