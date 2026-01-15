# Integromat API Backend

## System Dependencies

To support PDF processing and OCR features (using GPT-4o Vision), the system requires the following OS-level dependencies installed:

- **GraphicsMagick**
- **Ghostscript**

These are used by the `pdf2pic` library to convert PDF pages into images for AI analysis.

### Installation

**MacOS (Homebrew):**
```bash
brew install graphicsmagick ghostscript
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y graphicsmagick ghostscript
```

**Docker (Dockerfile example):**
```dockerfile
RUN apt-get update && apt-get install -y graphicsmagick ghostscript
```

## Node Dependencies

Ensure you install the project dependencies:
```bash
npm install
```

## Running Tests

To test the Vision OCR on image-based PDFs:
```bash
node test-vision-ocr.js
```
