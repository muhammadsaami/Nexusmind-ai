"""
PHASE 1 — DOCUMENT INGESTION MODULE
=====================================
This is the first step of the RAG pipeline: extracting text from company
documents (PDF, DOCX, scanned images) so it can be used in later stages
(chunking, retrieval, etc.)
"""

import os
import fitz  # PyMuPDF - for reading PDFs
from docx import Document as DocxDocument
import pytesseract
from PIL import Image

# On Windows, we need to tell pytesseract where the Tesseract OCR engine is installed
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def parse_pdf(filepath: str) -> dict:
    """Extracts text from a PDF. If it's a scanned PDF (no text found on a page),
    falls back to OCR for that page."""
    doc = fitz.open(filepath)
    elements = []

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text().strip()

        if text:
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    line_text = "".join(span["text"] for span in line["spans"]).strip()
                    if not line_text:
                        continue
                    max_size = max(span["size"] for span in line["spans"])
                    is_heading = max_size >= 13
                    elements.append({
                        "type": "heading" if is_heading else "paragraph",
                        "level": 1 if is_heading else 0,
                        "text": line_text,
                        "page": page_num
                    })
        else:
            # No text layer found -> treat as scanned page -> render as image -> OCR
            pix = page.get_pixmap(dpi=200)
            img_path = f"temp_ocr_page_{page_num}.png"
            pix.save(img_path)
            ocr_text = pytesseract.image_to_string(Image.open(img_path)).strip()
            os.remove(img_path)
            for line in ocr_text.split("\n"):
                if line.strip():
                    elements.append({
                        "type": "paragraph", "level": 0,
                        "text": line.strip(), "page": page_num, "ocr": True
                    })

    doc.close()
    return {"source_file": filepath, "file_type": "pdf", "elements": elements}


def parse_docx(filepath: str) -> dict:
    """Extracts paragraphs and heading levels from a Word document."""
    doc = DocxDocument(filepath)
    elements = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = para.style.name if para.style else ""
        if style.startswith("Heading") or style == "Title":
            level = 0 if style == "Title" else int(style.replace("Heading ", "") or 1)
            elements.append({"type": "heading", "level": level, "text": text, "page": None})
        else:
            elements.append({"type": "paragraph", "level": 0, "text": text, "page": None})

    return {"source_file": filepath, "file_type": "docx", "elements": elements}


def parse_image(filepath: str) -> dict:
    """Extracts text from a scanned image/notice using OCR."""
    ocr_text = pytesseract.image_to_string(Image.open(filepath)).strip()
    elements = [
        {"type": "paragraph", "level": 0, "text": line.strip(), "page": 1, "ocr": True}
        for line in ocr_text.split("\n") if line.strip()
    ]
    return {"source_file": filepath, "file_type": "image", "elements": elements}


def parse_document(filepath: str) -> dict:
    """Entry point: checks the file extension and calls the right parser."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        return parse_pdf(filepath)
    elif ext == ".docx":
        return parse_docx(filepath)
    elif ext in (".png", ".jpg", ".jpeg"):
        return parse_image(filepath)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 1 TEST — Document Ingestion")
    print("=" * 60)

    filepath = "../data/sample_docs/HR Policy Manual.docx"
    result = parse_document(filepath)

    print(f"\nFile: {filepath}")
    print(f"Detected type: {result['file_type']}")
    print(f"Total text elements extracted: {len(result['elements'])}")
    print("\nSample extracted content:")
    for el in result["elements"][:6]:
        print(f"   [{el['type']}] {el['text'][:65]}")