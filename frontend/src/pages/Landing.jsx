import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Shield, Users, Brain, CreditCard, MapPin, BarChart3,
  Zap, Droplets, Hammer, Sparkles, Baby, PawPrint,
  ArrowRight, ChevronRight, HeartHandshake, BadgeCheck, Network,
  Check, Clock, Star, TrendingUp, Layers, Building2, ScanLine,
  Wallet, Award, Calendar, Activity, ArrowUpRight, Play, Menu, X
} from 'lucide-react';
import { DUR, EASE, SPRING } from '../motion/tokens';
import { usePrefersReducedMotion } from '../motion/hooks';

// ── helpers ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 18, className = '' }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.55, delay, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
}

function Stagger({ children, stagger = 0.08 }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-48px' }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}
const cardReveal = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE.out } },
};

// ── Navbar — integrated with hero, not floating pill ───────────────────
function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // integrated header: at top it's part of hero (≈ transparent with hairline), after scroll becomes solid white header
  const headerCls = scrolled
    ? 'bg-white/92 backdrop-blur-xl border-b border-slate-200 shadow-sm'
    : 'bg-transparent border-b border-white/[0.08]';
  const linkCls = scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-indigo-100/85 hover:text-white';
  const logoText = scrolled ? 'text-slate-900' : 'text-white';
  return (
    <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${headerCls}`}>
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 h-[56px] flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e1b4b] to-[#4f46e5] text-white font-black text-[13px] flex items-center justify-center shadow-sm">CC</span>
          <span className={`hidden sm:block font-extrabold tracking-tight text-sm ${logoText}`}>CO-LAB CONNECT</span>
          <span className={`hidden lg:inline text-[10px] px-2 py-1 rounded-full font-bold tracking-widest ${scrolled ? 'bg-slate-900 text-white' : 'bg-white text-indigo-700'}`}>COOPERATIVE OS</span>
        </Link>
        <nav className={`hidden md:flex items-center gap-5 text-[13px] font-semibold ${linkCls}`}>
          <a href="#how" className="transition">How It Works</a>
          <a href="#services" className="transition">Services</a>
          <a href="#cooperative" className="transition">For Cooperatives</a>
          <a href="#trust" className="transition">Trust</a>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/login')} className={`hidden sm:inline-flex px-3.5 py-2 rounded-lg text-sm font-bold transition ${scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}>Login</button>
          <button onClick={() => navigate('/register')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0f172a] text-white text-sm font-bold shadow-md hover:bg-black transition active:scale-[0.98]">
            Get Started <ArrowUpRight size={14} />
          </button>
          <button onClick={() => setOpen(v => !v)} className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1">
          {[['How It Works', '#how'], ['Services', '#services'], ['For Cooperatives', '#cooperative'], ['Trust', '#trust']].map(([l, h]) => (
            <a key={l} href={h} onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">{l}</a>
          ))}
          <button onClick={() => navigate('/login')} className="mt-1 px-3 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white">Login</button>
        </div>
      )}
    </header>
  );
}

