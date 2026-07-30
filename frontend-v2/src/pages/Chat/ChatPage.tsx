import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Bot, ChevronDown, Copy, LoaderCircle, MessageCircleMore, RotateCcw, Zap } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import Skeleton from '../../components/common/Skeleton';
import { apiService, type AskResponse } from '../../services/apiService';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  metadata?: AskResponse;
  requestQuestion?: string;
  isLoading?: boolean;
};

const starterMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: 'Hello! I can help you explore your documents, summarize retrieval results, and answer questions across your knowledge base. Ask me anything about the HR policy.',
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState<number[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<number | null>(null);
  const [isRewrittenExpanded, setIsRewrittenExpanded] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant' && message.metadata),
    [messages]
  );
  const latestMetadata = latestAssistantMessage?.metadata ?? null;

  const confidenceBadgeClass = latestMetadata
    ? latestMetadata.confidence_score >= 0
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
      : latestMetadata.confidence_score >= -5
        ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
        : 'border-rose-400/20 bg-rose-500/10 text-rose-300'
    : 'border-[var(--border-subtle)] bg-[var(--bg-soft)] text-[var(--text-secondary)]';

  const cacheBadgeClass = latestMetadata?.from_cache
    ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
    : 'border-[var(--border-subtle)] bg-[var(--bg-soft)] text-[var(--text-primary)]';

  const handleSend = async (overrideQuestion?: string) => {
    const trimmed = (overrideQuestion ?? input).trim();
    if (!trimmed || isLoading || regeneratingMessageId) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await apiService.ask(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.answer,
          metadata: response,
          requestQuestion: trimmed,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong while contacting the backend.';
      setErrorMessage(message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          content: `Sorry, I couldn't answer that right now. ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (message: Message) => {
    if (!message.requestQuestion || isLoading || regeneratingMessageId) return;

    setRegeneratingMessageId(message.id);
    setErrorMessage(null);
    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? { ...item, content: 'Regenerating response…', isLoading: true }
          : item
      )
    );

    try {
      const response = await apiService.ask(message.requestQuestion);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: response.answer,
                metadata: response,
                requestQuestion: message.requestQuestion,
                isLoading: false,
              }
            : item
        )
      );
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Something went wrong while contacting the backend.';
      setErrorMessage(messageText);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: `Sorry, I couldn't regenerate that response. ${messageText}`,
                isLoading: false,
              }
            : item
        )
      );
    } finally {
      setRegeneratingMessageId(null);
    }
  };

  const toggleExpanded = (messageId: number) => {
    setExpandedMessageIds((prev) => (prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]));
  };

  const handleCopy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((prev) => (prev === message.id ? null : prev)), 1600);
    } catch {
      setErrorMessage('Unable to copy the answer.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI Chat" subtitle="Conversational workspace for grounded answers" />

      <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <div className="flex h-[680px] flex-col overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[0_20px_80px_rgba(2,6,23,0.35)] sm:h-[720px]">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
              <MessageCircleMore className="h-4 w-4" />
              Live conversation
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Connected to the live NexusMind retrieval agent.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.map((message) => {
              const isExpanded = expandedMessageIds.includes(message.id);
              const showActions = message.role === 'assistant' && !!message.metadata;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[82%] ${message.role === 'user' ? 'w-fit' : 'w-full'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-cyan-500/15 text-cyan-50 ring-1 ring-cyan-400/20'
                          : 'bg-[var(--bg-soft)] text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                        {message.role === 'user' ? <Zap className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        {message.role === 'user' ? 'You' : 'NexusMind AI'}
                      </div>
                      {message.content}
                    </div>

                    {showActions && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleCopy(message)}
                          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft-hover)]"
                        >
                          <span className="flex items-center gap-2">
                            <Copy className="h-3.5 w-3.5" />
                            {copiedMessageId === message.id ? 'Copied' : 'Copy Answer'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleRegenerate(message)}
                          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft-hover)]"
                        >
                          <span className="flex items-center gap-2">
                            <RotateCcw className="h-3.5 w-3.5" />
                            {regeneratingMessageId === message.id ? 'Regenerating…' : 'Regenerate'}
                          </span>
                        </button>
                        <button
                          onClick={() => toggleExpanded(message.id)}
                          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft-hover)]"
                        >
                          <span className="flex items-center gap-2">
                            <ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} />
                            Details
                          </span>
                        </button>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {showActions && isExpanded && message.metadata && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3"
                        >
                          <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[var(--text-secondary)]">Confidence Score</span>
                              <span className="font-medium text-cyan-300">{message.metadata.confidence_score}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[var(--text-secondary)]">Decision Path</span>
                              <span className="font-medium text-[var(--text-primary)]">{message.metadata.decision_path}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[var(--text-secondary)]">Source Section</span>
                              <span className="font-medium text-[var(--text-primary)]">{message.metadata.source_section}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[var(--text-secondary)]">Rewritten Query</span>
                              <span className="font-medium text-[var(--text-primary)]">{message.metadata.rewritten_query}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[var(--text-secondary)]">From Cache</span>
                              <span className="font-medium text-[var(--text-primary)]">{message.metadata.from_cache ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--text-secondary)] ring-1 ring-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                    Thinking...
                  </div>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            {errorMessage && (
              <div className="mb-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}
            <div className="flex items-end gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
              <textarea
                value={input}
                disabled={isLoading || Boolean(regeneratingMessageId)}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about your documents, retrieval results, or policies..."
                className="min-h-[48px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:opacity-60"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || Boolean(regeneratingMessageId)}
                className="rounded-xl bg-cyan-500/90 p-3 text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SectionCard title="Response metadata" subtitle="Live diagnostics from the latest backend response" className="p-5">
            {latestMetadata ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">Confidence score</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${confidenceBadgeClass}`}>
                      {latestMetadata.confidence_score.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">Decision path</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{latestMetadata.decision_path}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">Cache status</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${cacheBadgeClass}`}>
                      {latestMetadata.from_cache ? 'Cached' : 'Fresh'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">Source section</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{latestMetadata.source_section}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-3">
                  <button
                    onClick={() => setIsRewrittenExpanded((value) => !value)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm text-[var(--text-secondary)]">Rewritten query</span>
                    <ChevronDown className={`h-4 w-4 text-[var(--text-secondary)] transition ${isRewrittenExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isRewrittenExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-secondary)]"
                      >
                        {latestMetadata.rewritten_query}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4 text-sm text-[var(--text-secondary)]">
                Send a question to populate this panel with the backend response metadata.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}