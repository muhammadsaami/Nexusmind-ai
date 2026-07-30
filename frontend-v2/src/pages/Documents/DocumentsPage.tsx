import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, UploadCloud, Trash2, CheckCircle2, Clock3, Inbox, LoaderCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import Skeleton from '../../components/common/Skeleton';
import { getApiBase } from '../../config/api';

const API_BASE = getApiBase();

type DocumentItem = {
  id: number;
  name: string;
  size: string;
  uploadedAt: string;
  status: string;
  type: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = useCallback(() => {
    return fetch(`${API_BASE}/documents`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load documents from the API.');
        return res.json();
      })
      .then((data: DocumentItem[]) => {
        setDocuments(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not reach the documents API.');
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDocuments().finally(() => setLoading(false));
  }, [fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    const term = search.toLowerCase();
    return documents.filter((doc) => doc.name.toLowerCase().includes(term));
  }, [documents, search]);

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }

    await fetchDocuments();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }

    await fetchDocuments();
    setUploading(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete the document.');
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete the document.');
    } finally {
      setDeletingId(null);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'Ready') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
    if (status === 'Processing') return <Clock3 className="h-4 w-4 text-cyan-300" />;
    return <Clock3 className="h-4 w-4 text-[var(--text-secondary)]" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="Enterprise knowledge source management" />

      {error && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[0_20px_80px_rgba(2,6,23,0.35)] sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Upload documents" subtitle="Drag and drop files into the workspace or trigger an upload manually" className="p-5">

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesChosen}
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
            />

            <motion.div
              whileHover={{ scale: 1.01 }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="mt-5 rounded-[24px] border border-dashed border-cyan-400/30 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_55%)] p-8 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Drop files here</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">PDF, DOCX, TXT, and image files supported</p>
              <button
                onClick={handleSelectFiles}
                disabled={uploading}
                className="mt-5 rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Select files'}
              </button>
            </motion.div>

            {uploading && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4">
                <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                <span className="text-sm text-[var(--text-secondary)]">Uploading and processing documents...</span>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Document library" subtitle="Search, review, and manage the current corpus" className="p-5">
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search documents"
                className="w-full border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            {loading ? (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-soft)] p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-soft-hover)] text-[var(--text-secondary)]">
                  <Inbox className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No documents found</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Try a different search term or upload a new document to start building your knowledge base.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredDocuments.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-cyan-500/10 p-2 text-cyan-300">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{doc.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.uploadedAt}</span>
                            <span>•</span>
                            <span>{doc.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft-hover)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
                          {statusIcon(doc.status)}
                          {doc.status}
                        </div>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft-hover)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft-hover)] hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${doc.name}`}
                        >
                          {deletingId === doc.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}