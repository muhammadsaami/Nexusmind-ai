import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Eye, Clock3 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { getApiBase } from '../../config/api';

const API_BASE = getApiBase();

interface GuardrailEvent {
  question: string;
  answer: string;
  timestamp: string;
}

interface GuardrailMetrics {
  total_events: number;
  masked_events: number;
  latest_masked_text: GuardrailEvent | null;
}

export default function GuardrailsPage() {
  const [logs, setLogs] = useState<GuardrailEvent[]>([]);
  const [metrics, setMetrics] = useState<GuardrailMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = () => {
      Promise.all([
        fetch(`${API_BASE}/guardrails/logs`).then((r) => r.json()),
        fetch(`${API_BASE}/guardrails/metrics`).then((r) => r.json()),
      ])
        .then(([logsData, metricsData]) => {
          setLogs(logsData);
          setMetrics(metricsData);
          setError(null);
          setLoading(false);
        })
        .catch(() => {
          setError('Could not reach the guardrails API. Is the FastAPI server running?');
          setLoading(false);
        });
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <PageHeader title="Guardrails" subtitle="Loading live data..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Guardrails" subtitle="PII masking and safety event monitoring" />
        <SectionCard className="p-5">
          <p className="text-rose-300">{error}</p>
        </SectionCard>
      </div>
    );
  }

  const cards = [
    { title: 'Total Events', value: String(metrics?.total_events ?? 0), icon: ShieldAlert, accent: 'text-cyan-300' },
    { title: 'Masked Events', value: String(metrics?.masked_events ?? 0), icon: ShieldCheck, accent: 'text-emerald-300' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Guardrails" subtitle="PII masking and safety event monitoring" />

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <SectionCard key={card.title} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">{card.title}</p>
                <div className={`rounded-2xl bg-[var(--bg-soft)] p-2 ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{card.value}</p>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard title="Recent guardrail events" subtitle="Latest questions and answers after PII masking" className="p-5">
        {logs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-soft)] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-soft-hover)] text-[var(--text-secondary)]">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No events yet</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Ask a question in AI Chat — masked events will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {logs.map((event, i) => (
              <div key={i} className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-soft)] p-4">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{event.question}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{event.answer}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}