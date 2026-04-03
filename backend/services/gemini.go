package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"docintel-backend/models"
	"docintel-backend/storage"
)

const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent"

type geminiRequest struct {
	Contents         []geminiContent        `json:"contents"`
	SystemInstruction *geminiContent        `json:"systemInstruction,omitempty"`
	GenerationConfig  geminiGenerationConfig `json:"generationConfig"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
	Role  string       `json:"role,omitempty"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiGenerationConfig struct {
	ResponseMimeType string `json:"responseMimeType"`
	Temperature      float64 `json:"temperature"`
	MaxOutputTokens  int    `json:"maxOutputTokens"`
}

type geminiStreamResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error,omitempty"`
}

// SSEWriter is a callback for sending SSE events
type SSEWriter func(event, data string) error

const systemPrompt = `You are an elite document intelligence analyst with expertise in entity extraction, risk assessment, and document analysis. You operate with the precision of an intelligence agency analyst.

Analyze the provided document and return a COMPLETE, VALID JSON object matching EXACTLY this schema:
{
  "id": "string",
  "filename": "string", 
  "createdAt": "string (ISO 8601)",
  "tone": "string (e.g. NEUTRAL, ALARMING, OPTIMISTIC, FORMAL, URGENT, CLASSIFIED)",
  "summary": {
    "headline": "string (one powerful sentence summarizing the document)",
    "keyPoints": ["string", "..."],
    "wordCount": number
  },
  "entities": [
    {
      "text": "string",
      "type": "PERSON|ORG|LOCATION|DATE|EVENT",
      "confidence": number (0.0-1.0),
      "occurrences": [number, "..."]
    }
  ],
  "riskFlags": [
    {
      "text": "string",
      "reason": "string",
      "severity": "LOW|MEDIUM|HIGH"
    }
  ]
}

RULES:
- Extract ALL named entities (people, organizations, locations, dates, events)
- Occurrences should be approximate character offsets in the original text
- Key points should be 3-7 bullet points capturing essential intelligence
- Risk flags identify any sensitive, alarming, controversial, or legally significant content
- Tone should be a single descriptive word
- Confidence scores should reflect actual text clarity and context
- Return ONLY valid JSON, no markdown, no explanation`

