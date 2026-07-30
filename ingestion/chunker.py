"""
PHASE 2 — SMART / COMPONENT-AWARE CHUNKING
=============================================
This groups extracted elements (headings + paragraphs) into meaningful
"chunks" — each chunk represents one complete topic/section, so that
when we search later, we get a full relevant section, not a broken piece.

Includes a small-chunk merging step: some document types (like resumes
or cover letters) produce many tiny fragmented chunks because the PDF
parser detects large-font text (like a name or job title) as a new
"heading" very frequently. Tiny, incomplete-looking chunks confuse the
reranker model (it scores them as low-confidence even when the content
is actually relevant), so we merge consecutive small chunks into fuller,
more coherent passages before returning them.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Chunk:
    text: str
    source_file: str
    heading_path: str        # e.g. "HR Policy Manual > 1. Leave Policy > 1.1 Maternity Leave"
    page: Optional[int] = None
    chunk_id: str = ""
    metadata: dict = field(default_factory=dict)


MAX_CHUNK_WORDS = 180     # max words per chunk (balances LLM context size + retrieval precision)
OVERLAP_WORDS = 30        # overlap used when splitting large sections
MIN_CHUNK_WORDS = 40      # chunks smaller than this get merged with the next one


def _split_with_overlap(text: str, heading_path: str, source_file: str, page: Optional[int]) -> List[Chunk]:
    """Splits a large section into overlapping word-based windows."""
    words = text.split()
    if len(words) <= MAX_CHUNK_WORDS:
        return [Chunk(text=text, source_file=source_file, heading_path=heading_path, page=page)]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + MAX_CHUNK_WORDS, len(words))
        piece = " ".join(words[start:end])
        chunks.append(Chunk(text=piece, source_file=source_file, heading_path=heading_path, page=page))
        if end == len(words):
            break
        start = end - OVERLAP_WORDS  # move forward with overlap
    return chunks


def _merge_small_chunks(chunks: List[Chunk]) -> List[Chunk]:
    """
    Merges consecutive small chunks into fuller passages. This mainly helps
    documents like resumes/cover letters where the parser creates many tiny
    fragments (e.g. a name or job title on its own), which the reranker
    tends to score poorly even when the content is relevant.
    """
    if not chunks:
        return chunks

    merged: List[Chunk] = []
    buffer_text: List[str] = []
    buffer_source = chunks[0].source_file
    buffer_heading = chunks[0].heading_path
    buffer_page = chunks[0].page

    def flush():
        if buffer_text:
            merged.append(Chunk(
                text=" ".join(buffer_text),
                source_file=buffer_source,
                heading_path=buffer_heading,
                page=buffer_page,
            ))

    for c in chunks:
        current_word_count = len(" ".join(buffer_text).split())
        if current_word_count > 0 and current_word_count >= MIN_CHUNK_WORDS:
            flush()
            buffer_text = []
            buffer_heading = c.heading_path
            buffer_page = c.page

        buffer_text.append(c.text)

    flush()
    return merged


def smart_chunk(parsed_doc: dict) -> List[Chunk]:
    """
    parsed_doc: output from parser.py -> {"source_file": ..., "elements": [...]}
    Returns: List[Chunk] -- heading-aware, metadata-rich chunks, with small
    fragments merged into fuller passages.
    """
    source_file = parsed_doc["source_file"]
    elements = parsed_doc["elements"]

    chunks: List[Chunk] = []
    heading_stack: List[str] = []   # tracks the current heading hierarchy
    current_text_buffer = []
    current_page = None

    def flush_buffer():
        """Turns whatever text has accumulated in the buffer into a chunk
        (or multiple chunks, if it's too large)."""
        nonlocal current_text_buffer
        if not current_text_buffer:
            return
        combined_text = " ".join(current_text_buffer)
        heading_path = " > ".join(heading_stack) if heading_stack else "Untitled Section"
        new_chunks = _split_with_overlap(combined_text, heading_path, source_file, current_page)
        chunks.extend(new_chunks)
        current_text_buffer = []

    for el in elements:
        if el["type"] == "heading":
            # new heading found -> flush whatever section was accumulated so far
            flush_buffer()
            level = el.get("level", 1) or 1
            # trim/update the heading hierarchy based on level
            heading_stack = heading_stack[:max(level - 1, 0)]
            heading_stack.append(el["text"])
            current_page = el.get("page")
        else:
            current_text_buffer.append(el["text"])
            if el.get("page"):
                current_page = el["page"]

    flush_buffer()  # flush the last section

    chunks = _merge_small_chunks(chunks)  # merge tiny fragments into fuller passages

    # assign chunk_id and metadata
    for i, c in enumerate(chunks):
        c.chunk_id = f"{source_file.split('/')[-1]}::chunk_{i}"
        c.metadata = {"word_count": len(c.text.split())}

    return chunks


if __name__ == "__main__":
    import sys
    sys.path.append(".")
    from parser import parse_document

    parsed = parse_document("../data/sample_docs/HR Policy Manual.docx")
    chunks = smart_chunk(parsed)

    print(f"Total chunks created: {len(chunks)}\n")
    for c in chunks:
        print(f"[{c.chunk_id}]")
        print(f"  Heading path: {c.heading_path}")
        print(f"  Word count: {c.metadata['word_count']}")
        print(f"  Text preview: {c.text[:100]}...")
        print()