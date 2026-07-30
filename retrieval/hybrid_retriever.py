"""
PHASE 3 -- HYBRID RETRIEVAL MODULE
=====================================
Combines two search strategies:

DENSE (vector/embedding) search -- matches MEANING
   e.g. "how much time off for a new baby" matches "maternity leave"
   even if the exact words are different

SPARSE (BM25) search -- matches exact KEYWORDS
   e.g. "Rs. 1500" or "26 weeks" -- exact terms are matched precisely

Both scores are combined (weighted) into one "hybrid score" so we get
the strengths of both approaches.
"""

from dataclasses import dataclass
import numpy as np
from rank_bm25 import BM25Okapi
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ingestion"))

from embedder import embed_texts, embed_query


@dataclass
class RetrievedChunk:
    chunk: object
    dense_score: float
    bm25_score: float
    hybrid_score: float


class HybridRetriever:
    def __init__(self, collection_name="enterprise_docs", dense_weight=0.6):
        # ":memory:" = local, temporary vector DB (no server needed for testing)
        self.qdrant = QdrantClient(":memory:")
        self.collection_name = collection_name
        self.dense_weight = dense_weight
        self.chunks = []
        self.bm25 = None
        self._collection_created = False

    def index(self, chunks):
        """Stores chunks into both the dense (Qdrant) and sparse (BM25) indexes.
        Always recreates the collection so stale points from a previous
        (larger) document set never linger and cause index-out-of-bounds errors."""
        self.chunks = chunks
        texts = [c.text for c in chunks]

        embeddings = embed_texts(texts)
        dim = embeddings.shape[1]

        if self.qdrant.collection_exists(self.collection_name):
            self.qdrant.delete_collection(self.collection_name)
        self.qdrant.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
        self._collection_created = True

        points = [
            PointStruct(id=i, vector=embeddings[i].tolist(), payload={"chunk_id": c.chunk_id})
            for i, c in enumerate(chunks)
        ]
        self.qdrant.upsert(collection_name=self.collection_name, points=points)

        tokenized = [t.lower().split() for t in texts]
        self.bm25 = BM25Okapi(tokenized)

    def _normalize(self, scores):
        if scores.max() - scores.min() < 1e-9:
            return np.zeros_like(scores)
        return (scores - scores.min()) / (scores.max() - scores.min())

    def search(self, query, top_k=3):
        q_emb = embed_query(query)
        response = self.qdrant.query_points(
            collection_name=self.collection_name,
            query=q_emb.tolist(),
            limit=len(self.chunks),
        )
        dense_scores = np.zeros(len(self.chunks))
        for hit in response.points:
            dense_scores[hit.id] = hit.score

        bm25_scores = np.array(self.bm25.get_scores(query.lower().split()))

        norm_dense = self._normalize(dense_scores)
        norm_bm25 = self._normalize(bm25_scores)
        hybrid_scores = self.dense_weight * norm_dense + (1 - self.dense_weight) * norm_bm25

        top_indices = np.argsort(hybrid_scores)[::-1][:top_k]

        return [
            RetrievedChunk(
                chunk=self.chunks[i],
                dense_score=float(dense_scores[i]),
                bm25_score=float(bm25_scores[i]),
                hybrid_score=float(hybrid_scores[i]),
            )
            for i in top_indices
        ]


if __name__ == "__main__":
    sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ingestion"))
    from parser import parse_document
    from chunker import smart_chunk

    print("=" * 60)
    print("PHASE 3 TEST -- Hybrid Retrieval")
    print("=" * 60)

    parsed = parse_document("../data/sample_docs/HR Policy Manual.docx")
    chunks = smart_chunk(parsed)

    retriever = HybridRetriever()
    retriever.index(chunks)

    test_queries = [
        "How much leave do I get for having a baby?",
        "internet bill reimbursement limit",
        "work from home days allowed",
    ]

    for q in test_queries:
        print(f"\nQuery: {q}")
        results = retriever.search(q, top_k=2)
        for r in results:
            print(f"  [hybrid={r.hybrid_score:.3f} dense={r.dense_score:.3f} bm25={r.bm25_score:.3f}] "
                  f"{r.chunk.heading_path}")
            print(f"     -> {r.chunk.text[:90]}...")