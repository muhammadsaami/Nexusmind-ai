import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  Clock3,
  Database,
  Filter,
  Layers3,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const kpis = [
  { title: 'Total Documents', value: '1,248', change: '+12%', icon: Database, accent: 'text-cyan-300' },
  { title: 'AI Queries', value: '8,420', change: '+18%', icon: Bot, accent: 'text-violet-300' },
  { title: 'Retrieval Accuracy', value: '94.2%', change: '+2.4%', icon: Sparkles, accent: 'text-emerald-300' },
  { title: 'Average Latency', value: '182ms', change: '-9%', icon: Clock3, accent: 'text-amber-300' },
];

const recentQueries = [
  { query: 'Policy on remote work reimbursement', status: 'Resolved', time: '2m ago' },
  { query: 'Contract renewal guidelines', status: 'Checked', time: '12m ago' },
  { query: 'Employee leave eligibility', status: 'Resolved', time: '31m ago' },
];

const activityTimeline = [
  { title: 'New policy snapshot ingested', time: '09:41', detail: 'HR handbook updated' },
  { title: 'Latency optimization applied', time: '08:52', detail: 'Reranker response time improved' },
  { title: 'Knowledge index refreshed', time: '07:13', detail: '3 new sections indexed' },
];

const chartData = [
  { name: 'Mon', value: 74 },
  { name: 'Tue', value: 82 },
  { name: 'Wed', value: 79 },
  { name: 'Thu', value: 88 },
  { name: 'Fri', value: 93 },
  { name: 'Sat', value: 91 },
  { name: 'Sun', value: 96 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="rounded-[28px] border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(6,182,212,0.14),rgba(2,6,23,0.92))] p-6 shadow-[0_25px_100px_rgba(2,6,23,0.5)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-300">
              <Sparkles className="h-4 w-4" />
              Enterprise AI Operations
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back, Ava</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Monitor knowledge quality, response performance, and system health from a premium control center.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 shadow-[0_8px_24px_rgba(2,6,23,0.24)]">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-cyan-300" />
                Workspace
              </div>
              <p className="mt-1 font-medium text-white">Northwind AI Ops</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 shadow-[0_8px_24px_rgba(2,6,23,0.24)]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-violet-300" />
                Local Time
              </div>
              <p className="mt-1 font-medium text-white">Mon · 09:41</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
            >
              <Card className="group border-white/10 bg-white/8 shadow-[0_10px_35px_rgba(2,6,23,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">{item.title}</p>
                    <div className={`rounded-2xl bg-white/10 p-2 ${item.accent} transition-all duration-300 group-hover:scale-105`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
                    <ArrowUpRight className="h-4 w-4" />
                    {item.change} this week
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="border-white/10 bg-white/8 shadow-[0_10px_35px_rgba(2,6,23,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Recent Queries</CardTitle>
                <p className="mt-1 text-sm text-slate-400">Latest questions answered by your assistant</p>
              </div>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </div>
              </button>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead className="bg-white/5 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Query</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-slate-300">
                    {recentQueries.map((item) => (
                      <tr key={item.query} className="transition hover:bg-white/5">
                        <td className="px-4 py-3">{item.query}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{item.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
          <Card className="border-white/10 bg-white/8 shadow-[0_10px_35px_rgba(2,6,23,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/20">
            <CardHeader>
              <CardTitle className="text-white">System Health</CardTitle>
              <p className="mt-1 text-sm text-slate-400">Runtime signals and operational confidence</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Knowledge index</span>
                  <span className="font-medium text-emerald-300">Healthy</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[88%] rounded-full bg-cyan-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Inference queue</span>
                  <span className="font-medium text-cyan-300">Stable</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[72%] rounded-full bg-violet-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Guardrails coverage</span>
                  <span className="font-medium text-amber-300">On</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[96%] rounded-full bg-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
          <Card className="border-white/10 bg-white/8 shadow-[0_10px_35px_rgba(2,6,23,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/20">
            <CardHeader>
              <CardTitle className="text-white">Weekly Retrieval Performance</CardTitle>
              <p className="mt-1 text-sm text-slate-400">Simple area chart illustrating response quality trend</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#22d3ee" fill="url(#colorValue)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <Card className="border-white/10 bg-white/8 shadow-[0_10px_35px_rgba(2,6,23,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activityTimeline.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-slate-400">{item.time}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
            <Card className="border-white/10 bg-white/8 shadow-[0_10px_35px_rgba(2,6,23,0.35)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/20">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {['New query', 'Refresh index', 'Review guardrails', 'Export report'].map((action) => (
                  <button
                    key={action}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <span>{action}</span>
                    <Zap className="h-4 w-4 text-cyan-300" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