// AnalyzeDocument calls Gemini with streaming and emits SSE events via the writer
func AnalyzeDocument(docID, filename, text string, sendSSE SSEWriter) error {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("GEMINI_API_KEY not set")
	}

	wordCount := len(strings.Fields(text))
	userPrompt := fmt.Sprintf("Document ID: %s\nFilename: %s\nWord count: %d\n\n--- DOCUMENT START ---\n%s\n--- DOCUMENT END ---",
		docID, filename, wordCount, truncateText(text, 25000)) // Reduced context window slightly

	reqBody := geminiRequest{
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: systemPrompt + "\n\nCRITICAL: You MUST strictly limit your response to maximum 15 most important Entities and 5 most important Risk Flags. DO NOT output more than this or the JSON will be truncated and broken."}},
		},
		Contents: []geminiContent{
			{
				Role:  "user",
				Parts: []geminiPart{{Text: userPrompt}},
			},
		},
		GenerationConfig: geminiGenerationConfig{
			ResponseMimeType: "application/json",
			Temperature:      0.1,
			MaxOutputTokens:  8192,
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := geminiEndpoint + "?key=" + apiKey + "&alt=sse"
	resp, err := http.Post(url, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to call Gemini: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		errStr := fmt.Sprintf("Gemini API error %d: %s", resp.StatusCode, string(body))
		fmt.Println("--------------------------------------------------")
		fmt.Println("❌ GEMINI API ERROR TRIGGERED ❌")
		fmt.Println("Request URL:", url)
		fmt.Println("Response Status:", resp.StatusCode)
		fmt.Println("Response Body:", string(body))
		fmt.Println("--------------------------------------------------")
		return fmt.Errorf("%s", errStr)
	}

	// Stream the response
	var accumulated strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		jsonData := strings.TrimPrefix(line, "data: ")
		if jsonData == "[DONE]" {
			break
		}

		var streamResp geminiStreamResponse
		if err := json.Unmarshal([]byte(jsonData), &streamResp); err != nil {
			continue
		}

		if streamResp.Error != nil {
			fmt.Printf("❌ GEMINI API STREAM ERROR: [%d %s] %s\n", streamResp.Error.Code, streamResp.Error.Status, streamResp.Error.Message)
			break
		}

		for _, candidate := range streamResp.Candidates {
			for _, part := range candidate.Content.Parts {
				accumulated.WriteString(part.Text)
				// Send progress event
				if err := sendSSE("chunk", part.Text); err != nil {
					return err
				}
			}
			
			// If Gemini signals completion or abort
			if candidate.FinishReason != "" {
				if candidate.FinishReason != "STOP" {
					fmt.Println("⚠️ GEMINI ABORTED STREAM WITH REASON:", candidate.FinishReason)
				}
				return parseAndEmitStructured(accumulated.String(), docID, filename, sendSSE)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Println("❌ SCANNER ERROR READING STREAM:", err)
	}

	// Fallback: try parsing what we have
	if accumulated.Len() > 0 {
		return parseAndEmitStructured(accumulated.String(), docID, filename, sendSSE)
	}

	return scanner.Err()
}

// parseAndEmitStructured parses the accumulated JSON and emits structured SSE events
func parseAndEmitStructured(rawJSON, docID, filename string, sendSSE SSEWriter) error {
	// Clean up any markdown code blocks if present
	cleaned := strings.TrimSpace(rawJSON)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var analysis models.DocumentAnalysis
	if err := json.Unmarshal([]byte(cleaned), &analysis); err != nil {
		
		// Attempt robust JSON repair for abrupt stream cutoffs
		repaired := false
		
		suffixes := []string{
			"", "}", "]}", "}]}", "}]}]}", "}]}]}]}", "}]}]}]}]}",
		}
		
		// Try truncating up to 150 characters from the end to strip hanging keys/commas
		for drop := 0; drop < 150 && drop < len(cleaned); drop++ {
			testStr := cleaned[:len(cleaned)-drop]
			testStr = strings.TrimRight(testStr, " \n\r\t,:")
			
			for _, suf := range suffixes {
				if err2 := json.Unmarshal([]byte(testStr+suf), &analysis); err2 == nil {
					repaired = true
					break
				}
				if err2 := json.Unmarshal([]byte(testStr+"\""+suf), &analysis); err2 == nil {
					repaired = true
					break
				}
			}
			if repaired {
				break
			}
		}

		if !repaired {
			fmt.Println("❌ FAILED TO PARSE JSON. RAW CONTENT DUMP:")
			fmt.Println("--------------------------------------------------")
			fmt.Println(cleaned)
			fmt.Println("--------------------------------------------------")
			return fmt.Errorf("failed to parse Gemini response: unexpected end of JSON input")
		}
	}

	// Ensure ID and filename are set
	analysis.ID = docID
	analysis.Filename = filename

	// Emit each key point individually for streaming effect
	for i, kp := range analysis.Summary.KeyPoints {
		kpData, _ := json.Marshal(map[string]interface{}{"index": i, "text": kp})
		if err := sendSSE("keypoint", string(kpData)); err != nil {
			return err
		}
	}

	// Emit each entity
	for _, entity := range analysis.Entities {
		entityData, _ := json.Marshal(entity)
		if err := sendSSE("entity", string(entityData)); err != nil {
			return err
		}
	}

	// Emit each risk flag
	for _, flag := range analysis.RiskFlags {
		flagData, _ := json.Marshal(flag)
		if err := sendSSE("flag", string(flagData)); err != nil {
			return err
		}
	}

	// Save the completed analysis to storage (Supabase or memory)
	if err := storage.Default.SaveAnalysis(&analysis); err != nil {
		fmt.Printf("Warning: failed to save analysis to storage: %v\n", err)
	}

	// Emit complete analysis
	completeData, _ := json.Marshal(analysis)
	if err := sendSSE("complete", string(completeData)); err != nil {
		return err
	}

	return nil
}

func truncateText(text string, maxChars int) string {
	runes := []rune(text)
	if len(runes) <= maxChars {
		return text
	}
	return string(runes[:maxChars]) + "\n\n[Document truncated for analysis...]"
}
