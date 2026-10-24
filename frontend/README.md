# HerNest frontend

React + Vite prototype for a privacy-conscious digital-safety evidence-to-action assistant. Screenshot text is processed one user-selected crop at a time; OCR-derived messages are appended to the transcript and are never passed through the WhatsApp TXT parser.

## Run locally (Windows PowerShell)

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://127.0.0.1:5173`). `npm install` also runs `scripts/vendor-ocr-assets.mjs`, which copies the pinned Tesseract worker, all core variants, and English/Hindi/Telugu language data into `public/ocr`. This version deliberately has no CDN fallback for the OCR engine. If `postinstall` reports missing files, do not bypass it; check the pinned dependency versions and the contents of `node_modules`.

For the optional synthetic-data AI demo, run the FastAPI backend separately on port 8000. If deployed elsewhere, set `VITE_API_BASE_URL` before building the frontend.

## Included

- HerNest landing page, transparent logo assets, responsive layouts, and light/dark themes.
- Four-step case workflow with WhatsApp text export parsing, editable transcript, local SHA-256 hashing, redaction preview, and print-to-PDF export.
- Manual screenshot OCR: draw one box around one message, choose “Me” or “Other person”, choose English/Hindi/Telugu (including English+Hindi or English+Telugu), OCR only that crop, and retain exact crop coordinates for source highlighting.
- Optional experimental bubble candidate detection using colour/side heuristics. Inspect every candidate; manual crop selection remains the reliable fallback.
- OCR-derived messages are appended to existing messages, each with its own evidence ID, source box, and selected side. OCR output is not run through the TXT parser. A trailing timestamp is stripped before adding the message.
- Guided user questionnaire instead of sample-specific keyword hints. Each “Yes” needs a selected source message; generated drafts remain unconfirmed until the user checks them.
- Case-based reporting routes and optional primary-platform selection.
- AI analysis only for synthetic demonstration text, when the user opts in. Never send real survivor content to an unpaid AI API.
- Escape quick exit requires two presses within three seconds; the button asks for confirmation.
- Test suite covering TXT parsing, trailing-time stripping, redaction, routing and questionnaire source linkage.

## Privacy behaviour and limitations

- No case database, accounts, analytics or server-side case-file storage in this prototype. The case exists in browser memory until the page is refreshed/closed; only the theme preference is saved in localStorage.
- TXT parsing, hashing, crop OCR, evidence review and PDF generation run in the browser. The OCR engine and language files are self-hosted with the app, so first OCR loads local static assets rather than a third-party CDN.
- The optional demo-analysis endpoint accepts synthetic text only. When explicitly enabled, the user-approved fictional transcript is sent to the HerNest backend; if configured, the backend forwards it to Google Gemini. The backend API key is not included in frontend code.
- Phone/email masking is a limited preview helper and does not reliably detect names, handles, addresses, faces, or contextual identifiers. Manually review every export. Original screenshots are unchanged if attached to a PDF.
- SHA-256 supports comparison of file integrity; it does not prove authenticity or original capture time.
- Quick exit clears the current in-memory case and shows a neutral screen. It cannot erase browser history, screenshots, downloads, backups or material already shared elsewhere.
- Auto-bubble detection is experimental and can include incorrect/merged boxes. Confirm the box and correct every OCR result; do not treat the generated text as verified evidence without review.
- This hackathon prototype is not a security audit, a legal determination, or a replacement for emergency services.

## Privacy/demo verification

Open browser DevTools → Network and clear the log. Import a TXT and a screenshot. After installation, OCR should request `/ocr/worker.min.js`, files under `/ocr/core/`, and the selected `/ocr/lang/*.traineddata.gz`; no screenshot upload endpoint exists. Only after loading the synthetic sample and confirming synthetic-data consent should `/api/demo/analyze` be called. This is a demonstration check, not proof of absolute security.

## Tests

```powershell
npm test
```

## Resource routing

The portal and platform reporting routes are general. StopNCII appears only for a confirmed actual image-misuse tag, and eligibility still needs to be checked with StopNCII. Financial-fraud guidance appears only for a confirmed financial-fraud tag. Women’s Helpline 181 is offered for relevant confirmed abuse concerns. Emergency information for 112 appears only when the user explicitly selects immediate physical danger. The prototype does not geolocate users or invent nearby support centres.
