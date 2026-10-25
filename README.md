# HerNest
your evidence.your voice.your next step
# HerNest API — minimal backend

This is the backend slice only. It intentionally has no database and never stores case files or screenshots.

## Endpoints

- `GET /health`: API status and whether the optional AI key is configured.
- `POST /api/demo/analyze`: structured extraction for **synthetic demo transcripts only**. A small deterministic fallback works when no AI key is configured.

The API bounds transcript input, applies a small in-memory sliding-window limit (default 5 requests per client per 60 seconds), has upstream timeouts, validates model output, and returns safe errors. The rate limiter is per process and is appropriate for a hackathon prototype, not a distributed production service. The endpoint has no uploaded files, accounts, case storage, or legal determination.

## Run locally (Windows PowerShell)

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/health` and `http://127.0.0.1:8000/docs`.

## Test

```powershell
python -m pytest -q
```

## Optional AI setup

Copy `.env.example` to `.env` and set `GEMINI_API_KEY` only for synthetic demo data. Load environment variables before starting Uvicorn. Never commit `.env`, and never put the key in frontend code. The key is sent to Google in the `x-goog-api-key` header, not a URL query string.

The default model in this repo is `gemini-3.5-flash-lite`, based on Google's current model guide at the time of this project. Google says Gemini 2.5 Flash is still served but access is limited to users who have actively used it; the guide recommends newer models for new projects. Model availability and provider terms may change. Google's unpaid API terms advise against submitting sensitive, confidential or personal information. Therefore this endpoint must receive synthetic fictional content only, even if content is redacted.

## Frontend request

`POST http://127.0.0.1:8000/api/demo/analyze`

```json
{
  "mode": "synthetic_demo",
  "transcript": "Friend: I will share your private photo unless you pay.\\nMe: Stop contacting me.",
  "language": "English"
}
```

Response includes `engine` (`rule_fallback` or `gemini`), `incident_summary`, `facts`, `suggested_next_steps`, and a disclaimer. Frontend facts remain suggestions and require source checking and user confirmation. Model output must never automatically confirm a fact or choose a legal provision.


## Rate-limit deployment note

The demo endpoint uses a small in-memory, per-process sliding-window limit (default 5 requests per 60 seconds per client address). This protects a single prototype process; it is not a distributed production abuse-control system. Before public launch, add the hosting platform's edge/API rate limiter or a shared rate-limit store, and configure trusted proxy handling intentionally.


Before exposing Gemini integration publicly, review current provider terms for this specific product use; current Gemini API Additional Terms describe API use as for professional/business purposes, not consumer use. Keep this hackathon endpoint synthetic-demo-only unless that suitability is confirmed.


## Current model and fallback

The default model is `gemini-3.5-flash-lite`, configurable through `GEMINI_MODEL`. Google currently lists this as a stable Gemini API model and recommends it or `gemini-3.8-flash` for new projects. Check the live official model page before deployment: https://ai.google.dev/gemini-api/docs/models. `GET /health` returns the configured model name without exposing the API key.

If the Gemini provider errors, times out, returns invalid JSON, or rejects a request, the endpoint falls back to the deterministic local rule engine for the same synthetic transcript. The endpoint's own rate limiter still returns HTTP 429 when the app limit is exceeded.
