# HerNest validation plan — do not claim results before running it

## Official wording references used for Protect now

- National Cyber Crime Reporting Portal FAQ: cyber financial fraud should be reported immediately via 1930; the portal also describes online reporting routes: https://www.cybercrime.gov.in/webform/FAQ.aspx
- I4C portal advisory: report cyber fraud immediately at https://cybercrime.gov.in/ or by calling 1930: https://cybercrime.gov.in/pdf/Advisories/ADVISORY%20TAU-ADV-003DigitalArrest06.03.2025.pdf
- CERT-In security guidance recommends strong unique passwords and multi-factor authentication for account protection: https://www.cert-in.org.in/s2cMainServlet?VLCODE=CIAD-2025-0019&pageid=PUBVLNOTES02
- Cybercrime portal identifies 112 as the national police helpline and 181 as the national women helpline: https://www.cybercrime.gov.in/Webform/crmcondi.aspx/FAQ.aspx

Wording is general safety guidance, not legal advice. Recheck the official pages before a public release. The child-image reminder says not to forward or circulate material and to use official reporting channels; it does not ask users to download, duplicate, or send such material to HerNest.

## OCR test set

Ten synthetic screenshots are in `ocr-eval-samples/`, with target bubble boxes and expected text in `ground-truth.json`. They cover light/dark themes, low-resolution samples, Hindi, and Telugu. Test each by cropping only the target bubble in HerNest. Record exact text match, character error (manual or a standard CER tool), and whether the box correctly maps to the source region.

| Sample | Theme/language | Full-image baseline | Crop text exact? | Correct source box? | Notes |
|---|---|---|---|---|---|
| 01–10 | See ground-truth.json | Not run | Not run | Not run | Fill after browser testing |

Do not report a crop-vs-full-image improvement until both runs have been performed with the same Tesseract version and language data. The product intentionally exposes crop OCR, not whole-image OCR; a baseline may be run only in a separate test harness.

## Fact suggestion test

`synthetic-fact-cases.json` contains 20 fictional cases and expected conservative categories. Run the local rule fallback with:

```bash
cd backend
PYTHONPATH=. python ../docs/evaluate_synthetic_cases.py
```

On 2026-10-25, the current local fallback matched the expected category set on 20/20 curated synthetic cases (100% exact-set match). This is a small, hand-authored development suite, not a general accuracy claim and not external validation; the cases and rules are not independent. The rule fallback result does not validate the questionnaire itself; questionnaire drafts are driven by the user's answers and source selection. Do not invent Gemini results: run the same cases against Gemini only when a permitted, configured test environment is available, then record model name, date, exact-match count, false positives, false negatives, and rate-limit failures.

## Usability test with 3–5 students

Use fictional data only. Ask each participant to: (1) import a sample, (2) OCR one crop, (3) correct it, (4) mark a refusal, (5) create a fact draft, (6) find the source exhibit, and (7) export a report. Record completion without help, time, hesitation points, and their exact feedback. Ask permission before taking notes; don't collect real incidents. No student testing has been performed by the development team yet.

## Results table template

| Test | N | Completed | Main issue | Evidence |
|---|---:|---:|---|---|
| OCR samples | 10 | Not run | — | Fill from browser test |
| Synthetic fact cases | 20 | See command output | — | Save actual output with date |
| Student usability | 3–5 | Not run | — | Fill after sessions |

The SHA-256 note in the report must remain: fingerprints show a file has not changed since it was added here; they do not prove that a screenshot is genuine.
