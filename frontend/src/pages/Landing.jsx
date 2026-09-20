import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Shield, Users, Brain, CreditCard, MapPin, BarChart3,
  Zap, Droplets, Hammer, Sparkles, Baby, PawPrint,
  ArrowRight, ChevronRight, HeartHandshake, BadgeCheck, Network,
} from 'lucide-react';

const SERVICES = [
  { icon: Zap, name: 'Electrician', color: 'from-yellow-400 to-orange-500' },
  { icon: Droplets, name: 'Plumber', color: 'from-blue-400 to-cyan-500' },
  { icon: Hammer, name: 'Carpenter', color: 'from-amber-500 to-orange-600' },
  { icon: Sparkles, name: 'Cleaner', color: 'from-green-400 to-emerald-500' },
  { icon: Baby, name: 'Nanny', color: 'from-pink-400 to-rose-500' },
  { icon: PawPrint, name: 'Pet Care', color: 'from-purple-400 to-indigo-500' },
];

const AUDIENCES = {
  customer: {
    title: 'For Customers',
    points: ['Verified workers with skill profiles', 'Live tracking from request to invoice', 'Transparent ₹ pricing — no hidden cuts', 'Ratings that actually matter'],
    cta: 'Request a service',
    to: '/register',
  },
  worker: {
    title: 'For Workers',
    points: ['Keep 88% of every job', '2% of each job builds your welfare fund', 'Fair matching — no bidding wars', 'Ratings that bring repeat work'],
    cta: 'Join as a worker',
    to: '/register',
  },
  cooperative: {
    title: 'For Cooperatives',
    points: ['Command center for requests & allocations', 'AI-ranked candidates — you decide', 'Bulk workforce hiring in one requirement', 'Demand analytics & welfare oversight'],
    cta: 'Run your society',
    to: '/register',
  },
};