// ── Product visual — layered cards, readable, integrated ───────────────
function ProductPreview({ reduce }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [8, -8]);
  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className="relative w-full max-w-[460px] mx-auto lg:mx-0">
      {/* soft depth glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-teal-400/10 blur-2xl rounded-[28px] pointer-events-none" />
      {/* central main card */}
      <motion.div
        initial={reduce?false:{opacity:0, scale:0.96, y:8}}
        animate={{opacity:1, scale:1, y:0}}
        transition={{duration:0.55, delay:0.38, ease:EASE.out}}
        className="relative bg-white rounded-[20px] shadow-[0_20px_48px_-16px_rgba(15,23,42,0.30),0_1px_0_rgba(0,0,0,0.06)_inset] border border-slate-200 overflow-hidden"
      >
        <div className="h-9 flex items-center gap-1.5 px-4 border-b border-slate-100 bg-slate-50/70">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[11px] font-semibold text-slate-500 hidden sm:inline">New Service Request • Live</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE</span>
        </div>
        <div className="p-5">
          <p className="text-[11px] font-bold tracking-widest text-slate-400">NEW SERVICE REQUEST #4821</p>
          <h3 className="mt-2 text-[15px] font-extrabold text-slate-900 leading-tight">Electrical — Faulty bedroom wiring</h3>
          <p className="text-sm text-slate-600">Model Colony • Flat 402, Shanti Heights</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white font-bold text-xs"><Calendar size={12} /> Tomorrow 11:00–12:00</span>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">₹500</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">AI: 3 ranked</span>
            <span>• Skill • Distance • Fairness</span>
          </div>
          <div className="mt-3 h-px bg-slate-100" />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Cooperative will review → allocate</span>
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center"><ArrowRight size={12} /></span>
          </div>
        </div>
      </motion.div>

      {/* floating — AI matching — sits above central, minimal text cover */}
      <motion.div
        initial={reduce?false:{opacity:0, y:12, scale:0.96}}
        animate={{opacity:1, y:0, scale:1}}
        transition={{duration:0.5, delay:0.48, ease:EASE.out}}
        className="absolute -left-1 sm:-left-4 -top-12 sm:-top-10 w-[168px] rounded-2xl bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)] border border-slate-200 p-3 -rotate-[1deg]"
      >
        <p className="text-[10px] font-extrabold tracking-widest text-indigo-600">AI MATCHING</p>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between rounded-xl bg-indigo-600 text-white px-2.5 py-1.5">
            <span className="text-xs font-bold">A. Verma</span><span className="text-xs font-black">92%</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5">
            <span className="text-xs font-semibold text-slate-700">S. Khan</span><span className="text-xs font-bold text-slate-500">87%</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5">
            <span className="text-xs font-semibold text-slate-700">R. Joshi</span><span className="text-xs font-bold text-slate-500">84%</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Explainable • ranked</p>
      </motion.div>

      {/* floating — worker allocated — sits to the right, mid */}
      <motion.div
        initial={reduce?false:{opacity:0, y:12, scale:0.96}}
        animate={{opacity:1, y:0, scale:1}}
        transition={{duration:0.5, delay:0.56, ease:EASE.out}}
        className="absolute -right-2 sm:-right-5 top-[92px] sm:top-[76px] w-[160px] rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-[0_12px_32px_-12px_rgba(16,185,129,0.45)] p-3 rotate-[0.8deg]"
      >
        <p className="text-[10px] font-bold tracking-widest text-white/70">WORKER ALLOCATED</p>
        <p className="mt-1 text-sm font-extrabold">A. Verma</p>
        <p className="text-xs text-white/80">Electrician • 4.8 ★</p>
        <div className="mt-2 rounded-xl bg-white text-slate-900 px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-xs font-bold">Accepted</span><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </motion.div>

      {/* floating — payout */}
      <motion.div
        initial={reduce?false:{opacity:0, y:12, scale:0.96}}
        animate={{opacity:1, y:0, scale:1}}
        transition={{duration:0.5, delay:0.64, ease:EASE.out}}
        className="absolute left-1/2 -translate-x-1/2 -bottom-5 w-[246px] rounded-2xl bg-white shadow-[0_16px_32px_-12px_rgba(15,23,42,0.24)] border border-slate-200 p-3"
      >
        <p className="text-[10px] font-extrabold tracking-widest text-slate-400 text-center">FAIR PAYOUT</p>
        <div className="mt-2 grid grid-cols-3 text-center divide-x divide-slate-100 text-xs">
          <span><b className="block text-slate-900">₹500</b><span className="text-slate-500">Customer</span></span>
          <span><b className="block text-slate-900">₹50+₹10</b><span className="text-slate-500">Society + Welfare</span></span>
          <span className="text-emerald-600"><b className="block">₹440</b><span>Worker</span></span>
        </div>
      </motion.div>

      <p className="text-center text-[11px] text-indigo-200/60 mt-8">Live preview — real cooperative console data</p>
    </motion.div>
  );
}

