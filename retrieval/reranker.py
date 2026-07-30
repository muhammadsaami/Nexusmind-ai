"""
PHASE 4 — RERANKING MODULE
=============================
Takes the top results from hybrid search and re-scores them using a
cross-encoder model, which looks at the query and chunk TOGETHER
(rather than separately) for a more precise relevance judgment.
"""

from sentence_transformers import CrossEncoder

_reranker_model = None


def _load_reranker():
    global _reranker_model
    if _reranker_model is None:
        print("Loading reranker model (first time only, may take a moment)...")
        _reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker_model


def rerank(query, retrieved_chunks, top_k=3):
    """
    retrieved_chunks: list of RetrievedChunk objects (from hybrid_retriever.py)
    Returns: same list, re-sorted by the reranker's relevance score.
    """
    model = _load_reranker()

    pairs = [[query, rc.chunk.text] for rc in retrieved_chunks]
    scores = model.predict(pairs)

    for rc, score in zip(retrieved_chunks, scores):
        rc.rerank_score = float(score)

    reranked = sorted(retrieved_chunks, key=lambda rc: rc.rerank_score, reverse=True)
    return reranked[:top_k]


if __name__ == "__main__":
    import sys, os
    sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ingestion"))
    from parser import parse_document
    from chunker import smart_chunk
    from hybrid_retriever import HybridRetriever

    print("=" * 60)
    print("PHASE 4 TEST — Reranking")
    print("=" * 60)

    parsed = parse_document("../data/sample_docs/HR Policy Manual.docx")
    chunks = smart_chunk(parsed)

    retriever = HybridRetriever()
    retriever.index(chunks)

    query = "work from home days allowed"

    print(f"\nQuery: {query}")

    hybrid_results = retriever.search(query, top_k=5)
    print("\n--- BEFORE reranking (hybrid search order) ---")
    for r in hybrid_results:
        print(f"  [hybrid={r.hybrid_score:.3f}] {r.chunk.heading_path}")

    reranked_results = rerank(query, hybrid_results, top_k=3)
    print("\n--- AFTER reranking (cross-encoder order) ---")
    for r in reranked_results:
        print(f"  [rerank={r.rerank_score:.3f}] {r.chunk.heading_path}")