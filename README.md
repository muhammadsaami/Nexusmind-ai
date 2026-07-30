<div align="center">

# 🧠 NexusMind AI

### Agentic RAG-Powered Enterprise Knowledge Assistant

*Ask questions. Get grounded answers. Zero hallucinations.*

![Status](https://img.shields.io/badge/status-active-success)
![Python](https://img.shields.io/badge/backend-FastAPI-009688)
![React](https://img.shields.io/badge/frontend-React%2019-61DAFB)
![License](https://img.shields.io/badge/license-Internal-lightgrey)

</div>

---

## ✨ What is NexusMind AI?

**NexusMind AI** is a full-stack, production-style **Retrieval-Augmented Generation (RAG)** platform built for enterprise teams. Upload your internal documents — policies, manuals, playbooks — and let employees ask natural-language questions and get **source-grounded, confidence-scored answers** in real time.

No more digging through PDFs. No more chatbot hallucinations. Just accurate answers, backed by your own data.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Email-based signup/login, bcrypt password hashing, rate-limited login attempts, profile photo upload |
| 💬 **AI Chat** | Conversational agentic RAG pipeline — rewrite → retrieve → rerank → confidence-gated generate |
| 📄 **Documents** | Upload / list / delete PDFs, DOCX, and TXT files — knowledge base re-indexes automatically |
| 🔍 **Retrieval Inspector** | Live search over the index with dense, BM25, and rerank scores + confidence labels |
| 📊 **Analytics Dashboard** | Real-time query volume, cache hit rate, average confidence, latency, generate-vs-fallback charts |
| 🛡️ **Guardrails** | Automatic PII masking on every Q&A pair, with a full audit log |
| 🔎 **Global Search** | Instantly jump to any page or document from anywhere in the app |
| 🔔 **Notifications** | Live activity feed for chat and guardrail events |
| 🌗 **Dark / Light Theme** | Fully themed UI with persistent user preference |

---

## 🎯 The Problem It Solves

Enterprises drown employees in scattered documents — HR policies, IT guidelines, playbooks — that nobody has time to search manually. Generic AI chatbots "solve" this by **making things up** with no way to verify the source.

**NexusMind AI fixes this by:**

- ✅ Grounding every answer strictly in your own documents
- ✅ **Refusing to guess** when retrieval confidence is too low (no hallucinations, ever)
- ✅ Showing full transparency — confidence score, source section, and decision path for every answer
- ✅ Logging every interaction for compliance, with automatic PII masking
- ✅ Giving admins live visibility into usage and answer quality via analytics

---

## 🏗️ Architecture

````

User Question
      │
      ▼
┌─────────────────┐
│  Query Rewriter │  (LLM clarifies intent)
└────────┬────────┘
         ▼
┌─────────────────────────┐
│   Hybrid Retriever       │  Dense (Qdrant) + Sparse (BM25)
└────────┬─────────────────┘
         ▼
┌─────────────────────────┐
│  Cross-Encoder Reranker  │
└────────┬─────────────────┘
         ▼
   Confidence Check
    ┌────┴────┐
    ▼         ▼
 Generate   Fallback
 (LLM)      ("I don't know — ask HR")
    │         │
    └────┬────┘
         ▼
 Response + Analytics + Guardrail Log

````

---

## 🛠️ Tech Stack

**Frontend**
- ⚛️ React 19 + TypeScript + Vite
- 🎨 Tailwind CSS v4 (CSS-variable theming, dark/light mode)
- 🧭 React Router · Framer Motion · Recharts · Lucide Icons

**Backend**
- ⚡ FastAPI (Python)
- 🕸️ LangGraph — agentic workflow orchestration
- 🤖 Groq API (Llama 3.1) — grounded answer generation
- 🧮 Qdrant (in-memory) — dense vector search
- 🔤 BM25 (`rank_bm25`) — sparse keyword search
- 🎯 Sentence-Transformers Cross-Encoder — reranking
- 🔒 bcrypt — password hashing

**Document Ingestion**
- 📘 python-docx · 📕 PyMuPDF · 🖼️ pytesseract (OCR)

---

## ⚙️ Getting Started

### 1️⃣ Backend

````bash
cd api
pip install -r requirements.txt
python -m uvicorn main:app --reload
````

Runs at **[http://127.0.0.1:8000](http://127.0.0.1:8000)** — interactive API docs at `/docs`.

### 2️⃣ Frontend

````bash
cd frontend-v2
npm install
npm run dev
````

Runs at **[http://localhost:5173](http://localhost:5173)**.

### 3️⃣ Environment Variables

Create a `.env` file inside `retrieval/`:

````env
GROQ_API_KEY=your_groq_api_key_here
````

---

## 📸 Screenshots

<div align="center">

### Dashboard — Live Operational Overview
![Dashboard](Screenshot%202026-07-30%20140117.png)

</div>

## 🧩 Known Limitations

* 📄 The reranker performs best on **structured** documents (policies, manuals, reports with clear headings). Unstructured files like resumes may trigger a low-confidence fallback — this is **intentional**, not a bug: the system refuses to guess rather than hallucinate.
* 🏢 Currently single-workspace; multi-tenant support is a planned future improvement.

---

## 🗺️ Roadmap

* [ ] Streaming chat responses
* [ ] Markdown rendering in chat answers
* [ ] System-based (auto) theme detection
* [ ] Multi-tenant workspace support

---

<div align="center">

Built with  for smarter enterprise knowledge management.

</div>
````


