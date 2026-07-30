"""
PHASE 8 (Part B) — AUTOMATED EVALS
======================================
This automatically tests our RAG agent against a set of known questions
and expected answers, and reports a pass/fail score -- like a "report card"
for the system's accuracy, without needing to manually test every time.
"""

import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "agent"))

from rag_agent import build_agent, setup_retriever

# ---- Test cases: question + keywords we EXPECT to see in a correct answer ----
TEST_CASES = [
    {
        "question": "How much leave do I get for having a baby?",
        "expected_keywords": ["26", "week"],
    },
    {
        "question": "How many days of sick leave are employees entitled to?",
        "expected_keywords": ["12", "day"],
    },
    {
        "question": "What is the internet bill reimbursement limit?",
        "expected_keywords": ["1500"],
    },
    {
        "question": "How many days can employees work from home?",
        "expected_keywords": ["2", "day"],
    },
    {
        "question": "What is the CEO's salary?",  # not in docs -> should refuse, not hallucinate
        "expected_keywords": ["couldn't find", "don't know", "rephrase"],
    },
]


def run_evals():
    print("Setting up retriever and agent...")
    setup_retriever()
    agent = build_agent()

    results = []

    for case in TEST_CASES:
        question = case["question"]
        expected = case["expected_keywords"]

        result = agent.invoke({"original_query": question})
        answer = result["final_answer"].lower()

        # PASS if ANY of the expected keywords appear in the answer
        passed = any(kw.lower() in answer for kw in expected)

        results.append({
            "question": question,
            "answer": result["final_answer"],
            "passed": passed,
        })

    return results


if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 8 TEST — Automated Evals")
    print("=" * 60)

    results = run_evals()

    passed_count = sum(1 for r in results if r["passed"])
    total = len(results)

    print(f"\n{'='*60}")
    print("EVAL REPORT")
    print("=" * 60)
    for r in results:
        status = "✅ PASS" if r["passed"] else "❌ FAIL"
        print(f"\n{status} — {r['question']}")
        print(f"   Answer: {r['answer']}")

    print(f"\n{'='*60}")
    print(f"SCORE: {passed_count}/{total} ({passed_count/total*100:.0f}%)")
    print("=" * 60)