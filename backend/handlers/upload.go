package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"time"

	"docintel-backend/models"
	"docintel-backend/services"
	"docintel-backend/storage"

	"github.com/google/uuid"
)

const maxUploadSize = 10 << 20 // 10 MB

// Upload handles POST /upload — accepts multipart file, returns document ID
func Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, `{"error":"file too large, max 10MB"}`, http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"no file provided"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read content
	content, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, `{"error":"failed to read file"}`, http.StatusInternalServerError)
		return
	}

	// Extract text
	text, err := services.ExtractText(content, header.Filename)
	if err != nil {
		http.Error(w, `{"error":"failed to extract text from document"}`, http.StatusBadRequest)
		return
	}

	if len(text) == 0 {
		http.Error(w, `{"error":"document appears to be empty or unreadable"}`, http.StatusBadRequest)
		return
	}

	// Generate ID and store
	id := uuid.New().String()
	doc := &models.DocumentRecord{
		ID:       id,
		Filename: header.Filename,
		Text:     text,
		MimeType: filepath.Ext(header.Filename),
	}
	if err := storage.Default.SaveDocument(doc); err != nil {
		http.Error(w, `{"error":"failed to save document"}`, http.StatusInternalServerError)
		return
	}


	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        id,
		"filename":  header.Filename,
		"wordCount": len(text),
		"createdAt": time.Now().UTC(),
	})
}
