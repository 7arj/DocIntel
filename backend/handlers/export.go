package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"docintel-backend/storage"

	"github.com/gorilla/mux"
)

// Export handles GET /export/:id — returns complete analysis as downloadable JSON
func Export(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	analysis, ok := storage.Default.GetAnalysis(id)
	if !ok {
		// Check if document exists at all
		doc, docOk := storage.Default.GetDocument(id)
		if !docOk {
			http.Error(w, `{"error":"document not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, fmt.Sprintf(`{"error":"analysis not complete yet for %s"}`, doc.Filename), http.StatusAccepted)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="docintel-%s.json"`, analysis.ID[:8]))

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	encoder.Encode(analysis)
}
