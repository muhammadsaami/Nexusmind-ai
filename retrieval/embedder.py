"""
PHASE 3 (Part A) — EMBEDDING MODULE
======================================
This converts text into "embeddings" — a list of numbers that represents
the MEANING of the text. Similar-meaning sentences get similar numbers,
even if they don't share the same exact words.

Example: "time off for having a baby" and "maternity leave" will produce
very similar embeddings, even though they don't share words.
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List

_model = None


def _load_model():
    global _model
    if _model is None:
        print("Loading embedding model (first time only, may take a moment)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_texts(texts: List[str]) -> np.ndarray:
    """Converts a list of texts into embedding vectors."""
    model = _load_model()
    return np.array(model.encode(texts, normalize_embeddings=True))


def embed_query(query: str) -> np.ndarray:
    """Converts a single search query into an embedding vector."""
    return embed_texts([query])[0]


if __name__ == "__main__":
    print("=" * 60)
    print("EMBEDDER TEST")
    print("=" * 60)

    sample_texts = [
        "Employees get 26 weeks of maternity leave.",
        "Time off for having a baby is 26 weeks.",
        "The office WiFi password is on the notice board."
    ]

    embeddings = embed_texts(sample_texts)
    print(f"\nEmbedding shape: {embeddings.shape}")  # (3 texts, N dimensions)

    # Check similarity between sentence 1 and 2 (should be HIGH - same meaning)
    similarity_1_2 = np.dot(embeddings[0], embeddings[1])
    # Check similarity between sentence 1 and 3 (should be LOW - unrelated)
    similarity_1_3 = np.dot(embeddings[0], embeddings[2])

    print(f"\nSimilarity between 'maternity leave' sentences: {similarity_1_2:.3f}")
    print(f"Similarity between 'maternity leave' and 'wifi password': {similarity_1_3:.3f}")
    print("\n(Higher number = more similar in meaning. First should be much higher than second.)")