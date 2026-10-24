from __future__ import annotations

import json
import os
import re
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

APP_NAME = "HerNest API"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app = FastAPI(
    title=APP_NAME,
    version="0.1.0",
    description=(
        "Thin API for HerNest. It never stores cases or evidence. "
        "The AI endpoint accepts synthetic demo text only."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class HealthResponse(BaseModel):
    status: Literal["ok"]
    app: str
    ai_configured: bool
    storage: Literal["none"] = "none"


class DemoAnalyzeRequest(BaseModel):
    mode: Literal["synthetic_demo"]
    transcript: str = Field(min_length=1, max_length=12000)
    language: Literal["English", "Hindi", "Telugu"] = "English"

    @field_validator("transcript")
    @classmethod
    def require_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Transcript cannot be empty.")
        return value


class ExtractedFact(BaseModel):
    category: Literal[
        "stalking",
        "sextortion",
        "impersonation",
        "image_misuse",
        "threat",
        "financial_fraud",
        "other",
    ]
    summary: str = Field(max_length=300)
    evidence_quote: str = Field(max_length=500)
    suggested_severity: Literal["low", "moderate", "high", "urgent"]
    confidence: Literal["low", "medium", "high"]


class DemoAnalyzeResponse(BaseModel):
    mode: Literal["synthetic_demo"] = "synthetic_demo"
    incident_summary: str = Field(max_length=600)
    facts: list[ExtractedFact] = Field(max_length=12)
    suggested_next_steps: list[str] = Field(max_length=8)
    disclaimer: str = (
        "Demo output from synthetic content only. Not legal advice or a finding that a crime occurred. "
        "Verify every fact against the original evidence."
    )


SYSTEM_PROMPT = """You are an information extraction assistant for a safety hackathon demo.
The supplied transcript is fictional synthetic test data. Extract only facts explicitly supported by it.
Do not infer identity, guilt, or whether a crime legally occurred. Do not invent dates, names, quotes, laws,
or evidence. Keep any quote verbatim and short. If no supported facts exist, return an empty facts array.
Return ONLY a JSON object with this schema:
{
  "incident_summary": "short neutral summary",
  "facts": [
    {
      "category": "stalking|sextortion|impersonation|image_misuse|threat|financial_fraud|other",
      "summary": "neutral factual description",
      "evidence_quote": "exact short quote from transcript",
      "suggested_severity": "low|moderate|high|urgent",
      "confidence": "low|medium|high"
    }
  ],
  "suggested_next_steps": ["general practical step"]
}
Do not provide legal section numbers. Do not state that a report is guaranteed to be accepted.
Use the requested language for summary and next steps; keep evidence_quote exactly as written.
"""


def _evidence_units(transcript: str) -> list[str]:
    """Split pasted chats into short source units without altering their wording."""
    units: list[str] = []
    for line in transcript.splitlines():
        line = line.strip()
        if not line:
            continue
        # Handles a pasted line like "Unknown: ... pay me. Me: Stop contacting me."
        # by splitting at sentence boundaries before a likely speaker label.
        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z][A-Za-z0-9_. '\-]{0,30}:\s)", line)
        for part in parts:
            part = part.strip()
            if part:
                units.append(part)
    return units or [transcript.strip()]


def _fallback_analysis(transcript: str) -> DemoAnalyzeResponse:
    """Small deterministic fallback. Suggestions are deliberately conservative, not an AI finding."""
    units = _evidence_units(transcript)
    lower_units = [(unit, unit.lower()) for unit in units]
    all_text = "\n".join(lower for _, lower in lower_units)
    found: list[ExtractedFact] = []

    image_terms = (
        "private photo", "intimate photo", "private picture", "intimate image",
        "nude photo", "nudes", "private images", "intimate photos",
    )
    coercion_terms = (
        "pay me", "send money", "unless you pay", "or i'll share", "or i will share",
        "or i'll post", "or i will post", "otherwise i'll share", "otherwise i will share",
        "send me money", "pay or i'll", "pay or i will",
    )

    def add_fact(category: str, summary: str, quote: str, severity: str = "moderate") -> None:
        if any(f.category == category and f.evidence_quote == quote for f in found):
            return
        found.append(ExtractedFact(
            category=category,  # type: ignore[arg-type]
            summary=summary,
            evidence_quote=quote[:500],
            suggested_severity=severity,  # type: ignore[arg-type]
            confidence="low",
        ))

    # Require both an intimate/private-image cue and a coercion cue, rather than treating
    # any mention of a photo or money as sextortion.
    if any(term in all_text for term in image_terms) and any(term in all_text for term in coercion_terms):
        relevant = [
            unit for unit, lower in lower_units
            if any(term in lower for term in image_terms) or any(term in lower for term in coercion_terms)
        ]
        add_fact(
            "sextortion",
            "Potential coercion involving a private-image and payment/threat indicator; verify against the source.",
            " ".join(relevant) or "Private-image and coercion indicators detected.",
            "high",
        )

    # Mark image misuse only when the text suggests a completed sharing action AND lack of consent.
    shared_terms = ("shared your photo", "posted your photo", "uploaded your photo", "published your photo",
                    "shared the photo", "posted the image", "uploaded the image")
    consent_terms = ("without your consent", "without permission", "without your permission", "without asking you")
    if any(term in all_text for term in shared_terms) and any(term in all_text for term in consent_terms):
        relevant = [
            unit for unit, lower in lower_units
            if any(term in lower for term in shared_terms + consent_terms)
        ]
        add_fact(
            "image_misuse",
            "Potential non-consensual image-sharing indicator; verify whether the sharing occurred.",
            " ".join(relevant),
            "high",
        )

    # A request to stop is not proof of stalking. Require an explicit repeated/continued-contact indicator.
    stalking_terms = (
        "keeps contacting", "keeps messaging", "kept contacting", "kept messaging",
        "contacted me again after", "continued messaging after", "continued contacting after",
        "repeatedly contacted", "repeated messages", "keeps following", "followed me repeatedly",
        "kept following me", "contacted me repeatedly",
    )
    for unit, lower in lower_units:
        matched = next((term for term in stalking_terms if term in lower), None)
        if matched:
            add_fact(
                "stalking",
                "Potential repeated-contact indicator; verify the sequence and context of messages.",
                unit,
                "moderate",
            )
            break

    for category, terms, summary in [
        ("impersonation", ("pretending to be you", "fake account", "impersonating", "created an account using your name"),
         "Potential impersonation indicator; verify the account and context."),
        ("financial_fraud", ("asked for my otp", "share your otp", "send me your otp", "upi pin", "bank credentials", "transfer the money to"),
         "Potential financial-fraud indicator; verify the request and context."),
        ("threat", ("i will hurt", "i'll hurt", "i will come after you", "i'll come after you", "threaten to hurt"),
         "Potential threat indicator; review the exact wording and context."),
    ]:
        for unit, lower in lower_units:
            if any(term in lower for term in terms):
                add_fact(category, summary, unit, "high" if category == "threat" else "moderate")
                break

    return DemoAnalyzeResponse(
        incident_summary=(
            "Rule-based demo suggestions. Check each source quote and correct the suggestions before using them."
        ),
        facts=found,
        suggested_next_steps=[
            "Preserve original files separately and avoid editing them.",
            "Review each suggestion against the exact source messages; remove anything unsupported.",
            "Use the relevant platform reporting tools and official reporting channels if appropriate.",
        ],
    )


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("AI response did not contain a JSON object.")
    return json.loads(text[start:end + 1])


async def _gemini_analyze(transcript: str, language: str) -> DemoAnalyzeResponse:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI is not configured. Add GEMINI_API_KEY to the backend environment, or use manual mode.",
        )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"Language for summary and next steps: {language}\n\nSynthetic transcript:\n{transcript}"}
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                url,
                params={"key": GEMINI_API_KEY},
                json=payload,
                headers={"Content-Type": "application/json"},
            )
        if response.status_code == 429:
            raise HTTPException(status_code=429, detail="Demo AI rate limit reached. Use manual mode.")
        if response.status_code >= 400:
            # Do not return the provider response body; it can contain unnecessary diagnostic detail.
            raise HTTPException(status_code=502, detail="Demo AI provider request failed. Use manual mode.")
        data = response.json()
        raw = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = _extract_json(raw)
        parsed["mode"] = "synthetic_demo"
        return DemoAnalyzeResponse.model_validate(parsed)
    except HTTPException:
        raise
    except (httpx.TimeoutException, httpx.RequestError):
        raise HTTPException(status_code=504, detail="Demo AI request timed out. Use manual mode.")
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="Demo AI returned an invalid response. Use manual mode.")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", app=APP_NAME, ai_configured=bool(GEMINI_API_KEY))


@app.post("/api/demo/analyze", response_model=DemoAnalyzeResponse)
async def analyze_demo(request: DemoAnalyzeRequest) -> DemoAnalyzeResponse:
    # Explicit mode field is required. No endpoint accepts uploaded evidence or persistent case data.
    if not request.transcript.strip():
        raise HTTPException(status_code=422, detail="Transcript is required.")
    if GEMINI_API_KEY:
        return await _gemini_analyze(request.transcript, request.language)
    return _fallback_analysis(request.transcript)