function NetworkVisual() {
  const nodes = [
    { x: 60, y: 150, icon: '🏠', label: 'Customer' },
    { x: 200, y: 60, icon: '🏛️', label: 'Cooperative' },
    { x: 200, y: 240, icon: '🤖', label: 'AI assist' },
    { x: 340, y: 150, icon: '👷', label: 'Worker' },
  ];
  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto" role="img" aria-label="Customer, cooperative, AI and worker connected">
      <line x1="60" y1="150" x2="200" y2="60" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="5 5" className="cc-flow-line" />
      <line x1="60" y1="150" x2="200" y2="240" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="5 5" className="cc-flow-line" />
      <line x1="200" y1="60" x2="340" y2="150" stroke="rgba(255,255,255,.5)" strokeWidth="2.5" />
      <line x1="200" y1="240" x2="340" y2="150" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="5 5" className="cc-flow-line" />
      {nodes.map((n) => (
        <g key={n.label}>
          <circle cx={n.x} cy={n.y} r="26" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
          <text x={n.x} y={n.y + 7} textAnchor="middle" fontSize="20">{n.icon}</text>
          <text x={n.x} y={n.y + 44} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.85)" fontWeight="600">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [audience, setAudience] = useState('customer');
  const a = AUDIENCES[audience];

  return (
    <div className="min-h-screen bg-[#f5f6fb]">
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-[#141233] via-[#2b2580] to-[#4f46e5] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-16 left-1/4 w-72 h-72 bg-indigo-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="cc-enter">
            <p className="cc-eyebrow text-indigo-200">Cooperative-first workforce marketplace</p>
            <h1 className="cc-h-display mt-2">Trusted Services.<br />Fair Opportunities.<br />Stronger Cooperatives.</h1>
            <p className="text-indigo-100 mt-4 max-w-lg">
              Connecting customers with verified workers through cooperative-powered workforce management.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button onClick={() => navigate('/register')}
                className="cc-btn px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-xl shadow-lg text-base">
                Get Started
              </button>
              <button onClick={() => navigate('/login')}
                className="cc-btn px-8 py-3.5 border-2 border-white/60 text-white font-semibold rounded-xl hover:bg-white/10 text-base">
                Login
              </button>
            </div>
            <div className="flex gap-5 mt-8 text-sm">
              {[['88%', 'worker payout'], ['2%', 'welfare fund'], ['100%', 'verified workers']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-extrabold">{v}</p>
                  <p className="text-indigo-200 text-xs">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="cc-enter hidden md:block">
            <NetworkVisual />
          </div>
        </div>
        <div className="h-10 bg-gradient-to-t from-[#f5f6fb] to-transparent" />
      </section>

      {/* FLOW STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-4">
        <div className="cc-glass rounded-2xl px-5 py-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-semibold text-gray-700">
          {['Request', 'AI match', 'Cooperative allocates', 'Worker serves', 'Fair payout'].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              {s}
              {i < arr.length - 1 && <ArrowRight size={12} className="text-gray-300" />}
            </span>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center">Why CO-LAB CONNECT?</h2>
        <p className="text-gray-500 text-center mt-2 mb-10">Built on cooperative principles — not middleman commissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Shield, title: 'Cooperative Control', desc: 'The cooperative remains the operational control layer — AI never overrides.' },
            { icon: BadgeCheck, title: 'Verified Workers', desc: 'Registered, skill-profiled and background-checked workforce.' },
            { icon: Brain, title: 'Explainable Matching', desc: 'Every recommendation shows its reasons: skill, distance, fairness.' },
            { icon: CreditCard, title: 'Honest Money', desc: '₹500 → ₹50 society + ₹10 welfare + ₹440 worker. Computed server-side.' },
            { icon: MapPin, title: 'Live Tracking', desc: 'Request to invoice status, visible to customer, worker and society.' },
            { icon: HeartHandshake, title: 'Worker Welfare', desc: '2% of every job builds insurance and support funds.' },
          ].map((f) => (
            <div key={f.title} className="cc-card cc-card-hover cc-glass rounded-2xl p-6">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
                <f.icon className="text-white" size={22} />
              </div>
              <h3 className="font-bold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AUDIENCES */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {Object.entries(AUDIENCES).map(([k, v]) => (
              <button key={k} onClick={() => setAudience(k)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${audience === k ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {v.title}
              </button>
            ))}
          </div>
          <div key={audience} className="cc-enter max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-extrabold text-gray-900">{a.title}</h3>
            <ul className="mt-4 space-y-2.5 text-left inline-block">
              {a.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="text-emerald-500 font-bold">✓</span>{p}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <button onClick={() => navigate(a.to)}
                className="cc-btn px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl">
                {a.cta} <ChevronRight size={16} className="inline" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center">One network, every household need</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
          {SERVICES.map((s) => (
            <button key={s.name} onClick={() => navigate('/register')}
              className="cc-card cc-card-hover bg-white rounded-2xl p-5 text-center border border-gray-100">
              <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-2.5`}>
                <s.icon className="text-white" size={26} />
              </span>
              <span className="font-bold text-gray-900 text-sm">{s.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* TRUST + CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white p-8 sm:p-12 text-center shadow-xl">
          <Network size={28} className="mx-auto mb-3 text-emerald-100" />
          <h2 className="text-2xl sm:text-3xl font-extrabold">AI recommends. The cooperative decides.</h2>
          <p className="text-emerald-50 mt-2 max-w-xl mx-auto text-sm">Join 33+ verified workers earning 88% of every job — with welfare on top.</p>
          <button onClick={() => navigate('/register')}
            className="cc-btn mt-6 px-10 py-3.5 bg-white text-emerald-700 font-bold rounded-xl text-base">
            Register Now
          </button>
        </div>
      </section>

      <footer className="bg-[#141233] text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-lg font-extrabold text-white">CO-LAB CONNECT</p>
            <p className="text-xs">Trusted Services. Fair Opportunities. Stronger Cooperatives.</p>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} CO-LAB CONNECT. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
