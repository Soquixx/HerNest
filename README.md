# HerNest · recHERsion 2026 PS2 prototype

A lightweight, local-first evidence-to-action prototype for online-abuse scenarios. It is a hackathon demo, not a legal service, emergency service, or certified evidence-preservation tool.

## Run locally (Windows)

### 1) Frontend

```powershell
cd frontend
npm install
npm test
npm run dev
```

`npm install` runs the `postinstall` script that copies the pinned Tesseract.js worker, core variants, and English/Hindi/Telugu language files into `frontend/public/ocr`. The app has no CDN fallback for OCR. If asset setup fails, read the error rather than bypassing it. `npm install` (not `npm ci`) is used because the ZIP intentionally omits a generated lockfile.

### 2) Backend (optional, synthetic demo only)

In a second terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/docs`. No database is needed. Without `GEMINI_API_KEY`, the endpoint uses conservative rule-based suggestions. Optional Gemini analysis is restricted in the UI to synthetic content. Never send real survivor evidence to an unpaid AI service. Do not launch the Gemini endpoint as a public consumer-facing feature until you confirm the use case is permitted by current API terms; the current terms describe the API as intended for professional/business use rather than consumer use.

## Verify

Frontend tests: `cd frontend && npm test`

Backend tests: `cd backend && python -m pytest -q`

A usability test protocol for 3–5 students is in `docs/usability-test-script.md`. It has **not** been conducted yet; fill in results only after real tests with synthetic content.

## Key implementation choices

- Screenshot OCR is crop-first: users draw a message box, or use the experimental bubble detector and OCR candidates in batches of up to 25. OCR crops retain source-image pixel coordinates and explicit sender side.
- Screenshot OCR results are appended, not passed through the WhatsApp text parser.
- Guided yes/no/not-sure questions create unconfirmed fact drafts only when each Yes is linked to a source message.
- Cases are not stored on the backend. Hashing, OCR, review, routing and PDF export run in the browser.
- Reporting routes are selected by confirmed tags and explicit immediate-danger input. Legal sections are not auto-assigned.
- Quick exit needs confirmation / two Escape presses and clearly notes it cannot erase external copies, browser history, downloads, or screenshots.
- The API's in-memory rate limit is only for a single prototype process; use a shared or edge limiter before public launch.
# HerNest
your evidence.your voice.your next step
