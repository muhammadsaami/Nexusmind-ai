"""
PHASE 6 — LANGGRAPH AGENTIC WORKFLOW
========================================
This wires together everything we've built (rewrite -> retrieve -> rerank)
into an AGENT that can make a decision: if it found a confident answer,
generate one; if not, admit it doesn't know instead of hallucinating.

This is the core of "agentic AI" -- the system doesn't just follow a fixed
pipeline, it checks its own confidence and reacts accordingly (self-healing).
"""

import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ingestion"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "retrieval"))

from typing import TypedDict, List
from langgraph.graph import StateGraph, END

from parser import parse_document
from chunker import smart_chunk
from hybrid_retriever import HybridRetriever
from reranker import rerank
from query_rewriter import rewrite_query

from dotenv import load_dotenv
from groq import Groq

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "retrieval", ".env"))

CONFIDENCE_THRESHOLD = -5.0  # rerank scores above this = "confident enough" (tuned based on testing)


class AgentState(TypedDict):
    original_query: str
    rewritten_query: str
    retrieved_chunks: list
    best_score: float
    final_answer: str


def rewrite_node(state: AgentState) -> AgentState:
    print("  [Node: Rewrite] Rewriting user query...")
    state["rewritten_query"] = rewrite_query(state["original_query"])
    print(f"     -> {state['rewritten_query']}")
    return state


def retrieve_node(state: AgentState) -> AgentState:
    print("  [Node: Retrieve] Running hybrid search + reranking...")
    results = retriever.search(state["rewritten_query"], top_k=5)
    reranked = rerank(state["rewritten_query"], results, top_k=3)
    state["retrieved_chunks"] = reranked
    state["best_score"] = reranked[0].rerank_score if reranked else -999
    print(f"     -> Best chunk: {reranked[0].chunk.heading_path} (score={state['best_score']:.3f})")
    return state


def generate_answer_node(state: AgentState) -> AgentState:
    print("  [Node: Generate Answer] Confidence OK — generating grounded answer...")
    context = "\n\n".join([rc.chunk.text for rc in state["retrieved_chunks"][:2]])

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    prompt = f"""Answer the user's question using ONLY the context below.
If the answer isn't in the context, say you don't know.

Context:
{context}

Question: {state['original_query']}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=150,
    )
    state["final_answer"] = response.choices[0].message.content.strip()
    return state


def fallback_node(state: AgentState) -> AgentState:
    print("  [Node: Fallback] Confidence too low — refusing to guess.")
    state["final_answer"] = (
        "I couldn't find a confident answer to this in the available documents. "
        "Please rephrase your question or contact HR directly."
    )
    return state


def decide_path(state: AgentState) -> str:
    if state["best_score"] >= CONFIDENCE_THRESHOLD:
        return "generate"
    else:
        return "fallback"


def build_agent():
    graph = StateGraph(AgentState)

    graph.add_node("rewrite", rewrite_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_answer_node)
    graph.add_node("fallback", fallback_node)

    graph.set_entry_point("rewrite")
    graph.add_edge("rewrite", "retrieve")
    graph.add_conditional_edges("retrieve", decide_path, {
        "generate": "generate",
        "fallback": "fallback"
    })
    graph.add_edge("generate", END)
    graph.add_edge("fallback", END)

    return graph.compile()


retriever = None


def setup_retriever(document_paths=None):
    """Builds the retriever index from one or more document paths.
    If no paths are given, falls back to the original sample HR Policy Manual
    so the standalone test block below still works."""
    global retriever

    if document_paths is None:
        default_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "sample_docs", "HR Policy Manual.docx"
        )
        document_paths = [default_path]

    all_chunks = []
    for path in document_paths:
        if not path or not os.path.exists(path):
            print(f"Skipping missing document: {path}")
            continue
        try:
            parsed = parse_document(path)
            chunks = smart_chunk(parsed)
            all_chunks.extend(chunks)
            print(f"Indexed {len(chunks)} chunk(s) from: {os.path.basename(path)}")
        except Exception as exc:
            print(f"Could not parse {path}: {exc}")

    retriever = HybridRetriever()
    if all_chunks:
        retriever.index(all_chunks)
    else:
        print("Warning: no documents were indexed. Retriever is empty.")


if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 6 TEST — LangGraph Agentic RAG")
    print("=" * 60)

    print("\nSetting up retriever...")
    setup_retriever()

    agent = build_agent()

    test_questions = [
        "How much leave do I get for having a baby?",
        "What is the salary of the CEO?",  # not in our docs -> should trigger fallback
    ]

    for q in test_questions:
        print(f"\n{'='*60}")
        print(f"USER QUESTION: {q}")
        print("=" * 60)
        result = agent.invoke({"original_query": q})
        print(f"\nFINAL ANSWER: {result['final_answer']}")