const SERVICES = [
  { icon: Zap, name: 'Electrician', color: 'from-amber-400 to-orange-500', note: 'Wiring, repair, installs' },
  { icon: Droplets, name: 'Plumber', color: 'from-sky-400 to-blue-600', note: 'Leakage, fittings, pipes' },
  { icon: Hammer, name: 'Carpenter', color: 'from-amber-600 to-orange-700', note: 'Furniture, doors, repair' },
  { icon: Sparkles, name: 'Cleaner', color: 'from-emerald-400 to-teal-600', note: 'Home & deep cleaning' },
  { icon: Baby, name: 'Nanny', color: 'from-pink-400 to-rose-500', note: 'Childcare, trusted' },
  { icon: PawPrint, name: 'Pet Care', color: 'from-violet-400 to-indigo-500', note: 'Sitting, walking' },
];

const STEPS = [
  { n: '01', t: 'Customer request', d: 'Service, location, date/time and urgency — one guided flow.', icon: ScanLine },
  { n: '02', t: 'AI-assisted matching', d: 'Ranks verified workers by skill, distance, availability and fairness.', icon: Brain },
  { n: '03', t: 'Cooperative review', d: 'Society reviews ranked candidates and retains final allocation authority.', icon: Building2 },
  { n: '04', t: 'Worker allocation', d: 'Assigned worker accepts — customer and worker stay in sync.', icon: Users },
  { n: '05', t: 'Service & payment', d: 'Completion, transparent payout and automatic welfare contribution.', icon: Wallet },
  { n: '06', t: 'Feedback loop', d: 'Ratings build reputation and inform future matching.', icon: Star },
];

