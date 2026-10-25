from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_does_not_claim_storage():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["storage"] == "none"


def test_demo_requires_explicit_mode():
    response = client.post(
        "/api/demo/analyze",
        json={"transcript": "I will share your private photo unless you pay."},
    )
    assert response.status_code == 422


def test_demo_fallback_flags_coercion_but_not_refusal_as_stalking(monkeypatch):
    monkeypatch.setattr("app.main.GEMINI_API_KEY", "")
    response = client.post(
        "/api/demo/analyze",
        json={
            "mode": "synthetic_demo",
            "transcript": "Unknown: I will share your private photo unless you pay me. Me: Stop contacting me.",
            "language": "English",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "synthetic_demo"
    assert [fact["category"] for fact in body["facts"]] == ["sextortion"]
    assert "Stop contacting me" not in body["facts"][0]["evidence_quote"]
    assert "not legal advice" in body["disclaimer"].lower()


def test_explicit_repeated_contact_can_be_suggested_as_stalking(monkeypatch):
    monkeypatch.setattr("app.main.GEMINI_API_KEY", "")
    response = client.post(
        "/api/demo/analyze",
        json={
            "mode": "synthetic_demo",
            "transcript": "Me: Stop contacting me. Unknown: I kept messaging you after you told me to stop.",
            "language": "English",
        },
    )
    assert response.status_code == 200
    assert any(fact["category"] == "stalking" for fact in response.json()["facts"])


def test_transcript_size_is_bounded():
    response = client.post(
        "/api/demo/analyze",
        json={"mode": "synthetic_demo", "transcript": "x" * 12001, "language": "English"},
    )
    assert response.status_code == 422


def test_demo_rate_limited_per_client(monkeypatch):
    from app import main
    main._RATE_BUCKETS.clear()
    monkeypatch.setattr(main, "RATE_LIMIT_MAX_REQUESTS", 1)
    monkeypatch.setattr(main, "RATE_LIMIT_WINDOW_SECONDS", 60)
    payload = {"mode": "synthetic_demo", "transcript": "I will share your private photo unless you pay me.", "language": "English"}
    assert client.post("/api/demo/analyze", json=payload).status_code == 200
    limited = client.post("/api/demo/analyze", json=payload)
    assert limited.status_code == 429
    assert "Retry-After" in limited.headers
    main._RATE_BUCKETS.clear()


def test_rate_limiter_expires_old_entries(monkeypatch):
    from app import main
    main._RATE_BUCKETS.clear()
    monkeypatch.setattr(main, "RATE_LIMIT_MAX_REQUESTS", 1)
    monkeypatch.setattr(main, "RATE_LIMIT_WINDOW_SECONDS", 10)
    main._check_rate_limit("test-client", now=100.0)
    try:
        main._check_rate_limit("test-client", now=105.0)
    except Exception as error:
        assert getattr(error, "status_code", None) == 429
    else:
        raise AssertionError("Expected request inside the window to be rate limited")
    main._check_rate_limit("test-client", now=111.0)
    main._RATE_BUCKETS.clear()


def test_gemini_key_sent_in_header_not_url(monkeypatch):
    import asyncio
    from app import main

    captured = {}

    class FakeResponse:
        status_code = 200
        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": '{"incident_summary":"Synthetic only","facts":[],"suggested_next_steps":[]}'}]}}]}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc, tb):
            return False
        async def post(self, url, json, headers):
            captured["url"] = url
            captured["headers"] = headers
            return FakeResponse()

    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-secret-key")
    monkeypatch.setattr(main.httpx, "AsyncClient", FakeAsyncClient)
    result = asyncio.run(main._gemini_analyze("fictional synthetic transcript", "English"))
    assert result.engine == "gemini"
    assert captured["headers"]["x-goog-api-key"] == "test-secret-key"
    assert "test-secret-key" not in captured["url"]
    assert "?key=" not in captured["url"]


def test_health_exposes_configured_model_name(monkeypatch):
    from app import main
    monkeypatch.setattr(main, "GEMINI_API_KEY", "demo-key")
    monkeypatch.setattr(main, "GEMINI_MODEL", "gemini-3.5-flash-lite")
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["model"] == "gemini-3.5-flash-lite"


def test_demo_falls_back_when_gemini_provider_errors(monkeypatch):
    import asyncio
    from app import main
    from fastapi import HTTPException

    main._RATE_BUCKETS.clear()
    monkeypatch.setattr(main, "GEMINI_API_KEY", "test-key")

    async def fail_provider(transcript, language):
        raise HTTPException(status_code=502, detail="provider unavailable")

    monkeypatch.setattr(main, "_gemini_analyze", fail_provider)
    response = client.post(
        "/api/demo/analyze",
        json={
            "mode": "synthetic_demo",
            "transcript": "Unknown: I will share your private photo unless you pay me.",
            "language": "English",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["engine"] == "rule_fallback"
    assert "Gemini was unavailable" in body["incident_summary"]
    main._RATE_BUCKETS.clear()
