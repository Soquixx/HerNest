"""Run the conservative local rule fallback against the bundled fictional cases.
This is a development check, not clinical/legal validation or model accuracy evidence.
"""
import json
from pathlib import Path
from app.main import _fallback_analysis

cases_path = Path(__file__).with_name('synthetic-fact-cases.json')
cases = json.loads(cases_path.read_text(encoding='utf-8'))
correct = 0
rows = []
for case in cases:
    predicted = sorted({fact.category for fact in _fallback_analysis(case['text']).facts})
    expected = sorted(case['expected_categories'])
    passed = predicted == expected
    correct += int(passed)
    rows.append({'id': case['id'], 'expected': expected, 'predicted': predicted, 'match': passed})
print(f'Exact category-set matches: {correct}/{len(cases)} ({correct / len(cases) * 100:.1f}%)')
for row in rows:
    print(f"{row['id']} {'PASS' if row['match'] else 'GAP'} expected={row['expected']} predicted={row['predicted']}")
