package services

import (
	"bytes"
	"io"
	"regexp"
	"strings"

	"github.com/dslipak/pdf"
)

// Regex to heuristically insert spaces in text extracted without them
// e.g. "SoftwareEngineer" -> "Software Engineer"
var (
	reCamelCase = regexp.MustCompile(`([a-z])([A-Z])`)
	reNumAlpha  = regexp.MustCompile(`([0-9])([A-Za-z])`)
	reAlphaNum  = regexp.MustCompile(`([A-Za-z])([0-9])`)
)

// ExtractText extracts plain text from a file.
// If the content looks like a PDF (starts with %PDF), it uses dslipak/pdf.
// Otherwise it returns the content as-is.
func ExtractText(content []byte, filename string) (string, error) {
	lower := strings.ToLower(filename)
	if strings.HasSuffix(lower, ".pdf") || (len(content) > 4 && string(content[:4]) == "%PDF") {
		return extractPDFText(content)
	}
	// Plain text / markdown / txt
	return string(content), nil
}

// extractPDFText uses dslipak/pdf to extract text from PDF bytes
func extractPDFText(content []byte) (string, error) {
	reader := bytes.NewReader(content)
	pdfReader, err := pdf.NewReader(reader, int64(len(content)))
	if err != nil {
		return "", err
	}

	var sb strings.Builder
	numPages := pdfReader.NumPage()

	for i := 1; i <= numPages; i++ {
		page := pdfReader.Page(i)
		if page.V.IsNull() {
			continue
		}
		
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}

		// Filter out massive base64/hex inline image blobs by splitting and checking length
		var cleanWords []string
		for _, w := range strings.Fields(text) {
			if len(w) < 40 { // Normal English words never exceed 40 characters
				cleanWords = append(cleanWords, w)
			}
		}
		text = strings.Join(cleanWords, " ")

		// Apply heuristic spacing for PDFs
		text = reCamelCase.ReplaceAllString(text, "$1 $2")
		text = reNumAlpha.ReplaceAllString(text, "$1 $2")
		text = reAlphaNum.ReplaceAllString(text, "$1 $2")
		
		// Sanitize unprintable characters that disrupt LLM processing heavily
		for _, r := range text {
			if (r >= 32 && r != 127) || r == '\n' || r == '\t' {
				sb.WriteRune(r)
			}
		}
		sb.WriteString("\n\n")
	}

	return sb.String(), nil
}

// ReadAll reads all bytes from a reader
func ReadAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}
