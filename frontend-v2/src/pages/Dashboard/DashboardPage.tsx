import { useEffect, useState } from 'react';
import { Activity, BrainCircuit, FileText, Search, Sparkles, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { getApiBase } from '../../config/api';

const API_BASE = getApiBase();

interface AnalyticsData {
  total_queries: number;
  cache_hit_rate: number;
  average_confidence: number;
  decision_breakdown: { generate: number; fallback: number };
}

interface DocumentItem {
  id: number;
  name: string;
}

interface HistoryItem {
  question: string;
  decision_path: string;
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = () => {
      Promise.all([
        fetch(`${API_BASE}/analytics`).then((r) => r.json()),
        fetch(`${API_BASE}/documents`).then((r) => r.json()),
        fetch(`${API_BASE}/retrieval/history`).then((r) => r.json()),
      ])
        .then(([a, d, h]) => {
          setAnalytics(a);
          setDocuments(d);
          setHistory(h);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <PageHeader title="Dashboard" subtitle="Loading live data..." />;
  }

  const generateRatio = analytics && analytics.total_queries > 0
    ? Math.round((analytics.decision_breakdown.generate / analytics.total_queries) * 100)
    : 0;

  const highlights = [
    { title: 'Live Queries', value: String(analytics?.total_queries ?? 0), detail: 'Live from API', icon: Activity, accent: 'text-cyan-300' },
    { title: 'Connected Docs', value: String(documents.length), detail: 'Live from API', icon: FileText, accent: 'text-emerald-300' },
    { title: 'Cache Hit Rate', value: `${analytics?.cache_hit_rate ?? 0}%`, detail: 'Live from API', icon: Search, accent: 'text-violet-300' },
    { title: 'Answers Grounded', value: `${generateRatio}%`, detail: 'vs fallback', icon: BrainCircuit, accent: 'text-amber-300' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="A premium operations overview for your enterprise AI workspace" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <SectionCard key={item.title} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">{item.title}</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                </div>
                <div className={`rounded-2xl bg-[var(--bg-soft)] p-2 ${item.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
                <TrendingUp className="h-4 w-4" />
                {item.detail}
              </div>
            </SectionCard>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Operational pulse" subtitle="A snapshot of the current knowledge workflow">
          <div className="rounded-[20px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_55%)] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
              <Sparkles className="h-4 w-4" />
              Team readiness
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {analytics && analytics.total_queries > 0
                ? `${documents.length} document(s) indexed, ${analytics.total_queries} queries answered with ${analytics.average_confidence.toFixed(2)} average confidence.`
                : "No activity yet. Ask a question in AI Chat to see live stats appear here."}
            </p>
            <div className="mt-5 h-2 rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                style={{ width: `${generateRatio}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{generateRatio}% of answered queries were confidently grounded (not fallback).</p>
          </div>
        </SectionCard>

        <SectionCard title="Recent activity" subtitle="Most recent questions asked">
          <div className="space-y-3">
            {history.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No queries yet.</p>
            )}
            {history.slice(0, 3).map((entry, i) => (
              <div key={i} className="flex items-center justify-between rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-4 py-3">
                <p className="text-sm text-[var(--text-primary)] truncate max-w-[70%]">{entry.question}</p>
                <span className={`text-xs ${entry.decision_path === 'generate' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {entry.decision_path === 'generate' ? 'answered' : 'fallback'}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}