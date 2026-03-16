package storage

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"

	"docintel-backend/models"
)

// ─────────────────────────────────────────────────────────────
//  Supabase REST storage with in-memory fallback
// ─────────────────────────────────────────────────────────────

type Store struct {
	supabaseURL string
	supabaseKey string
	useSupabase bool

	// In-memory fallback
	mu       sync.RWMutex
	docs     map[string]*models.DocumentRecord
	analyses map[string]*models.DocumentAnalysis
}

var Default *Store

func init() {
	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_ANON_KEY")
	Default = &Store{
		supabaseURL: url,
		supabaseKey: key,
		useSupabase: url != "" && key != "",
		docs:        make(map[string]*models.DocumentRecord),
		analyses:    make(map[string]*models.DocumentAnalysis),
	}
}

// ── Document operations ──────────────────────────────────────

func (s *Store) SaveDocument(doc *models.DocumentRecord) error {
	if s.useSupabase {
		return s.supabaseUpsert("documents", map[string]interface{}{
			"id":         doc.ID,
			"filename":   doc.Filename,
			"text":       doc.Text,
			"mime_type":  doc.MimeType,
			"created_at": time.Now().UTC().Format(time.RFC3339),
		})
	}
	s.mu.Lock()
	s.docs[doc.ID] = doc
	s.mu.Unlock()
	return nil
}

func (s *Store) GetDocument(id string) (*models.DocumentRecord, bool) {
	if s.useSupabase {
		rows, err := s.supabaseSelect("documents", "id=eq."+id)
		if err != nil || len(rows) == 0 {
			return nil, false
		}
		return rowToDocument(rows[0]), true
	}
	s.mu.RLock()
	doc, ok := s.docs[id]
	s.mu.RUnlock()
	return doc, ok
}

func (s *Store) ListDocuments() []*models.DocumentRecord {
	if s.useSupabase {
		rows, err := s.supabaseSelectSorted("documents", "created_at", "desc", 20)
		if err != nil {
			return nil
		}
		docs := make([]*models.DocumentRecord, 0, len(rows))
		for _, r := range rows {
			docs = append(docs, rowToDocument(r))
		}
		return docs
	}
	s.mu.RLock()
	docs := make([]*models.DocumentRecord, 0, len(s.docs))
	for _, d := range s.docs {
		docs = append(docs, d)
	}
	s.mu.RUnlock()
	return docs
}

// ── Analysis operations ──────────────────────────────────────

func (s *Store) SaveAnalysis(a *models.DocumentAnalysis) error {
	if s.useSupabase {
		summaryJSON, _ := json.Marshal(a.Summary)
		entitiesJSON, _ := json.Marshal(a.Entities)
		flagsJSON, _ := json.Marshal(a.RiskFlags)
		return s.supabaseUpsert("analyses", map[string]interface{}{
			"id":         a.ID,
			"filename":   a.Filename,
			"created_at": a.CreatedAt.UTC().Format(time.RFC3339),
			"tone":       a.Tone,
			"summary":    json.RawMessage(summaryJSON),
			"entities":   json.RawMessage(entitiesJSON),
			"risk_flags": json.RawMessage(flagsJSON),
		})
	}
	s.mu.Lock()
	s.analyses[a.ID] = a
	s.mu.Unlock()
	return nil
}

func (s *Store) GetAnalysis(id string) (*models.DocumentAnalysis, bool) {
	if s.useSupabase {
		rows, err := s.supabaseSelect("analyses", "id=eq."+id)
		if err != nil || len(rows) == 0 {
			return nil, false
		}
		a, err := rowToAnalysis(rows[0])
		if err != nil {
			return nil, false
		}
		return a, true
	}
	s.mu.RLock()
	a, ok := s.analyses[id]
	s.mu.RUnlock()
	return a, ok
}

// ── Supabase REST helpers ────────────────────────────────────

func (s *Store) supabaseUpsert(table string, data interface{}) error {
	body, err := json.Marshal(data)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("%s/rest/v1/%s", s.supabaseURL, table)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	s.setHeaders(req)
	req.Header.Set("Prefer", "resolution=merge-duplicates")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase upsert failed (%d): %s", resp.StatusCode, string(b))
	}
	return nil
}

func (s *Store) supabaseSelect(table, filter string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/rest/v1/%s?%s", s.supabaseURL, table, filter)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	s.setHeaders(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("supabase select failed (%d): %s", resp.StatusCode, string(b))
	}

	var rows []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *Store) supabaseSelectSorted(table, orderCol, direction string, limit int) ([]map[string]interface{}, error) {
	filter := fmt.Sprintf("order=%s.%s&limit=%d", orderCol, direction, limit)
	return s.supabaseSelect(table, filter)
}

func (s *Store) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.supabaseKey)
	req.Header.Set("Authorization", "Bearer "+s.supabaseKey)
}

// ── Row converters ───────────────────────────────────────────

func rowToDocument(row map[string]interface{}) *models.DocumentRecord {
	return &models.DocumentRecord{
		ID:       str(row["id"]),
		Filename: str(row["filename"]),
		Text:     str(row["text"]),
		MimeType: str(row["mime_type"]),
	}
}

func rowToAnalysis(row map[string]interface{}) (*models.DocumentAnalysis, error) {
	a := &models.DocumentAnalysis{
		ID:       str(row["id"]),
		Filename: str(row["filename"]),
		Tone:     str(row["tone"]),
	}
	if t, ok := row["created_at"].(string); ok {
		parsed, _ := time.Parse(time.RFC3339, t)
		a.CreatedAt = parsed
	}

	// Unmarshal JSONB fields
	if err := unmarshalJSONB(row["summary"], &a.Summary); err != nil {
		return nil, err
	}
	if err := unmarshalJSONB(row["entities"], &a.Entities); err != nil {
		return nil, err
	}
	if err := unmarshalJSONB(row["risk_flags"], &a.RiskFlags); err != nil {
		return nil, err
	}
	return a, nil
}

func unmarshalJSONB(v interface{}, target interface{}) error {
	if v == nil {
		return nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, target)
}

func str(v interface{}) string {
	if v == nil {
		return ""
	}
	s, _ := v.(string)
	return s
}
