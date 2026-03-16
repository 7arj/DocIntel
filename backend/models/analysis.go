package models

import "time"

// DocumentAnalysis is the complete intelligence report for a document
type DocumentAnalysis struct {
	ID        string    `json:"id"`
	Filename  string    `json:"filename"`
	CreatedAt time.Time `json:"createdAt"`
	Summary   Summary   `json:"summary"`
	Entities  []Entity  `json:"entities"`
	RiskFlags []Flag    `json:"riskFlags"`
	Tone      string    `json:"tone"`
	RawText   string    `json:"rawText,omitempty"`
}

// Entity represents a named entity extracted from the document
type Entity struct {
	Text        string  `json:"text"`
	Type        string  `json:"type"` // PERSON | ORG | LOCATION | DATE | EVENT
	Confidence  float64 `json:"confidence"`
	Occurrences []int   `json:"occurrences"` // char offsets in source doc
}

// Summary contains the structured document summary
type Summary struct {
	Headline  string   `json:"headline"`
	KeyPoints []string `json:"keyPoints"`
	WordCount int      `json:"wordCount"`
}

// Flag represents a risk or significance flag
type Flag struct {
	Text     string `json:"text"`
	Reason   string `json:"reason"`
	Severity string `json:"severity"` // LOW | MEDIUM | HIGH
}

// DocumentRecord stores raw document + metadata
type DocumentRecord struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	Text     string `json:"text"`
	MimeType string `json:"mimeType"`
}
