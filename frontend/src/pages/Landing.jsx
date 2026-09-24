import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EASE } from '../motion/tokens';
import { usePrefersReducedMotion } from '../motion/hooks';
import { Shield, Users, Brain, CreditCard, MapPin, BarChart3 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const FEATURES = [
  { icon: Shield, title: 'Cooperative Control', desc: 'The cooperative remains the operational control layer — AI never overrides.' },
  { icon: Users, title: 'Verified Workers', desc: 'Registered, skill-profiled and background-checked workforce.' },
  { icon: Brain, title: 'Explainable Matching', desc: 'Every recommendation shows its reasons: skill, distance, fairness.' },
  { icon: CreditCard, title: 'Transparent Payouts', desc: 'Server-computed payouts — no hidden cuts, no frontend math.' },
  { icon: MapPin, title: 'Live Tracking', desc: 'Request to invoice status, visible to customer, worker and society.' },
  { icon: BarChart3, title: 'Workforce Analytics', desc: 'Demand and utilization insights for federations and societies.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const reduce = usePrefersReducedMotion();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero — exactly like screenshot: soft blue → indigo gradient, centered */}
      <section className="relative bg-gradient-to-br from-blue-600 via-[#4f46e5] to-indigo-600 text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-20 sm:pb-28 text-center">
          <motion.h1
            initial={reduce?false:{opacity:0,y:12}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.6, delay:0.1, ease:EASE.out}}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
          >
            CO-LAB CONNECT
          </motion.h1>
          <motion.p
            initial={reduce?false:{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.5, delay:0.18, ease:EASE.out}}
            className="mt-3 text-base sm:text-lg font-semibold text-blue-100"
          >
            Cooperative-Owned Digital Workforce Operating System
          </motion.p>
          <motion.p
            initial={reduce?false:{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.5, delay:0.24, ease:EASE.out}}
            className="mt-2 text-sm sm:text-base text-blue-100/80 max-w-2xl mx-auto"
          >
            Connecting verified workers with households through cooperative governance
          </motion.p>
          <motion.div
            initial={reduce?false:{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.5, delay:0.32, ease:EASE.out}}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate('/register')}
              className="px-7 py-2.5 rounded-lg bg-white text-indigo-700 font-bold text-sm shadow-md hover:bg-blue-50 transition"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-7 py-2.5 rounded-lg bg-transparent border-2 border-white text-white font-bold text-sm hover:bg-white/10 transition"
            >
              Login
            </button>
          </motion.div>
        </div>
        {/* soft bottom fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* Why */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <motion.div
          initial={reduce?false:{opacity:0,y:12}}
          whileInView={{opacity:1,y:0}}
          viewport={{once:true, margin:'-60px'}}
          transition={{duration:0.5, ease:EASE.out}}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Why CO-LAB CONNECT?</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto">
            A platform built on cooperative principles for fair, verified, and smart workforce management
          </p>
        </motion.div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={reduce?false:{opacity:0,y:12}}
              whileInView={{opacity:1,y:0}}
              viewport={{once:true, margin:'-40px'}}
              transition={{duration:0.4, delay: i * 0.05, ease:EASE.out}}
              className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition"
            >
              <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <f.icon size={18} />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 mt-3">{f.title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/register')} className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">Get Started →</button>
          <button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition">Sign in</button>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-bold tracking-widest text-slate-400">CO-LAB CONNECT • Cooperative-Owned Digital Workforce OS</span>
          <span className="text-xs text-slate-400">© {new Date().getFullYear()} CO-LAB CONNECT</span>
        </div>
      </footer>
    </div>
  );
}
