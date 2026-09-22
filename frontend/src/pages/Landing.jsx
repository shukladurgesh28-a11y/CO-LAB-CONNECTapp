import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Shield, Users, Brain, CreditCard, MapPin, BarChart3,
  Zap, Droplets, Hammer, Sparkles, Baby, PawPrint,
  ArrowRight, ChevronRight, HeartHandshake, BadgeCheck, Network,
  Check, Clock, Star, TrendingUp, Layers, Building2, ScanLine,
  Wallet, Award, Calendar, Activity, ArrowUpRight, Play, Menu, X,
  ChevronDown, Globe, Fingerprint, Scale, Eye
} from 'lucide-react';
import { DUR, EASE, SPRING } from '../motion/tokens';
import { usePrefersReducedMotion, useCountUp } from '../motion/hooks';

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS — animation wrappers
   ═══════════════════════════════════════════════════════════════════════ */

function Reveal({ children, delay = 0, y = 24, className = '' }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
}

function Stagger({ children, stagger = 0.07, className = '' }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

const cardV = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE.out } },
};

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATED STAT COUNTER
   ═══════════════════════════════════════════════════════════════════════ */

function StatCounter({ value, suffix = '', label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const count = useCountUp(inView ? value : 0, 1200);
  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl sm:text-5xl font-black tracking-tight text-white">
        {Math.round(count)}{suffix}
      </p>
      <p className="text-sm text-white/50 mt-1 font-medium">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   NAVBAR — premium transparent → solid transition
   ═══════════════════════════════════════════════════════════════════════ */

function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const headerBg = scrolled
    ? 'bg-white/90 backdrop-blur-2xl border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
    : 'bg-transparent border-b border-white/[0.06]';
  const linkStyle = scrolled
    ? 'text-slate-500 hover:text-slate-900'
    : 'text-white/60 hover:text-white';
  const logoColor = scrolled ? 'text-slate-900' : 'text-white';

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${headerBg}`}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-[13px] flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">CC</span>
          <span className={`hidden sm:block font-extrabold tracking-tight text-sm transition-colors ${logoColor}`}>CO-LAB CONNECT</span>
        </Link>

        <nav className={`hidden md:flex items-center gap-6 text-[13px] font-semibold transition-colors ${linkStyle}`}>
          <a href="#how" className="transition-colors duration-200">How It Works</a>
          <a href="#services" className="transition-colors duration-200">Services</a>
          <a href="#cooperative" className="transition-colors duration-200">For Cooperatives</a>
          <a href="#trust" className="transition-colors duration-200">Trust</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/login')}
            className={`hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${scrolled ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            Login
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold shadow-lg shadow-white/10 hover:shadow-white/20 transition-shadow"
          >
            Get Started <ArrowUpRight size={14} />
          </motion.button>
          <button
            onClick={() => setOpen(v => !v)}
            className={`md:hidden p-2 rounded-lg transition ${scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl px-5 py-3 flex flex-col gap-1"
        >
          {[['How It Works', '#how'], ['Services', '#services'], ['For Cooperatives', '#cooperative'], ['Trust', '#trust']].map(([l, h]) => (
            <a key={l} href={h} onClick={() => setOpen(false)} className="px-3 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">{l}</a>
          ))}
          <button onClick={() => { setOpen(false); navigate('/login'); }} className="mt-2 px-3 py-3 rounded-xl text-sm font-bold bg-slate-900 text-white">Login</button>
        </motion.div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HERO PRODUCT MOCKUP — single clean app window
   ═══════════════════════════════════════════════════════════════════════ */

function HeroMockup({ reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.35, ease: EASE.out }}
      className="relative w-full max-w-[520px] mx-auto"
    >
      {/* Glow behind the card */}
      <div className="absolute -inset-8 bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-teal-400/10 blur-3xl rounded-[32px] pointer-events-none" />

      {/* Main app window */}
      <div className="relative bg-[#0c0f1a]/90 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Window chrome */}
        <div className="h-10 flex items-center gap-2 px-4 border-b border-white/[0.06] bg-white/[0.03]">
          <span className="w-3 h-3 rounded-full bg-white/10" />
          <span className="w-3 h-3 rounded-full bg-white/10" />
          <span className="w-3 h-3 rounded-full bg-white/10" />
          <span className="mx-auto text-[11px] font-semibold text-white/30 tracking-wide">colabconnect.app/console</span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-indigo-400/80">INCOMING REQUEST</p>
              <h3 className="text-base font-extrabold text-white mt-0.5">Electrical — Faulty wiring</h3>
              <p className="text-xs text-white/40">Model Colony • Flat 402 • Shanti Heights</p>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>

          {/* AI Ranked Candidates */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3.5">
            <p className="text-[10px] font-bold tracking-[0.15em] text-white/40 mb-2.5">AI-RANKED CANDIDATES</p>
            <div className="space-y-2">
              {[
                { name: 'A. Verma', score: 92, skill: 'Electrician', rating: '4.8★', selected: true },
                { name: 'S. Khan', score: 87, skill: 'Electrician', rating: '4.6★', selected: false },
                { name: 'R. Joshi', score: 84, skill: 'Electrician', rating: '4.5★', selected: false },
              ].map((w, i) => (
                <div key={w.name} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${w.selected ? 'bg-indigo-500/15 border border-indigo-500/25' : 'bg-white/[0.02] border border-white/[0.04]'}`}>
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${w.selected ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/50'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${w.selected ? 'text-white' : 'text-white/60'}`}>{w.name}</p>
                    <p className="text-[11px] text-white/30">{w.skill} • {w.rating}</p>
                  </div>
                  <div className={`text-right ${w.selected ? '' : 'opacity-50'}`}>
                    <span className={`text-sm font-black ${w.selected ? 'text-indigo-300' : 'text-white/40'}`}>{w.score}%</span>
                    <p className="text-[10px] text-white/25">match</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payout strip */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-center">
              <p className="text-[10px] text-white/30">Service</p>
              <p className="text-sm font-black text-white">₹500</p>
            </div>
            <ArrowRight size={12} className="text-white/20 shrink-0" />
            <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-center">
              <p className="text-[10px] text-white/30">Coop 10% + Welfare 2%</p>
              <p className="text-sm font-black text-white/60">₹60</p>
            </div>
            <ArrowRight size={12} className="text-white/20 shrink-0" />
            <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center">
              <p className="text-[10px] text-emerald-400/60">Worker</p>
              <p className="text-sm font-black text-emerald-400">₹440</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════ */

const SERVICES = [
  { icon: Zap, name: 'Electrician', color: 'from-amber-400 to-orange-500', note: 'Wiring, repair, installs' },
  { icon: Droplets, name: 'Plumber', color: 'from-sky-400 to-blue-600', note: 'Leakage, fittings, pipes' },
  { icon: Hammer, name: 'Carpenter', color: 'from-amber-600 to-orange-700', note: 'Furniture, doors, repair' },
  { icon: Sparkles, name: 'Cleaner', color: 'from-emerald-400 to-teal-600', note: 'Home & deep cleaning' },
  { icon: Baby, name: 'Nanny', color: 'from-pink-400 to-rose-500', note: 'Childcare, trusted' },
  { icon: PawPrint, name: 'Pet Care', color: 'from-violet-400 to-indigo-500', note: 'Sitting, walking' },
];

const HOW_STEPS = [
  { n: '01', t: 'Request a service', d: 'Describe what you need, pick a time and location.', icon: ScanLine, accent: 'indigo' },
  { n: '02', t: 'AI ranks workers', d: 'Our engine scores by skill, distance, availability & fairness.', icon: Brain, accent: 'violet' },
  { n: '03', t: 'Cooperative reviews', d: 'The society reviews ranked candidates and makes the final call.', icon: Building2, accent: 'blue' },
  { n: '04', t: 'Worker allocated', d: 'The assigned worker accepts — you and the worker stay in sync.', icon: Users, accent: 'emerald' },
  { n: '05', t: 'Service & payment', d: 'Job completed, transparent payout, automatic welfare contribution.', icon: Wallet, accent: 'teal' },
  { n: '06', t: 'Feedback loop', d: 'Rate the service — ratings build reputation, inform future matching.', icon: Star, accent: 'amber' },
];

const ACCENT_MAP = {
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', dot: 'bg-indigo-500' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-500' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', dot: 'bg-teal-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500' },
};

/* ═══════════════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const navigate = useNavigate();
  const reduce = usePrefersReducedMotion();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-x-hidden selection:bg-indigo-500/20">
      <LandingNav />

      {/* ════════════════════ HERO ════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100vh] flex flex-col justify-center overflow-hidden landing-aurora"
        style={{
          background: 'linear-gradient(135deg, #050816 0%, #0a0f2c 25%, #0f0a2a 50%, #0a1628 75%, #050816 100%)',
          backgroundSize: '300% 300%',
        }}
      >
        {/* Aurora glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-[600px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] landing-glow-orb" />
          <div className="absolute top-[30%] right-[0%] w-[500px] h-[350px] rounded-full bg-violet-600/8 blur-[100px] landing-glow-orb-delayed" />
          <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[300px] rounded-full bg-teal-500/6 blur-[100px] landing-glow-orb-slow" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 landing-grid-pattern pointer-events-none" />

        <motion.div
          style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}
          className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 pt-[100px] sm:pt-[120px] pb-12 sm:pb-16 w-full"
        >
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center">
            {/* Left — Copy */}
            <div>
              {/* Badge */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: EASE.out }}
              >
                <span className="inline-flex items-center gap-2 px-1 pr-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500 text-white font-bold text-[11px]">NEW</span>
                  <span className="text-white/50 font-medium">Cooperative-first workforce OS</span>
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease: EASE.out }}
                className="mt-6 text-[36px] sm:text-[48px] lg:text-[56px] xl:text-[62px] font-black tracking-[-0.04em] leading-[0.92]"
              >
                <span className="block text-white">Trusted Services.</span>
                <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-teal-200 bg-clip-text text-transparent">Fair Opportunities.</span>
                <span className="block text-white">Stronger Cooperatives.</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22, ease: EASE.out }}
                className="mt-5 text-base sm:text-lg leading-relaxed text-white/40 max-w-[520px]"
              >
                One platform connecting customers with verified cooperative workers. AI ranks — the cooperative decides. Every payout transparent.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28, ease: EASE.out }}
                className="mt-8 flex flex-col sm:flex-row gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING.button}
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-slate-900 font-extrabold text-sm shadow-[0_0_40px_-8px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_-4px_rgba(255,255,255,0.4)] transition-shadow will-change-transform"
                >
                  Get Started <ArrowRight size={16} />
                </motion.button>
                <motion.a
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/80 font-bold text-sm hover:bg-white/[0.1] hover:text-white transition will-change-transform"
                >
                  <Play size={14} /> See How It Works
                </motion.a>
              </motion.div>

              {/* Trust row */}
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.36 }}
                className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/30"
              >
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-400/70" /> Verified cooperative workers</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-400/70" /> Transparent payout</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-400/70" /> Cooperative-controlled</span>
              </motion.div>
            </div>

            {/* Right — Product Mockup */}
            <div className="hidden lg:block">
              <HeroMockup reduce={reduce} />
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[11px] font-medium text-white/20 tracking-wider">SCROLL</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={16} className="text-white/20" />
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════════════ ECOSYSTEM FLOW ════════════════════ */}
      <section className="relative bg-[#050816]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
          <Reveal>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm px-4 sm:px-8 py-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {[
                { step: '1', label: 'Request', sub: 'Customer' },
                { step: '2', label: 'AI Ranks', sub: 'Engine' },
                { step: '3', label: 'Reviews', sub: 'Cooperative' },
                { step: '4', label: 'Serves', sub: 'Worker' },
                { step: '5', label: 'Fair Payout', sub: 'Automated' },
              ].map((s, i, arr) => (
                <span key={s.step} className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-white/[0.08] text-white/70 text-xs font-black flex items-center justify-center">{s.step}</span>
                  <span className="text-center leading-none">
                    <span className="block text-xs font-bold text-white/60">{s.label}</span>
                    <span className="block text-[10px] text-white/25 mt-0.5">{s.sub}</span>
                  </span>
                  {i < arr.length - 1 && <ArrowRight size={12} className="text-white/15 mx-1" />}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section id="how" className="relative bg-[#050816] py-20 sm:py-28">
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/[0.04] blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold tracking-[0.2em] text-indigo-400/60">HOW CO-LAB CONNECT WORKS</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
                Human decisions, <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">powered</span> by AI.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-white/35 max-w-lg mx-auto">Every job follows one accountable flow. AI proposes — the cooperative disposes.</p>
            </div>
          </Reveal>

          {/* Step cards — 2-column on desktop, stacked on mobile */}
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Stagger className="contents">
              {HOW_STEPS.map((s) => {
                const a = ACCENT_MAP[s.accent];
                return (
                  <motion.div
                    key={s.n}
                    variants={cardV}
                    className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300"
                  >
                    <div className="flex items-start gap-3.5">
                      <span className={`w-10 h-10 rounded-xl ${a.bg} border ${a.border} flex items-center justify-center shrink-0`}>
                        <s.icon size={18} className={a.text} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-white/20 tracking-widest">{s.n}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${a.dot} opacity-40`} />
                        </div>
                        <h3 className="text-sm font-extrabold text-white mt-1">{s.t}</h3>
                        <p className="text-[13px] text-white/35 mt-1.5 leading-relaxed">{s.d}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </Stagger>
          </div>

          {/* Principle callout */}
          <Reveal delay={0.1}>
            <div className="mt-10 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/15 p-6 sm:p-8 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <span className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                  <Brain size={20} className="text-indigo-400" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">AI recommends. The cooperative decides.</h3>
                  <p className="mt-1.5 text-sm text-white/40 leading-relaxed">Every recommendation is explainable — skill, distance, availability, and fairness. No auto-allocation. The society always has final authority.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['Explainable factors', 'Rolling 30-day fairness', 'Human-in-the-loop'].map(t => (
                      <span key={t} className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white/50">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOR CUSTOMERS ════════════════════ */}
      <section id="customer" className="relative bg-[#f8f9fc] text-slate-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Copy */}
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <Users size={12} /> For Customers
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
                  Request. Track. <span className="text-emerald-600">Relax.</span>
                </h2>
                <p className="mt-3 text-base text-slate-500 leading-relaxed max-w-md">Browse services, create a guided request, and follow the job from allocation to invoice — no phone-tag.</p>
                <ul className="mt-6 space-y-3">
                  {['Browse verified professionals by category', 'Guided request with location & schedule', 'Live status: pending → allocated → completed', 'Transparent invoice & rating'].map(t => (
                    <li key={t} className="flex gap-3 items-start">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} /></span>
                      <span className="text-sm text-slate-600">{t}</span>
                    </li>
                  ))}
                </ul>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/register')}
                  className="mt-8 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-shadow"
                >
                  Request a service →
                </motion.button>
              </div>

              {/* Mockup */}
              <Reveal delay={0.1}>
                <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400">YOUR BOOKING</p>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">In progress</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3.5">
                      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20"><Zap size={18} /></span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Electrical — Wiring fix</p>
                        <p className="text-xs text-slate-500">A. Verma • En route • 11:30 AM</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {['Requested', 'Ranked', 'Allocated', 'En route'].map((s, i) => (
                        <span key={s} className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${i <= 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{i < 3 ? '✓' : i + 1}</span>
                          <span className={`hidden sm:inline ${i <= 2 ? 'text-slate-700' : 'text-slate-400'}`}>{s}</span>
                          {i < 3 && <span className={`hidden sm:block w-4 lg:w-6 h-0.5 ${i < 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />}
                        </span>
                      ))}
                    </div>
                    <div className="rounded-xl bg-slate-900 text-white p-3.5 flex items-center justify-between">
                      <span className="text-xs text-white/50">Amount</span>
                      <span className="font-extrabold text-lg">₹500</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOR WORKERS ════════════════════ */}
      <section className="relative bg-[#050816] py-20 sm:py-28 overflow-hidden">
        {/* Accent glow */}
        <div className="absolute top-1/2 left-0 w-[500px] h-[400px] bg-teal-500/[0.04] blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Copy */}
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold">
                  <HeartHandshake size={12} /> For Workers
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-white">
                  Fair work. <span className="bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">Real growth.</span>
                </h2>
                <p className="mt-3 text-base text-white/35 leading-relaxed max-w-md">Accept allocated jobs, complete services, keep 88% of every job and build a portable work history.</p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { k: 'Payout', v: '88%', color: 'text-emerald-400' },
                    { k: 'Welfare Fund', v: '2%', color: 'text-teal-400' },
                    { k: 'Avg. Rating', v: '4.8★', color: 'text-amber-400' },
                  ].map(x => (
                    <div key={x.k} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                      <p className="text-[11px] text-white/30 font-medium">{x.k}</p>
                      <p className={`text-2xl font-black mt-1 ${x.color}`}>{x.v}</p>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/register')}
                  className="mt-8 px-6 py-3 rounded-xl bg-white text-slate-900 font-extrabold text-sm shadow-lg shadow-white/10 hover:shadow-white/20 transition-shadow"
                >
                  Join as a worker →
                </motion.button>
              </div>

              {/* Worker dashboard mockup */}
              <Reveal delay={0.1}>
                <div className="space-y-3">
                  {[
                    { t: 'Available jobs', s: '2 new allocations waiting', icon: Zap, accent: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' },
                    { t: 'Job #4821 — Electrical', s: 'Accepted • Today 11 AM • ₹440 payout', icon: Check, accent: 'bg-white/[0.06] border-white/[0.08] text-white/60' },
                    { t: 'Work history', s: '24 completed • 4.8★ average rating', icon: Award, accent: 'bg-white/[0.06] border-white/[0.08] text-white/60' },
                  ].map(r => (
                    <div key={r.t} className={`rounded-xl border p-4 flex items-center gap-3.5 ${r.accent}`}>
                      <span className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                        <r.icon size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{r.t}</p>
                        <p className="text-xs text-white/35 mt-0.5">{r.s}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOR COOPERATIVES ════════════════════ */}
      <section id="cooperative" className="relative bg-[#f8f9fc] text-slate-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <Building2 size={12} /> For Societies & Federations
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
                A real command center — <span className="text-indigo-600">not a spreadsheet.</span>
              </h2>
              <p className="mt-3 text-base text-slate-500">Incoming requests, ranked candidates, allocations and workforce analytics in one place.</p>
            </div>
          </Reveal>

          {/* Bento grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large card — Live queue */}
            <Reveal className="sm:col-span-2 lg:col-span-2">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/50 p-5 sm:p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400">LIVE QUEUE • 3 PENDING</p>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-red-500"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { id: '#4821 Electrical', meta: 'Model Colony • ₹500 • normal', badge: 'AI: 92%' },
                    { id: '#4820 Plumbing', meta: 'Kothrud • ₹700 • urgent', badge: 'AI: 88%' },
                    { id: '#4819 Cleaning', meta: 'Baner • ₹400 • normal', badge: 'AI: 85%' },
                  ].map(r => (
                    <div key={r.id} className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 flex items-center justify-between gap-3 hover:border-slate-200 transition">
                      <div><p className="text-sm font-bold text-slate-800">{r.id}</p><p className="text-xs text-slate-500">{r.meta}</p></div>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-sm">{r.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Stats column */}
            <Reveal delay={0.06}>
              <div className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 h-full">
                <p className="text-[11px] font-bold tracking-[0.15em] text-white/40">WORKFORCE OVERVIEW</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Active Workers', value: '33', trend: '+4 this week' },
                    { label: 'Jobs Today', value: '12', trend: '3 pending' },
                    { label: 'Revenue (MTD)', value: '₹1.2L', trend: '+18%' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-white/[0.06] border border-white/[0.06] p-3.5">
                      <p className="text-xs text-white/40">{s.label}</p>
                      <div className="flex items-baseline justify-between mt-1">
                        <p className="text-xl font-black">{s.value}</p>
                        <p className="text-[11px] text-emerald-400 font-semibold">{s.trend}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Feature cards row */}
            <Stagger className="contents">
              {[
                { icon: Brain, t: 'AI-Ranked Candidates', d: 'Explainable scoring with skill, distance, fairness factors', color: 'text-violet-600 bg-violet-50' },
                { icon: Scale, t: 'Fairness Engine', d: 'Gini-based allocation ensures equal opportunity across all workers', color: 'text-indigo-600 bg-indigo-50' },
                { icon: BarChart3, t: 'Demand Forecast', d: '7-day predictions with AI recommendations for workforce planning', color: 'text-emerald-600 bg-emerald-50' },
              ].map(f => (
                <motion.div key={f.t} variants={cardV} className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
                  <span className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center`}><f.icon size={18} /></span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-3">{f.t}</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{f.d}</p>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* ════════════════════ AI MATCHING ════════════════════ */}
      <section className="relative bg-[#050816] py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] right-[10%] w-[500px] h-[400px] bg-indigo-600/[0.06] blur-[100px] rounded-full" />
          <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[300px] bg-violet-500/[0.04] blur-[100px] rounded-full" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-[24px] bg-gradient-to-br from-indigo-600/20 via-violet-600/15 to-indigo-600/10 border border-indigo-500/15 p-6 sm:p-10 overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-400/60">AI-ASSISTED MATCHING</p>
                  <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white">Smarter matching. Human-controlled decisions.</h2>
                  <p className="mt-3 text-sm text-white/35 leading-relaxed">The engine explains every ranking. The cooperative reviews and allocates — AI never decides alone.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {['Skill match 30%', 'Distance 15%', 'Availability 15%', 'Rating 10%', 'Experience 10%', 'Fairness 20%'].map(t => (
                      <span key={t} className="px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-white/50">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Visual flow */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-white/30 text-center mb-5">REQUEST → RANK → REVIEW → ALLOCATE</p>
                  <div className="flex items-start justify-between gap-2">
                    {[
                      { icon: ScanLine, label: 'Request', color: 'bg-white/10', extra: null },
                      { icon: Brain, label: 'AI ranks', color: 'bg-indigo-500/20', extra: (
                        <div className="mt-2 space-y-1 text-[11px]">
                          <p className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 font-semibold">A. Verma 92%</p>
                          <p className="px-2 py-1 rounded-lg bg-white/[0.04] text-white/40">S. Khan 87%</p>
                        </div>
                      )},
                      { icon: BadgeCheck, label: 'Coop decides', color: 'bg-emerald-500/20', extra: (
                        <p className="mt-2 text-[11px] px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold">Allocated ✓</p>
                      )},
                    ].map((step, i, arr) => (
                      <div key={step.label} className="flex items-start gap-2 flex-1">
                        <div className="text-center flex-1">
                          <div className={`w-12 h-12 rounded-xl ${step.color} text-white/70 flex items-center justify-center mx-auto`}>
                            <step.icon size={18} />
                          </div>
                          <p className="text-xs font-bold text-white/60 mt-2">{step.label}</p>
                          {step.extra}
                        </div>
                        {i < arr.length - 1 && <span className="mt-5 text-white/15 shrink-0">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ SERVICES ════════════════════ */}
      <section id="services" className="relative bg-[#f8f9fc] text-slate-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">One network, every household need</h2>
              <p className="text-sm text-slate-500 mt-2">Verified professionals across 6+ categories — one cooperative network.</p>
            </div>
          </Reveal>

          <Stagger className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {SERVICES.map(s => (
              <motion.button
                key={s.name}
                variants={cardV}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/register')}
                className="group rounded-2xl bg-white border border-slate-200 p-5 text-center hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer"
              >
                <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <s.icon className="text-white" size={22} />
                </span>
                <p className="font-bold text-sm mt-3 text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.note}</p>
              </motion.button>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ════════════════════ TRUST BENTO ════════════════════ */}
      <section id="trust" className="relative bg-[#050816] py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-10">
              <p className="text-xs font-bold tracking-[0.2em] text-white/30">TRUST & VERIFICATION</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">Verification you can <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">see.</span></h2>
            </div>
          </Reveal>

          {/* Bento trust grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Hero trust card */}
            <Reveal className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
              <div className="rounded-2xl bg-gradient-to-b from-emerald-500/15 to-teal-500/10 border border-emerald-500/15 p-6 h-full flex flex-col justify-between">
                <div>
                  <span className="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                    <Shield size={24} className="text-emerald-400" />
                  </span>
                  <h3 className="text-xl font-black text-white mt-4">Cooperative-verified workforce</h3>
                  <p className="text-sm text-white/35 mt-2 leading-relaxed">Every worker is verified through the cooperative society — background checks, skill certification, and continuous oversight by the community.</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60"><BadgeCheck size={16} /></span>
                    <div>
                      <p className="text-xs font-bold text-white/60">Society-level accountability</p>
                      <p className="text-[11px] text-white/25">Not a gig marketplace</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Smaller trust cards */}
            <Stagger className="contents">
              {[
                { icon: Layers, t: 'Transparent Allocation', d: 'Explainable AI scoring — skill, distance, fairness', color: 'text-indigo-400' },
                { icon: Eye, t: 'Full Audit Trail', d: 'Every dispatch event logged and traceable', color: 'text-violet-400' },
                { icon: Wallet, t: 'Secure Payouts', d: 'Server-computed math — no rounding leaks', color: 'text-teal-400' },
                { icon: Star, t: 'Reputation System', d: 'Ratings inform future matching quality', color: 'text-amber-400' },
              ].map(f => (
                <motion.div key={f.t} variants={cardV} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300">
                  <span className={`w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center ${f.color}`}>
                    <f.icon size={18} />
                  </span>
                  <h4 className="text-sm font-extrabold text-white mt-3">{f.t}</h4>
                  <p className="text-xs text-white/30 mt-1.5 leading-relaxed">{f.d}</p>
                </motion.div>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* ════════════════════ PAYOUT TRANSPARENCY ════════════════════ */}
      <section className="relative bg-[#f8f9fc] text-slate-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-6">
            <Reveal>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/50 p-6 sm:p-8 h-full">
                <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400">FAIR PAYOUT</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">Every rupee, <span className="text-emerald-600">explained.</span></h3>
                <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-3 text-center divide-x divide-slate-100">
                    <div className="p-4 bg-slate-50"><p className="text-xs text-slate-500">Customer pays</p><p className="text-lg font-black mt-0.5">₹500</p></div>
                    <div className="p-4"><p className="text-xs text-slate-500">Society 10%</p><p className="text-lg font-black mt-0.5">₹50</p></div>
                    <div className="p-4"><p className="text-xs text-slate-500">Welfare 2%</p><p className="text-lg font-black mt-0.5">₹10</p></div>
                  </div>
                  <div className="p-4 bg-emerald-50 flex items-center justify-between border-t border-emerald-100">
                    <span className="text-sm font-bold text-emerald-700">Worker receives</span>
                    <span className="text-2xl font-black text-emerald-700">₹440</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">No hidden cuts. Backend-computed via Decimal math.</p>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 h-full">
                <p className="text-[11px] font-bold tracking-[0.15em] text-white/40">ANALYTICS & INSIGHTS</p>
                <h3 className="mt-2 text-2xl font-black">Know your workforce.</h3>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { k: 'Availability', v: '82%', trend: '+4%' },
                    { k: 'Demand', v: 'High', trend: 'Pune' },
                    { k: 'Satisfaction', v: '4.7★', trend: '+0.2' },
                  ].map(a => (
                    <div key={a.k} className="rounded-xl bg-white/[0.06] border border-white/[0.06] p-3.5">
                      <p className="text-[11px] text-white/35">{a.k}</p>
                      <p className="text-lg font-black mt-1">{a.v}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">{a.trend}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '68%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.3, ease: EASE.outExpo }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  />
                </div>
                <p className="text-[11px] text-white/25 mt-2">Allocation trend • Welfare contribution • Completion rate</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════ SOCIAL PROOF / STATS ════════════════════ */}
      <section className="relative bg-[#050816] py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <StatCounter value={50} suffix="+" label="Verified Workers" />
            <StatCounter value={200} suffix="+" label="Bookings Processed" />
            <StatCounter value={5} suffix="" label="Cooperative Societies" />
            <StatCounter value={88} suffix="%" label="Worker Payout Rate" />
          </div>
        </div>
      </section>

      {/* ════════════════════ ROLES ════════════════════ */}
      <section className="relative bg-[#f8f9fc] text-slate-900 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">One platform, five roles.</h2>
              <p className="text-sm text-slate-500 mt-2">Each role sees only what it needs — same trusted foundation.</p>
            </div>
          </Reveal>

          <Stagger className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { r: 'Customer', d: 'Find & track trusted services', icon: Users, bg: 'bg-gradient-to-br from-indigo-500 to-violet-600' },
              { r: 'Worker', d: 'Access fair, rated opportunities', icon: HeartHandshake, bg: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
              { r: 'Society', d: 'Manage local workforce', icon: Building2, bg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
              { r: 'Federation', d: 'Coordinate the network', icon: Network, bg: 'bg-gradient-to-br from-violet-500 to-purple-600' },
              { r: 'Admin', d: 'Govern & audit the platform', icon: Shield, bg: 'bg-gradient-to-br from-slate-700 to-slate-900' },
            ].map(x => (
              <motion.div key={x.r} variants={cardV} className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
                <span className={`w-10 h-10 rounded-xl ${x.bg} text-white flex items-center justify-center shadow-lg`}>
                  <x.icon size={18} />
                </span>
                <p className="text-sm font-extrabold mt-3">{x.r}</p>
                <p className="text-xs text-slate-500 mt-1">{x.d}</p>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ════════════════════ FINAL CTA ════════════════════ */}
      <section className="relative bg-[#050816] py-20 sm:py-28 overflow-hidden">
        {/* Aurora glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] right-[-5%] w-[500px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full landing-glow-orb" />
          <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[400px] bg-violet-500/8 blur-[120px] rounded-full landing-glow-orb-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-teal-500/[0.04] blur-[100px] rounded-full" />
        </div>

        <div className="relative max-w-[900px] mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.1]">
              Build stronger communities<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-teal-200 bg-clip-text text-transparent">through better workforce connections.</span>
            </h2>
            <p className="mt-4 text-base text-white/35 max-w-lg mx-auto">Join customers, workers and cooperatives on one accountable, transparent platform.</p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING.button}
                onClick={() => navigate('/register')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-extrabold text-sm shadow-[0_0_40px_-8px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_-4px_rgba(255,255,255,0.4)] transition-shadow"
              >
                Get Started <ArrowRight size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/80 font-bold text-sm hover:bg-white/[0.1] hover:text-white transition"
              >
                Explore CO-LAB CONNECT
              </motion.button>
            </div>

            {/* Why now */}
            <div className="mt-10 flex flex-wrap justify-center gap-5 text-xs font-medium text-white/30">
              <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-400/60" /> Cooperative-first, not commission-first</span>
              <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-400/60" /> AI assists — society decides</span>
              <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-emerald-400/60" /> Welfare built into every job</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="relative bg-[#030510] border-t border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-[13px] flex items-center justify-center shadow-lg shadow-indigo-500/25">CC</span>
                <span className="font-extrabold tracking-tight text-sm text-white">CO-LAB CONNECT</span>
              </div>
              <p className="mt-3 text-xs text-white/25 leading-relaxed max-w-[260px]">Cooperative-owned digital workforce OS. Trusted services, fair opportunities, stronger cooperatives.</p>
            </div>

            {/* Platform */}
            <div>
              <p className="text-[11px] font-bold tracking-[0.15em] text-white/30 mb-3">PLATFORM</p>
              <ul className="space-y-2">
                {[['How It Works', '#how'], ['Services', '#services'], ['For Cooperatives', '#cooperative'], ['Trust & Verification', '#trust']].map(([l, h]) => (
                  <li key={l}><a href={h} className="text-sm text-white/40 hover:text-white/70 transition">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Roles */}
            <div>
              <p className="text-[11px] font-bold tracking-[0.15em] text-white/30 mb-3">ROLES</p>
              <ul className="space-y-2">
                {['Customer', 'Worker', 'Society Admin', 'Federation Admin', 'Platform Admin'].map(r => (
                  <li key={r}><span className="text-sm text-white/40">{r}</span></li>
                ))}
              </ul>
            </div>

            {/* Project */}
            <div>
              <p className="text-[11px] font-bold tracking-[0.15em] text-white/30 mb-3">PROJECT</p>
              <ul className="space-y-2">
                <li><span className="text-sm text-white/40">Built for SIH 2026</span></li>
                <li><span className="text-sm text-white/40">React + FastAPI</span></li>
                <li><span className="text-sm text-white/40">Fair Dispatch Engine</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-white/20">© {new Date().getFullYear()} CO-LAB CONNECT. All rights reserved.</p>
            <p className="text-xs text-white/15">Cooperative-First Digital Workforce OS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
