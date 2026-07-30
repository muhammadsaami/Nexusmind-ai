"""
PHASE 8 (Part A) — PII GUARDRAILS
======================================
Detects and masks sensitive PII (names, emails, phone numbers, employee IDs)
while leaving normal business text (like policy durations) untouched.
"""

from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern

_analyzer = None
_anonymizer = None

# Only detect these -- avoids false positives like "26 weeks" -> DATE_TIME
ENTITIES_TO_MASK = ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "EMPLOYEE_ID"]


def _get_engines():
    global _analyzer, _anonymizer
    if _analyzer is None:
        print("Loading PII detection engine (first time only)...")
        from presidio_anonymizer import AnonymizerEngine

        _analyzer = AnalyzerEngine()

        # Custom recognizer: company employee IDs like "EMP-4521"
        employee_id_pattern = Pattern(name="employee_id_pattern", regex=r"\bEMP-\d{3,6}\b", score=0.9)
        employee_id_recognizer = PatternRecognizer(
            supported_entity="EMPLOYEE_ID", patterns=[employee_id_pattern]
        )
        _analyzer.registry.add_recognizer(employee_id_recognizer)

        _anonymizer = AnonymizerEngine()
    return _analyzer, _anonymizer


def mask_pii(text: str) -> str:
    """Detects and masks PII in text, restricted to specific entity types
    to avoid over-masking normal business content."""
    analyzer, anonymizer = _get_engines()

    results = analyzer.analyze(text=text, language="en", entities=ENTITIES_TO_MASK)
    anonymized = anonymizer.anonymize(text=text, analyzer_results=results)

    return anonymized.text


if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 8 TEST — PII Guardrails (tuned)")
    print("=" * 60)

    test_texts = [
        "Please contact Rahul Sharma at rahul.sharma@company.com or call 9876543210 for approval.",
        "Employees are entitled to 26 weeks of paid maternity leave.",
        "The claim was submitted by John Doe, employee ID EMP-4521.",
    ]

    for t in test_texts:
        masked = mask_pii(t)
        print(f"\nOriginal: {t}")
        print(f"Masked:   {masked}")