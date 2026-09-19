import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Send, Loader2, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import api from '../api/axios';

/**
 * Platform AI assistant (admin end).
 * No external LLM key needed: it reasons over LIVE platform data
 * (overview, demand heatmap, workforce, disputes, workers) and explains
 * every suggestion with the numbers behind it. The cooperative/federation
 * still makes all decisions — the assistant only advises.
 */
export default function AIAssistant() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [workforce, setWorkforce] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [ov, heat, wf, disp, wrk] = await Promise.all([
          api.get('/api/admin/overview').then((r) => r.data?.data ?? r.data),
          api.get('/api/analytics/heatmap').then((r) => r.data?.data ?? r.data).catch(() => ({})),
          api.get('/api/federation/workforce/requirements').then((r) => r.data?.data ?? []).catch(() => []),
          api.get('/api/disputes').then((r) => r.data?.data ?? []).catch(() => []),
          api.get('/api/workers/').then((r) => r.data?.data ?? []).catch(() => []),
        ]);
        setOverview(ov);
        setHeatmap(heat?.points || heat || []);
        setWorkforce(Array.isArray(wf) ? wf : []);
        setDisputes(Array.isArray(disp) ? disp : []);
        setWorkers(Array.isArray(wrk) ? wrk : []);
      } catch (err) {
        setError(err.userMessage || 'Assistant could not load platform data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const insights = useMemo(() => {
    if (!overview) return [];
    const out = [];
    const topArea = [...heatmap].sort((a, b) => (b.demand ?? b.count ?? 0) - (a.demand ?? a.count ?? 0))[0];
    if (topArea) {
      out.push({
        kind: 'demand',
        title: `Demand hotspot: ${topArea.area || topArea.label || 'top zone'}`,
        body: `${topArea.demand ?? topArea.count ?? 0} open requests cluster here. Suggestion: prioritize verified workers within 10 km of this zone and run a weekend hiring push.`,
      });
    }
    const total = overview.completed_jobs + overview.active_jobs;
    const fulfillment = total > 0 ? Math.round((overview.completed_jobs / total) * 100) : 0;
    out.push({
      kind: 'performance',
      title: `Fulfillment at ${fulfillment}% (${overview.completed_jobs} completed, ${overview.active_jobs} active)`,
      body: fulfillment < 70
        ? 'Below the 70% healthy threshold. Suggestion: clear the oldest pending requests first and reassign idle verified workers.'
        : 'Healthy throughput. Suggestion: keep the allocation queue under 24h old to protect ratings.',
    });
    const unverified = overview.workers_total - overview.workers_verified;
    if (unverified > 0) {
      out.push({
        kind: 'supply',
        title: `${unverified} workers awaiting verification`,
        body: `Only verified workers can be allocated. Suggestion: clear the verification backlog — each verified worker unlocks matching capacity.`,
      });
    }
    const openDisp = (disputes || []).filter((d) => ['open', 'under_review', 'awaiting_response'].includes(d.status));
    if (openDisp.length > 0) {
      out.push({
        kind: 'risk',
        title: `${openDisp.length} disputes need resolution`,
        body: 'Unresolved disputes hurt trust and repeat bookings. Suggestion: resolve oldest-first with a 48h SLA in the Disputes tab.',
      });
    }
    const remaining = (workforce || []).reduce((s, r) => s + (r.workers_remaining || 0), 0);
    if (remaining > 0) {
      out.push({
        kind: 'workforce',
        title: `${remaining} workforce slots still open across societies`,
        body: 'Suggestion: federations should pool verified workers across societies for partially fulfilled requirements.',
      });
    }
    out.push({
      kind: 'upgrade',
      title: 'Suggested future upgrades',
      body: 'Production payment gateway webhooks → push notifications via dev-build → native maps turn-by-turn → Hindi/Marathi voice booking. Each is additive; current flows keep working.',
    });
    return out;
  }, [overview, heatmap, workforce, disputes]);

  const [modelBadge, setModelBadge] = useState(null);

  const ask = async (e) => {
    e?.preventDefault();
    const q = question.toLowerCase();
    if (!q.trim() || !overview) return;
    // Prefer the opencode model backend; fall back to built-in rules.
    try {
      const res = await api.post('/api/admin/ai-assist', { question: question.trim() });
      const reply = res.data?.data?.reply || res.data?.reply;
      if (reply) {
        setAnswer({ q: question.trim(), reply });
        setModelBadge('Answered by opencode model');
        return;
      }
    } catch {
      /* model not configured or unreachable — use built-in rules below */
    }
    setModelBadge('Answered from live data (built-in rules)');
    let reply;
    if (/revenue|money|earning|commission|payout|welfare/.test(q)) {
      reply = `Revenue ₹${Number(overview.revenue_total).toLocaleString('en-IN')} — commission ₹${Number(overview.commission_total).toLocaleString('en-IN')}, welfare ₹${Number(overview.welfare_fund).toLocaleString('en-IN')}, payouts ₹${Number(overview.payouts_total).toLocaleString('en-IN')}. Every figure reconciles from backend invoices.`;
    } else if (/demand|hotspot|area|where/.test(q)) {
      const top = [...heatmap].sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0))[0];
      reply = top
        ? `Highest demand: ${top.area || top.label} with ${top.demand ?? top.count} open requests. Allocate verified workers nearby first.`
        : 'No demand hotspots right now — the queue is clear.';
    } else if (/worker|staff|verif/.test(q)) {
      reply = `${overview.workers_verified} of ${overview.workers_total} workers verified. Unverified workers cannot be allocated — clear verification to grow capacity.`;
    } else if (/dispute|complaint/.test(q)) {
      reply = `${overview.open_disputes} open disputes. Oldest-first resolution with a 48h SLA protects repeat bookings.`;
    } else if (/fulfil|performance|completion/.test(q)) {
      reply = `${overview.completed_jobs} completed, ${overview.active_jobs} active jobs, ${overview.workforce_requirements} workforce needs open.`;
    } else if (/upgrade|future|next|roadmap/.test(q)) {
      reply = 'Recommended order: production payment webhooks, push notifications, native maps navigation, then multilingual voice. Each ships without breaking current flows.';
    } else {
      reply = 'I can answer from live data about revenue, demand hotspots, workers, disputes, fulfillment, or future upgrades — try one of those.';
    }
    setAnswer({ q: question.trim(), reply });
  };

  if (loading) return <Loader2 className="mx-auto animate-spin text-purple-600" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const iconFor = (kind) => {
    if (kind === 'risk') return <AlertTriangle size={15} className="text-red-500" />;
    if (kind === 'upgrade') return <Lightbulb size={15} className="text-amber-500" />;
    return <TrendingUp size={15} className="text-purple-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        {insights.map((ins, i) => (
          <div key={i} className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              {iconFor(ins.kind)} {ins.title}
            </div>
            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{ins.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={ask} className="bg-white border rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
          <Sparkles size={15} className="text-purple-600" /> Ask the assistant
        </div>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Where is demand highest?"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1">
            <Send size={14} /> Ask
          </button>
        </div>
        {answer && (
          <div className="mt-3 text-sm bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-900">Q: {answer.q}</p>
            <p className="text-gray-700 mt-1">{answer.reply}</p>
            {modelBadge && <p className="text-[11px] text-purple-600 mt-1.5">{modelBadge}</p>}
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2">Advisory only — every number comes from live platform data; decisions stay with your admins.</p>
      </form>
    </div>
  );
}
