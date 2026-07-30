import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Activity, BrainCircuit, Clock3, DatabaseZap, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { getApiBase } from '../../config/api';

const API_BASE = getApiBase();

interface TrendPoint {
  timestamp: string;
  queries: number;
  confidence: number;
  latency: number;
}

interface AnalyticsData {
  total_queries: number;
  cache_hit_rate: number;
  average_confidence: number;
  average_latency_ms: number;
  decision_breakdown: { generate: number; fallback: number };
  trend: TrendPoint[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = () => {
      fetch(`${API_BASE}/analytics`)
        .then((res) => res.json())
        .then((json) => {
          setData(json);
          setLoading(false);
        })
        .catch(() => {
          setError("Could not reach the analytics API. Is the FastAPI server running?");
          setLoading(false);
        });
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" subtitle="Loading live data..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" subtitle="Premium observability for AI response quality" />
        <SectionCard className="p-5">
          <p className="text-rose-300">{error}</p>
        </SectionCard>
      </div>
    );
  }

  const cards = [
    { title: 'Total Queries', value: data.total_queries.toLocaleString(), icon: Activity, accent: 'text-cyan-300' },
    { title: 'Cache Hit Rate', value: `${data.cache_hit_rate}%`, icon: DatabaseZap, accent: 'text-emerald-300' },
    { title: 'Average Confidence', value: data.average_confidence.toFixed(2), icon: BrainCircuit, accent: 'text-violet-300' },
    { title: 'Response Latency', value: `${data.average_latency_ms} ms`, icon: Clock3, accent: 'text-amber-300' },
  ];

  const decisionData = [
    { name: 'Generate', value: data.decision_breakdown.generate, color: '#22d3ee' },
    { name: 'Fallback', value: data.decision_breakdown.fallback, color: '#8b5cf6' },
  ];

  const trendChartData = data.trend.map((point, i) => ({
    name: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || `Q${i + 1}`,
    queries: point.queries,
    confidence: point.confidence,
    latency: point.latency,
  }));

  const hasData = data.total_queries > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Premium observability for AI response quality" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
                <TrendingUp className="h-4 w-4" />
                Live from API
              </div>
            </SectionCard>
          );
        })}
      </div>

      {!hasData && (
        <SectionCard className="p-5">
          <p className="text-[var(--text-secondary)] text-sm">
            No queries yet. Go to <span className="text-cyan-300">AI Chat</span> and ask a question — this dashboard updates automatically every 5 seconds.
          </p>
        </SectionCard>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Query trend" subtitle="Live query confidence over recent requests" className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Live data</div>
          </div>

          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="queriesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="confidence" stroke="#22d3ee" fill="url(#queriesFill)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Decision path split" subtitle="Generate vs fallback distribution" className="p-5">
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={decisionData} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {decisionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {decisionData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-soft)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name} · {entry.value}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Response quality trend" subtitle="Confidence and latency across recent requests" className="p-5">
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendChartData}>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="confidence" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="latency" fill="#22d3ee" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}