export default function Landing() {
  const navigate = useNavigate();
  const reduce = usePrefersReducedMotion();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.2]);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 overflow-x-hidden selection:bg-indigo-100">
      <LandingNav />

      {/* ── HERO — recomposed: compact first viewport, premium calm ── */}
      <section ref={heroRef} className="relative overflow-hidden bg-[#0b0e1f] text-white">
        {/* subtle background — supports, not competes */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute -top-20 -left-20 w-[640px] h-[420px] bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.22),_transparent_64%)] blur-2xl" />
          <div className="absolute -bottom-24 right-0 w-[560px] h-[420px] bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.14),_transparent_60%)] blur-2xl" />
          <div className="absolute top-[22%] right-[18%] w-64 h-64 bg-violet-500/10 blur-3xl rounded-full" />
        </div>

        <motion.div style={reduce ? undefined : { y: heroY, opacity: heroOpacity }} className="relative max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-[84px] sm:pt-[96px] pb-6 sm:pb-8">
          <div className="mt-2 grid lg:grid-cols-[1.12fr_0.88fr] gap-6 lg:gap-8 items-center">
            {/* headline — one strong statement, clean wrapping */}
            <div>
              <motion.div initial={reduce?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.5, delay:0.08, ease:EASE.out}}>
                <div className="inline-flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur text-xs font-semibold max-w-full">
                  <span className="px-2.5 py-1 rounded-full bg-white text-slate-900 font-extrabold text-xs shrink-0">NEW</span>
                  <span className="text-indigo-100 truncate"><span>Cooperative-first workforce OS</span><span className="hidden sm:inline"> — not a middleman marketplace</span></span>
                  <span className="hidden sm:inline-flex w-6 h-6 rounded-full bg-white/15 items-center justify-center shrink-0"><ArrowUpRight size={12} /></span>
                </div>
              </motion.div>
              <motion.h1 initial={reduce?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.55, delay:0.14, ease:EASE.out}} className="mt-4 text-[30px] sm:text-[38px] lg:text-[44px] xl:text-[48px] font-black tracking-[-0.03em] leading-[0.92]">
                <span className="block">Trusted Services.</span>
                <span className="block bg-gradient-to-r from-indigo-200 via-violet-200 to-teal-100 bg-clip-text text-transparent">Fair Opportunities.</span>
                <span className="block">Stronger Cooperatives.</span>
              </motion.h1>
              <motion.p initial={reduce?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.5, delay:0.20, ease:EASE.out}} className="mt-3 text-[14px] sm:text-[15px] leading-6 text-indigo-100/80 max-w-[520px]">
                One platform connecting customers with verified cooperative workers — societies and federations manage allocation fairly. AI ranks, the cooperative decides.
              </motion.p>
              <motion.div initial={reduce?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.5, delay:0.26, ease:EASE.out}} className="mt-6 flex flex-col sm:flex-row gap-3">
                <motion.button whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.97 }} transition={SPRING.button} onClick={() => navigate('/register')} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-extrabold text-sm shadow-[0_12px_32px_-12px_rgba(255,255,255,0.45)] hover:bg-slate-50 transition will-change-transform">
                  Get Started <ArrowRight size={16} />
                </motion.button>
                <motion.a whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} href="#how" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-sm hover:bg-white/15 transition will-change-transform">
                  <Play size={14} /> Explore How It Works
                </motion.a>
              </motion.div>
              {/* small trust indicators — replaces generic stats */}
              <motion.div initial={reduce?false:{opacity:0}} animate={{opacity:1}} transition={{duration:0.5, delay:0.34}} className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-indigo-100/75">
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-300" /> Verified cooperative workers</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-300" /> Transparent payout</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-300" /> Cooperative-controlled allocation</span>
              </motion.div>
              {/* ecosystem visual — small, important */}
              <motion.div initial={reduce?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.5, delay:0.40}} className="mt-5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur px-3 py-2.5 flex items-center justify-between gap-1 text-[11px] font-bold max-w-[520px]">
                {[
                  { k: 'CUSTOMER', sub: 'Request' },
                  { k: 'CO-LAB', sub: 'AI ranks' },
                  { k: 'CO-OP', sub: 'Reviews' },
                  { k: 'WORKER', sub: 'Serves' },
                ].map((s,i,arr)=> (
                  <span key={s.k} className="flex items-center gap-1">
                    <span className="text-center leading-none">
                      <span className="block text-white">{s.k}</span>
                      <span className="block text-[10px] font-semibold text-indigo-200/60">{s.sub}</span>
                    </span>
                    {i < arr.length-1 && <ArrowRight size={10} className="text-white/25 mx-1" />}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* product visual — layered cards, readable */}
            <motion.div initial={reduce?false:{opacity:0, y:16, scale:0.97}} animate={{opacity:1, y:0, scale:1}} transition={{duration:0.6, delay:0.30, ease:EASE.out}} className="lg:sticky lg:top-[72px]">
              <ProductPreview reduce={reduce} />
            </motion.div>
          </div>
        </motion.div>

        {/* bottom fade — shorter */}
        <div className="h-6 bg-gradient-to-t from-[#f6f7fb] to-transparent relative" />
      </section>

      {/* ── LOGO / FLOW STRIP ── */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <Reveal>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.16)] px-3 sm:px-6 py-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold text-slate-700">
            {['Request', 'AI ranks', 'Cooperative reviews', 'Worker serves', 'Fair payout'].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                {s}
                {i < arr.length - 1 && <ArrowRight size={12} className="text-slate-300" />}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16">
        <Reveal>
          <p className="text-xs font-extrabold tracking-widest text-indigo-600">HOW CO-LAB CONNECT WORKS</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">Human decisions, <span className="text-indigo-600">assisted</span> by AI.</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">Every job follows one accountable flow. AI proposes — the society disposes. Payments and welfare are computed server-side.</p>
        </Reveal>

        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          {/* stepped cards with connector */}
          <div className="relative">
            <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-indigo-200 via-violet-200 to-teal-200 hidden sm:block" />
            <Stagger>
              {STEPS.map((s, i) => (
                <motion.div key={s.n} variants={cardReveal} className="relative flex gap-4 py-3">
                  <span className="hidden sm:flex w-9 h-9 rounded-xl bg-slate-900 text-white text-xs font-black items-center justify-center shrink-0 mt-1 shadow">{s.n}</span>
                  <div className="flex-1 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><s.icon size={16} /></span>
                      <h3 className="font-extrabold text-sm">{s.t}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{s.d}</p>
                  </div>
                </motion.div>
              ))}
            </Stagger>
          </div>

          {/* side principle card */}
          <Reveal delay={0.08}>
            <div className="lg:sticky lg:top-24 rounded-[24px] bg-slate-900 text-white p-6 sm:p-7 shadow-xl overflow-hidden relative">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/30 blur-2xl rounded-full" />
              <p className="text-xs font-extrabold tracking-widest text-indigo-300">PRINCIPLE</p>
              <h3 className="mt-2 text-xl font-black">AI recommends. The cooperative decides.</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">No auto-allocation. Every recommendation is explainable — skill, distance, availability and fairness — and the society allocates.</p>
              <div className="mt-5 rounded-2xl bg-white text-slate-900 p-4">
                <p className="text-xs font-bold tracking-widest text-slate-400">EXAMPLE FACTORS</p>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Skill & verification</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Distance & time slot</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Past performance & fairness</li>
                </ul>
              </div>
              <button onClick={() => navigate('/register')} className="mt-5 w-full py-3 rounded-xl bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-50 transition">See it in the console →</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CUSTOMER EXPERIENCE ── */}
      <section id="customer" className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <Reveal>
          <div className="rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden grid lg:grid-cols-2">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-extrabold tracking-widest text-emerald-600">FOR CUSTOMERS</p>
              <h3 className="mt-2 text-2xl font-black">Request. Track. Relax.</h3>
              <p className="mt-2 text-sm text-slate-500">Browse services, create a guided request, and follow the job from allocation to invoice — no phone-tag.</p>
              <ul className="mt-5 space-y-3 text-sm">
                {['Browse by category', 'Guided request with location & schedule', 'Live status: pending → allocated → completed', 'Transparent invoice & rating'].map(t => (
                  <li key={t} className="flex gap-2"><span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} /></span><span className="text-slate-700">{t}</span></li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')} className="mt-6 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition">Request a service</button>
            </div>
            <div className="bg-slate-50 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-slate-200">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-bold tracking-widest text-slate-400">YOUR BOOKING</p>
                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">In progress</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><Zap size={18} /></span>
                    <div>
                      <p className="text-sm font-bold">Electrical — Wiring fix</p>
                      <p className="text-xs text-slate-500">A. Verma • En route • 11:30 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    {['Requested', 'Ranked', 'Allocated', 'En route'].map((s, i) => (
                      <span key={s} className="flex items-center gap-1.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>{i < 2 ? '✓' : i + 1}</span>
                        <span className="hidden sm:inline">{s}</span>
                        {i < 3 && <span className={`hidden sm:block w-6 h-0.5 ${i < 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-xl bg-slate-900 text-white p-3 flex items-center justify-between">
                    <span className="text-xs text-white/70">Amount</span><span className="font-extrabold">₹500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── WORKER EXPERIENCE ── */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Reveal>
          <div className="rounded-[28px] bg-[#0f172a] text-white overflow-hidden grid lg:grid-cols-2">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-extrabold tracking-widest text-teal-300">FOR WORKERS</p>
              <h3 className="mt-2 text-2xl font-black">Fair work. Real growth.</h3>
              <p className="mt-2 text-sm text-white/70">Accept allocated jobs, complete services, keep 88% of every job and build a portable work history.</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { k: 'Payout', v: '88%' },
                  { k: 'Welfare', v: '2%' },
                  { k: 'Rating', v: '4.8★' },
                ].map(x => (
                  <div key={x.k} className="rounded-2xl bg-white/10 border border-white/10 p-3">
                    <p className="text-xs text-white/60">{x.k}</p><p className="text-lg font-black">{x.v}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/register')} className="mt-6 px-5 py-3 rounded-xl bg-white text-slate-900 font-extrabold text-sm">Join as a worker</button>
            </div>
            <div className="bg-white/5 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-white/10">
              <div className="space-y-3">
                {[
                  { t: 'Available jobs', s: '2 new allocations', c: 'bg-emerald-500' },
                  { t: 'Job #4821 — Electrical', s: 'Accepted • Today 11 AM • ₹440 payout', c: 'bg-white text-slate-900' },
                  { t: 'Work history', s: '24 completed • 4.8★ avg', c: 'bg-white/10 border border-white/15' },
                ].map(r => (
                  <div key={r.t} className={`rounded-2xl p-4 ${r.c.includes('bg-white') && !r.c.includes('bg-white/10') ? 'bg-white text-slate-900 border border-slate-200' : r.c}`}>
                    <p className="text-sm font-bold">{r.t}</p><p className={`text-xs ${r.c.includes('emerald') ? 'text-white/90' : r.c.includes('bg-white') && !r.c.includes('bg-white/10') ? 'text-slate-500' : 'text-white/60'}`}>{r.s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── COOPERATIVE COMMAND CENTER ── */}
      <section id="cooperative" className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Reveal>
          <div className="rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-center">
              <div>
                <p className="text-xs font-extrabold tracking-widest text-indigo-600">FOR SOCIETIES & FEDERATIONS</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">A real command center — <span className="text-indigo-600">not a spreadsheet.</span></h3>
                <p className="mt-2 text-sm text-slate-500">Incoming requests, ranked candidates, allocations and workforce analytics in one place. Operates like modern B2B SaaS.</p>
                <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-sm">
                  {['Live request queue', 'AI-ranked candidates', 'One-click allocation', 'Workforce availability', 'Demand heatmap', 'Welfare oversight'].map(t => (
                    <li key={t} className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">✓</span>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-widest text-slate-500">LIVE QUEUE • 3 pending</p>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                {[
                  { id: '#4821 Electrical', meta: 'Model Colony • ₹500 • normal', badge: 'AI: 92%' },
                  { id: '#4820 Plumbing', meta: 'Kothrud • ₹700 • urgent', badge: 'AI: 88%' },
                  { id: '#4819 Cleaning', meta: 'Baner • ₹400 • normal', badge: 'AI: 85%' },
                ].map(r => (
                  <div key={r.id} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-3">
                    <div><p className="text-sm font-bold">{r.id}</p><p className="text-xs text-slate-500">{r.meta}</p></div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">{r.badge}</span>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-900 text-white p-3 text-center"><p className="text-xs text-white/60">Workers</p><p className="font-black">33</p></div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3 text-center"><p className="text-xs text-slate-500">Pending</p><p className="font-black">3</p></div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3 text-center"><p className="text-xs text-slate-500">Allocated</p><p className="font-black">12</p></div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── AI MATCHING ── */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Reveal>
          <div className="rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white overflow-hidden p-6 sm:p-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-xs font-extrabold tracking-widest text-indigo-200">AI-ASSISTED MATCHING</p>
                <h3 className="mt-2 text-2xl font-black">Smarter matching. Human-controlled decisions.</h3>
                <p className="mt-2 text-sm text-indigo-100/85">The engine explains every ranking. The cooperative reviews and allocates — AI never decides alone.</p>
                <div className="mt-5 inline-flex gap-2 flex-wrap">
                  {['AI-assisted recommendations', 'Explainable factors', 'Cooperative allocates'].map(t => (
                    <span key={t} className="px-3 py-1.5 rounded-full bg-white text-indigo-700 text-xs font-bold">{t}</span>
                  ))}
                </div>
              </div>
              {/* viz */}
              <div className="rounded-2xl bg-white text-slate-900 p-4 sm:p-5">
                <p className="text-xs font-bold tracking-widest text-slate-400 text-center">REQUEST → RANK → REVIEW → ALLOCATE</p>
                <div className="mt-4 flex items-start justify-between gap-2">
                  <div className="text-center flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto"><ScanLine size={18} /></div>
                    <p className="text-xs font-bold mt-1.5">Request</p>
                  </div>
                  <span className="mt-5 text-slate-300">→</span>
                  <div className="text-center flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto"><Brain size={18} /></div>
                    <p className="text-xs font-bold mt-1.5">AI ranks</p>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <p className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold">A. Verma 92%</p>
                      <p className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">S. Khan 87%</p>
                    </div>
                  </div>
                  <span className="mt-5 text-slate-300">→</span>
                  <div className="text-center flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto"><BadgeCheck size={18} /></div>
                    <p className="text-xs font-bold mt-1.5">Coop decides</p>
                    <p className="mt-2 text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">Allocated ✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── TRUST ── */}
      <section id="trust" className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Stagger>
          <motion.div variants={cardReveal} className="text-center">
            <p className="text-xs font-extrabold tracking-widest text-slate-400">TRUST & VERIFICATION</p>
            <h3 className="mt-2 text-2xl font-black">Verification you can see.</h3>
          </motion.div>
          <div className="mt-6 grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Shield, t: 'Verified workers', d: 'Background & skill checks' },
              { icon: Building2, t: 'Cooperative-based', d: 'Society-managed workforce' },
              { icon: Layers, t: 'Transparent', d: 'Explainable allocation' },
              { icon: Calendar, t: 'Service history', d: 'Every job tracked' },
              { icon: Star, t: 'Ratings', d: 'Reputation that matters' },
              { icon: Wallet, t: 'Secure payouts', d: 'Server-computed' },
            ].map(f => (
              <motion.div key={f.t} variants={cardReveal} className="rounded-2xl bg-white border border-slate-200 p-4 text-center">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto"><f.icon size={16} /></span>
                <p className="text-sm font-bold mt-2">{f.t}</p>
                <p className="text-xs text-slate-500 mt-1">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ── PAYOUT + ANALYTICS row ── */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid lg:grid-cols-2 gap-6">
        <Reveal>
          <div className="rounded-[24px] bg-white border border-slate-200 p-6 shadow-sm h-full">
            <p className="text-xs font-extrabold tracking-widest text-slate-400">FAIR PAYOUT</p>
            <h4 className="mt-1 font-black">Every rupee, explained.</h4>
            <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-3 text-center divide-x divide-slate-200">
                <div className="p-4 bg-slate-50"><p className="text-xs text-slate-500">Customer pays</p><p className="font-black">₹500</p></div>
                <div className="p-4"><p className="text-xs text-slate-500">Society 10%</p><p className="font-black">₹50</p></div>
                <div className="p-4"><p className="text-xs text-slate-500">Welfare 2%</p><p className="font-black">₹10</p></div>
              </div>
              <div className="p-4 bg-emerald-50 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700">Worker receives</span><span className="text-lg font-black text-emerald-700">₹440</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">No hidden cuts. Backend-computed via Decimal.</p>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <div className="rounded-[24px] bg-slate-900 text-white p-6 h-full">
            <p className="text-xs font-extrabold tracking-widest text-white/60">ANALYTICS</p>
            <h4 className="mt-1 font-black">Know your workforce.</h4>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { k: 'Availability', v: '82%', trend: '+4%' },
                { k: 'Demand', v: 'High', trend: 'Pune' },
                { k: 'Satisfaction', v: '4.7★', trend: '+0.2' },
              ].map(a => (
                <div key={a.k} className="rounded-2xl bg-white/10 border border-white/10 p-3">
                  <p className="text-xs text-white/60">{a.k}</p><p className="font-black">{a.v}</p><p className="text-xs text-emerald-300">{a.trend}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[68%] bg-white rounded-full" />
            </div>
            <p className="text-xs text-white/50 mt-2">Allocation trend • Welfare contribution • Completion rate</p>
          </div>
        </Reveal>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <Reveal>
          <h3 className="text-2xl font-black text-center">One network, every household need</h3>
          <p className="text-sm text-slate-500 text-center mt-1">Verified professionals across 6+ categories — one cooperative network.</p>
        </Reveal>
        <Stagger>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SERVICES.map(s => (
              <motion.button
                key={s.name}
                variants={cardReveal}
                whileHover={{ y: -4, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/register')}
                className="rounded-2xl bg-white border border-slate-200 p-5 text-center hover:shadow-lg hover:border-slate-300 transition text-left"
              >
                <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto`}>
                  <s.icon className="text-white" size={20} />
                </span>
                <p className="font-bold text-sm mt-3">{s.name}</p>
                <p className="text-xs text-slate-500">{s.note}</p>
              </motion.button>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ── ROLES ── */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <Reveal>
          <h3 className="text-2xl font-black text-center">One platform, five roles.</h3>
          <p className="text-sm text-slate-500 text-center mt-1">Each role sees only what it needs — same trusted foundation.</p>
        </Reveal>
        <Stagger>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { r: 'Customer', d: 'Find & track trusted services', c: 'bg-indigo-600' },
              { r: 'Worker', d: 'Access fair, rated opportunities', c: 'bg-emerald-600' },
              { r: 'Society', d: 'Manage local workforce', c: 'bg-blue-600' },
              { r: 'Federation', d: 'Coordinate the network', c: 'bg-violet-600' },
              { r: 'Admin', d: 'Govern & audit the platform', c: 'bg-slate-900' },
            ].map(x => (
              <motion.div key={x.r} variants={cardReveal} className="rounded-2xl bg-white border border-slate-200 p-4">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold text-white ${x.c}`}>{x.r}</span>
                <p className="text-sm text-slate-600 mt-2">{x.d}</p>
              </motion.div>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <Reveal>
          <div className="rounded-[28px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 overflow-hidden relative">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-indigo-500/30 blur-3xl rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-teal-500/20 blur-3xl rounded-full" />
            <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight">Build stronger communities<br />through better workforce connections.</h3>
                <p className="mt-2 text-sm text-white/70">Join customers, workers and cooperatives on one accountable platform.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => navigate('/register')} className="px-6 py-3 rounded-xl bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-50 transition">Get Started</button>
                  <button onClick={() => navigate('/login')} className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/15 transition">Explore CO-LAB CONNECT</button>
                </div>
              </div>
              <div className="rounded-2xl bg-white text-slate-900 p-4">
                <p className="text-xs font-bold tracking-widest text-slate-400">WHY NOW</p>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="flex gap-2"><Check size={14} className="text-emerald-500 mt-0.5" /> Cooperative-first, not commission-first</li>
                  <li className="flex gap-2"><Check size={14} className="text-emerald-500 mt-0.5" /> AI assists — society decides</li>
                  <li className="flex gap-2"><Check size={14} className="text-emerald-500 mt-0.5" /> Welfare built into every job</li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="font-black tracking-tight">CO-LAB CONNECT</p>
            <p className="text-xs text-slate-500">Trusted Services. Fair Opportunities. Stronger Cooperatives. • Cooperative-Owned Digital Workforce OS</p>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} CO-LAB CONNECT • Built for SIH 2026</p>
        </div>
      </footer>
    </div>
  );
}
