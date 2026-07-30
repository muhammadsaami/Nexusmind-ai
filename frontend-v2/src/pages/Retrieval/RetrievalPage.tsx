import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, FileText, Search, Sparkles, Layers3, BrainCircuit, Inbox, LoaderCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { getApiBase } from '../../config/api';

const API_BASE = getApiBase();

type Confidence = 'High' | 'Medium' | 'Low';

type Chunk = {
  id: number;
  title: string;
  source: string;
  denseScore: number;
  bm25Score: number;
  rerankScore: number;
  preview: string;
  confidence: Confidence;
};

export default function RetrievalPage() {
  const [search, setSearch] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      setChunks([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`${API_BASE}/retrieval/${encodeURIComponent(trimmed)}`)
        .then((res) => {
          if (!res.ok) throw new Error('Retriever not ready yet. Is the backend running?');
          return res.json();
        })
        .then((data) => {
          const results: Chunk[] = (data.results ?? []).map((r: any) => ({
            id: r.id,
            title: r.title,
            source: r.source,
            denseScore: r.dense_score,
            bm25Score: r.bm25_score,
            rerankScore: r.rerank_score,
            preview: r.preview,
            confidence: r.confidence as Confidence,
          }));
          setChunks(results);
          setHasSearched(true);
          setExpandedId(results[0]?.id ?? null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Something went wrong contacting the retriever.');
          setChunks([]);
          setHasSearched(true);
        })
        .finally(() => setLoading(false));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [search]);

  const averageScore = useMemo(() => {
    if (!chunks.length) return 0;
    return (chunks.reduce((sum, c) => sum + c.rerankScore, 0) / chunks.length).toFixed(2);
  }, [chunks]);

  return (
    <div className="space-y-6">
      <PageHeader title="Retrieval" subtitle="Enterprise RAG retrieval inspector" />

      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[0_20px_80px_rgba(2,6,23,0.35)] sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Retrieval overview" subtitle="Inspect evidence quality, similarity strength, and chunk confidence before composing a response" className="p-5">

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <BrainCircuit className="h-4 w-4 text-cyan-300" />
                  Avg. rerank score
                </div>
                <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{averageScore}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Layers3 className="h-4 w-4 text-violet-300" />
                  Retrieved chunks
                </div>
                <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{chunks.length}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4">
              <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                <span>Confidence visualization</span>
                <span className="text-cyan-300">{chunks.length ? 'Healthy' : 'Waiting for a query'}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[var(--bg-soft-hover)]">
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400" style={{ width: `${Math.min(100, chunks.length * 20)}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">High confidence</span>
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-300">Medium confidence</span>
                <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-rose-300">Low confidence</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Retrieve evidence" subtitle="Search across the live retrieval index" className="p-5">
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-3 py-2">
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
              ) : (
                <Search className="h-4 w-4 text-[var(--text-secondary)]" />
              )}
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Type a question to search retrieved chunks..."
                className="w-full border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {!hasSearched && !loading && !error ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-soft)] p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-soft-hover)] text-[var(--text-secondary)]">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Start typing to search</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Type a question above — retrieved chunks from the live index will appear here.</p>
              </div>
            ) : hasSearched && !loading && !error && chunks.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-soft)] p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-soft-hover)] text-[var(--text-secondary)]">
                  <Inbox className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No matching chunks found</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Try rephrasing your query or check that documents are indexed.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {chunks.map((chunk) => {
                  const isExpanded = expandedId === chunk.id;
                  return (
                    <motion.div
                      key={chunk.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{chunk.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft-hover)] px-2.5 py-1">{chunk.source}</span>
                            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft-hover)] px-2.5 py-1">Rerank {chunk.rerankScore.toFixed(2)}</span>
                            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft-hover)] px-2.5 py-1">Dense {chunk.denseScore.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                            chunk.confidence === 'High'
                              ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                              : chunk.confidence === 'Medium'
                                ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                                : 'border-rose-400/20 bg-rose-500/10 text-rose-300'
                          }`}>
                            {chunk.confidence} confidence
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
                        {chunk.preview}
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : chunk.id)}
                        className="mt-3 flex items-center gap-2 text-sm text-cyan-300"
                      >
                        <ChevronDown className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`} />
                        {isExpanded ? 'Hide details' : 'Expand chunk'}
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                  <FileText className="h-4 w-4 text-cyan-300" />
                                  Source document
                                </div>
                                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{chunk.source}</p>
                              </div>
                              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                  <Sparkles className="h-4 w-4 text-violet-300" />
                                  BM25 score
                                </div>
                                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{chunk.bm25Score.toFixed(2)}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}