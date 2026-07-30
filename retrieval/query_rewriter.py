"""
PHASE 5 — QUERY REWRITING MODULE
====================================
Sometimes a user's question is vague, incomplete, or uses different words
than the document. This module uses an LLM (via Groq) to rewrite the
query into a clearer, more search-friendly version BEFORE we retrieve.

Example: "kitne din milte hain?" -> "How many leave days does an employee get?"
"""

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()  # reads the .env file and loads GROQ_API_KEY into environment

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found. Check your .env file.")
        _client = Groq(api_key=api_key)
    return _client


def rewrite_query(user_query: str) -> str:
    """Takes a raw user query and returns a clearer, rewritten version."""
    client = _get_client()

    prompt = f"""You are a query rewriting assistant for an HR policy search system.
Rewrite the user's question to be clearer, but keep it SHORT (under 15 words)
and stay strictly on the same topic — do not add unrelated details like
reimbursement, bonuses, or other policies unless the original question mentions them.

User question: "{user_query}"

Rewritten question:"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=60,
    )

    rewritten = response.choices[0].message.content.strip().strip('"')
    return rewritten


if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 5 TEST — Query Rewriting")
    print("=" * 60)

    test_queries = [
        "kitne din milte hain?",
        "baby hone pe chutti kitni milti hai",
        "net ka bill kitna wapis milta hai",
    ]

    for q in test_queries:
        rewritten = rewrite_query(q)
        print(f"\nOriginal:  {q}")
        print(f"Rewritten: {rewritten}")