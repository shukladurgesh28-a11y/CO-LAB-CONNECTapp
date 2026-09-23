import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Shield, Users, Brain, CreditCard, MapPin, BarChart3,
  Zap, Droplets, Hammer, Sparkles, Baby, PawPrint,
  ArrowRight, ChevronRight, HeartHandshake, BadgeCheck, Network,
  Check, Clock, Star, TrendingUp, Layers, Building2, ScanLine,
  Wallet, Award, Calendar, Activity, ArrowUpRight, Play, Menu, X,
  ChevronDown, Globe, Fingerprint, Scale, Eye, Sparkle, CheckCircle2
} from 'lucide-react';
import { DUR, EASE, SPRING } from '../motion/tokens';
import { usePrefersReducedMotion, useCountUp } from '../motion/hooks';

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS — animation wrappers
   ═══════════════════════════════════════════════════════════════════════ */

function Reveal({ children, delay = 0, y = 20, className = '' }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
}

function Stagger({ children, stagger = 0.06, className = '' }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

const cardV = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE.out } },
};

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATED STAT COUNTER
   ═══════════════════════════════════════════════════════════════════════ */

function StatCounter({ value, suffix = '', label, sub }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const count = useCountUp(inView ? value : 0, 1200);
  return (
    <div ref={ref} className="text-center p-4">
      <p className="text-4xl sm:text-5xl font-black tracking-tight text-white">
        {Math.round(count)}{suffix}
      </p>
      <p className="text-sm font-bold text-blue-200 mt-1.5">{label}</p>
      {sub && <p className="text-xs text-blue-300/80 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   NAVBAR — Crisp Blue & White Top Navigation
   ═══════════════════════════════════════════════════════════════════════ */

function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const headerBg = scrolled
    ? 'bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-sm'
    : 'bg-[#0a192f]/80 backdrop-blur-md border-b border-blue-900/40';
  const linkStyle = scrolled
    ? 'text-slate-700 hover:text-blue-600'
    : 'text-blue-100 hover:text-white';
  const logoColor = scrolled ? 'text-slate-900' : 'text-white';

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:bg-blue-500 transition-colors">
            CC
          </span>
          <div className="flex flex-col">
            <span className={`font-black tracking-tight text-sm sm:text-base leading-tight transition-colors ${logoColor}`}>
              CO-LAB CONNECT
            </span>
            <span className={`text-[10px] font-bold tracking-wider uppercase ${scrolled ? 'text-blue-600' : 'text-blue-300'}`}>
              Cooperative OS
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className={`hidden md:flex items-center gap-7 text-sm font-bold transition-colors ${linkStyle}`}>
          <a href="#how" className="transition-colors duration-150">How It Works</a>
          <a href="#services" className="transition-colors duration-150">Services</a>
          <a href="#customer" className="transition-colors duration-150">For Customers</a>
          <a href="#cooperative" className="transition-colors duration-150">For Cooperatives</a>
          <a href="#trust" className="transition-colors duration-150">Trust</a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors duration-150 ${
              scrolled
                ? 'text-slate-700 hover:text-blue-600 hover:bg-blue-50'
                : 'text-white hover:text-blue-200 hover:bg-white/10'
            }`}
          >
            Sign In
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-extrabold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors"
          >
            Get Started <ArrowUpRight size={15} />
          </motion.button>
          <button
            onClick={() => setOpen(v => !v)}
            className={`md:hidden p-2 rounded-xl transition ${
              scrolled ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-white/10'
            }`}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-blue-100 bg-white px-5 py-4 flex flex-col gap-2 shadow-xl"
        >
          {[
            ['How It Works', '#how'],
            ['Services', '#services'],
            ['For Customers', '#customer'],
            ['For Cooperatives', '#cooperative'],
            ['Trust & Verification', '#trust']
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              {label}
            </a>
          ))}
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => { setOpen(false); navigate('/login'); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-800 hover:bg-slate-50"
            >
              Sign In
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/register'); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Get Started
            </button>
          </div>
        </motion.div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HERO PRODUCT MOCKUP — Crisp Blue & White Console Window
   ═══════════════════════════════════════════════════════════════════════ */

function HeroMockup({ reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.25, ease: EASE.out }}
      className="relative w-full max-w-[540px] mx-auto"
    >
      {/* Background soft blue glow */}
      <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-3xl pointer-events-none" />

      {/* Main app window */}
      <div className="relative bg-[#0d213f] rounded-2xl border border-blue-400/30 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Window titlebar */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-blue-800/50 bg-[#09172c]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="text-xs font-bold text-blue-200 tracking-wide">
            colabconnect.app/dispatch-console
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
            PROD
          </span>
        </div>

        {/* Console Body */}
        <div className="p-5 space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black tracking-wider text-sky-400 uppercase">
                INCOMING SERVICE REQUEST
              </p>
              <h3 className="text-base font-black text-white mt-0.5">
                Electrical — Wiring & Breaker Repair
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Model Colony, Pune • Flat 402, Shanti Heights
              </p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
          </div>

          {/* AI-Ranked Candidates */}
          <div className="rounded-xl bg-[#09172c] border border-blue-800/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black tracking-wider text-blue-300 uppercase">
                AI FAIR-DISPATCH RANKINGS
              </p>
              <span className="text-[11px] font-bold text-blue-400">3 Candidates</span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: 'A. Verma', score: 92, skill: 'Expert Electrician', rating: '4.8 ★', exp: '5 yrs exp', selected: true },
                { name: 'S. Khan', score: 87, skill: 'Certified Electrician', rating: '4.6 ★', exp: '4 yrs exp', selected: false },
                { name: 'R. Joshi', score: 84, skill: 'Senior Electrician', rating: '4.5 ★', exp: '3 yrs exp', selected: false },
              ].map((w, i) => (
                <div
                  key={w.name}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition ${
                    w.selected
                      ? 'bg-blue-600/30 border border-blue-400/50 shadow-inner'
                      : 'bg-white/[0.03] border border-white/[0.06]'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      w.selected ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-extrabold ${w.selected ? 'text-white' : 'text-slate-200'}`}>
                      {w.name}
                    </p>
                    <p className="text-xs text-blue-200 font-medium">
                      {w.skill} • {w.rating} • {w.exp}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black ${w.selected ? 'text-sky-300' : 'text-slate-300'}`}>
                      {w.score}%
                    </span>
                    <p className="text-[10px] text-blue-300/80 font-bold uppercase">Match</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Status Bar */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#09172c] border border-blue-800/60 p-2.5">
              <p className="text-[10px] font-bold text-blue-300 uppercase">Worker Status</p>
              <p className="text-xs font-black text-white mt-0.5">Verified Society Member</p>
            </div>
            <div className="rounded-xl bg-[#09172c] border border-blue-800/60 p-2.5">
              <p className="text-[10px] font-bold text-blue-300 uppercase">Dispatch Control</p>
              <p className="text-xs font-black text-sky-300 mt-0.5">Cooperative Approved</p>
            </div>
            <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/30 p-2.5">
              <p className="text-[10px] font-bold text-emerald-300 uppercase">Worker Payout</p>
              <p className="text-xs font-black text-emerald-400 mt-0.5">88% Direct Payout</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SERVICES CATALOG DATA
   ═══════════════════════════════════════════════════════════════════════ */

const SERVICES = [
  { icon: Zap, name: 'Electrician', color: 'from-blue-600 to-indigo-600', note: 'Wiring, circuit repair & installs' },
  { icon: Droplets, name: 'Plumber', color: 'from-sky-500 to-blue-600', note: 'Leakage, piping & fixture repair' },
  { icon: Hammer, name: 'Carpenter', color: 'from-blue-700 to-slate-800', note: 'Furniture repair & woodwork' },
  { icon: Sparkles, name: 'Cleaner', color: 'from-teal-500 to-emerald-600', note: 'Deep home & office cleaning' },
  { icon: Baby, name: 'Nanny', color: 'from-indigo-500 to-blue-600', note: 'Childcare & household support' },
  { icon: PawPrint, name: 'Pet Care', color: 'from-sky-600 to-cyan-600', note: 'Pet walking & home sitting' },
];

const HOW_STEPS = [
  { n: '01', t: 'Customer Requests Service', d: 'Choose category, describe the issue, specify location & preferred schedule.', icon: ScanLine },
  { n: '02', t: 'AI Ranks Verified Workers', d: 'Scores available cooperative workers on skill fit, proximity, and fairness.', icon: Brain },
  { n: '03', t: 'Cooperative Society Reviews', d: 'Co-op admin reviews ranked candidates and approves the optimal allocation.', icon: Building2 },
  { n: '04', t: 'Worker Accepts & Executes', d: 'Worker receives instant job notification, accepts, and navigates to the location.', icon: Users },
  { n: '05', t: 'Transparent Payment & Payout', d: 'Fair payout with automatic worker welfare fund contribution recorded.', icon: Wallet },
  { n: '06', t: 'Mutual Rating & Feedback', d: 'Transparent reviews build worker reputation and train the AI engine.', icon: Star },
];

/* ═══════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT (Blue and White Design)
   ═══════════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const navigate = useNavigate();
  const reduce = usePrefersReducedMotion();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <LandingNav />

      {/* ════════════════════ HERO SECTION (Blue & White) ════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden landing-aurora"
        style={{
          background: 'linear-gradient(135deg, #07152b 0%, #0c254a 35%, #0f356b 70%, #0a2040 100%)',
        }}
      >
        {/* Soft Blue Glowing Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[8%] w-[500px] h-[350px] rounded-full bg-blue-500/20 blur-[90px] landing-glow-orb" />
          <div className="absolute top-[30%] right-[5%] w-[450px] h-[320px] rounded-full bg-sky-400/15 blur-[90px] landing-glow-orb-delayed" />
          <div className="absolute bottom-[10%] left-[35%] w-[400px] h-[280px] rounded-full bg-blue-600/15 blur-[90px] landing-glow-orb-slow" />
        </div>

        {/* Clean Blue Grid Overlay */}
        <div className="absolute inset-0 landing-grid-pattern pointer-events-none" />

        <motion.div
          style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}
          className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 pt-[100px] sm:pt-[115px] pb-14 w-full"
        >
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-12 items-center">
            {/* Left Column — Crisp Typography */}
            <div>
              {/* Feature Pill */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08, ease: EASE.out }}
              >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/60 border border-blue-400/40 text-xs font-bold text-blue-200">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-black text-[10px]">
                    NEW
                  </span>
                  <span>Cooperative-First Workforce Operating System</span>
                </span>
              </motion.div>

              {/* Main Headline — High Contrast */}
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.14, ease: EASE.out }}
                className="mt-5 text-[36px] sm:text-[48px] lg:text-[54px] xl:text-[60px] font-black tracking-tight leading-[1.02] text-white"
              >
                <span className="block text-white">Trusted Services.</span>
                <span className="block text-sky-400">Fair Opportunities.</span>
                <span className="block text-white">Stronger Cooperatives.</span>
              </motion.h1>

              {/* Subheadline — Sharp and High Contrast */}
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2, ease: EASE.out }}
                className="mt-5 text-base sm:text-lg leading-relaxed text-blue-100 font-medium max-w-[530px]"
              >
                Connecting citizens with verified local cooperative workers. AI recommends fair matches,
                the cooperative society approves, and 88% of every payout goes directly to the worker.
              </motion.p>

              {/* Call-to-Action Buttons */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25, ease: EASE.out }}
                className="mt-8 flex flex-col sm:flex-row gap-3.5"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING.button}
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/35 hover:bg-blue-500 transition-colors"
                >
                  Get Started <ArrowRight size={16} />
                </motion.button>
                <motion.a
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-colors"
                >
                  <Play size={15} /> Explore How It Works
                </motion.a>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-blue-200"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" /> 100% Verified Workers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Transparent Math
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Society Governed
                </span>
              </motion.div>
            </div>

            {/* Right Column — App Window */}
            <div className="hidden lg:block">
              <HeroMockup reduce={reduce} />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════ ECOSYSTEM FLOW RIBBON ════════════════════ */}
      <section className="relative bg-[#07152b] border-t border-blue-900/50 py-5">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-2xl bg-blue-900/40 border border-blue-700/40 px-5 sm:px-8 py-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {[
                { step: '1', label: 'Customer Request', sub: 'Guided Form' },
                { step: '2', label: 'AI Ranking', sub: 'Fairness Engine' },
                { step: '3', label: 'Society Review', sub: 'Human Authority' },
                { step: '4', label: 'Worker Execution', sub: 'In-Field Service' },
                { step: '5', label: 'Direct Payout', sub: '88% to Worker' },
              ].map((s, i, arr) => (
                <span key={s.step} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    {s.step}
                  </span>
                  <div className="leading-tight">
                    <span className="block text-xs font-extrabold text-white">{s.label}</span>
                    <span className="block text-[11px] font-medium text-blue-300 mt-0.5">{s.sub}</span>
                  </div>
                  {i < arr.length - 1 && <ArrowRight size={14} className="text-blue-400/60 mx-1 hidden sm:inline" />}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS (Crisp Light Background) ════════════════════ */}
      <section id="how" className="relative bg-[#f4f8ff] py-20 sm:py-24 border-b border-blue-100">
        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-wider">
                HOW CO-LAB CONNECT WORKS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Human decisions, <span className="text-blue-600">powered</span> by AI.
              </h2>
              <p className="mt-3 text-base text-slate-600 font-medium">
                Every job follows a clear, accountable lifecycle. AI proposes optimal allocations — the cooperative society makes the final call.
              </p>
            </div>
          </Reveal>

          {/* 6 Step Cards */}
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Stagger className="contents">
              {HOW_STEPS.map((s) => (
                <motion.div
                  key={s.n}
                  variants={cardV}
                  className="rounded-2xl bg-white border border-blue-100 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <span className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                      <s.icon size={22} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-600 tracking-wider">STEP {s.n}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">{s.t}</h3>
                      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed font-medium">{s.d}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </Stagger>
          </div>

          {/* Principle Callout */}
          <Reveal delay={0.1}>
            <div className="mt-12 rounded-2xl bg-gradient-to-r from-blue-900 to-[#0d213f] text-white p-7 sm:p-9 max-w-3xl mx-auto shadow-md">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <span className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Brain size={24} />
                </span>
                <div>
                  <h3 className="text-xl font-black text-white">
                    AI Recommends. The Cooperative Decides.
                  </h3>
                  <p className="mt-2 text-sm text-blue-100 leading-relaxed font-medium">
                    Every recommendation is explainable across skill match, proximity, availability, and rolling 30-day fairness. No black-box algorithmic exploitation.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['Explainable Factors', 'Rolling 30-Day Fairness', 'Human-in-the-Loop Authority'].map(tag => (
                      <span key={tag} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-blue-200 border border-white/15">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOR CUSTOMERS ════════════════════ */}
      <section id="customer" className="relative bg-white py-20 sm:py-24 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              {/* Copy */}
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase">
                  <Users size={14} /> FOR CUSTOMERS
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  Request. Track. <span className="text-blue-600">Relax.</span>
                </h2>
                <p className="mt-3 text-base text-slate-600 leading-relaxed font-medium max-w-lg">
                  Book verified local technicians with transparent upfront pricing and live status tracking from allocation to invoice.
                </p>

                <ul className="mt-6 space-y-3.5">
                  {[
                    'Browse verified cooperative professionals by category',
                    'Guided request builder with location mapping and time preferences',
                    'Real-time job tracking: Requested → Ranked → Allocated → Completed',
                    'Transparent invoice breakdown and direct worker tipping & rating',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 items-start">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                        <Check size={13} />
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/register')}
                  className="mt-8 px-7 py-3.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors"
                >
                  Request a Service →
                </motion.button>
              </div>

              {/* Customer Booking Mockup */}
              <div className="rounded-2xl bg-white border border-blue-200 shadow-xl p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-black text-blue-600 tracking-wider uppercase">ACTIVE BOOKING #1024</p>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">Electrical Wiring Repair</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                    In Progress
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-3.5 bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
                    <span className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                      <Zap size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">A. Verma (Verified Electrician)</p>
                      <p className="text-xs text-slate-600 font-medium">Arrival window: 11:00 AM – 11:30 AM • 4.8 ★</p>
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                    {[
                      { l: 'Requested', done: true },
                      { l: 'Ranked', done: true },
                      { l: 'Allocated', done: true },
                      { l: 'In Field', active: true },
                    ].map((st) => (
                      <div key={st.l} className="space-y-1.5">
                        <div
                          className={`h-2 rounded-full ${
                            st.done ? 'bg-blue-600' : st.active ? 'bg-sky-400' : 'bg-slate-200'
                          }`}
                        />
                        <p className={`text-xs font-bold ${st.done || st.active ? 'text-blue-900' : 'text-slate-400'}`}>
                          {st.l}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-slate-900 text-white p-3.5 flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-bold">Standard Price</span>
                    <span className="text-sm font-black text-emerald-400">₹500.00 • Guaranteed</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOR WORKERS ════════════════════ */}
      <section className="relative bg-[#0a192f] text-white py-20 sm:py-24 border-b border-blue-900">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-900/80 border border-blue-400/40 text-blue-200 text-xs font-black uppercase">
                  <HeartHandshake size={14} /> FOR WORKERS
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-white">
                  Fair work. <span className="text-sky-400">Guaranteed payouts.</span>
                </h2>
                <p className="mt-3 text-base text-blue-100 font-medium leading-relaxed max-w-lg">
                  Keep 88% of your service charges, earn automatic welfare fund credits, and build a verified career history.
                </p>

                <div className="mt-7 grid grid-cols-3 gap-3.5">
                  {[
                    { k: 'Direct Payout', v: '88%', color: 'text-emerald-400' },
                    { k: 'Welfare Fund', v: '2%', color: 'text-sky-300' },
                    { k: 'Average Rating', v: '4.8 ★', color: 'text-amber-300' },
                  ].map(x => (
                    <div key={x.k} className="rounded-xl bg-white/5 border border-blue-400/20 p-4">
                      <p className="text-xs text-blue-200 font-bold">{x.k}</p>
                      <p className={`text-2xl font-black mt-1 ${x.color}`}>{x.v}</p>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/register')}
                  className="mt-8 px-7 py-3.5 rounded-xl bg-blue-600 text-white font-black text-sm shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-colors"
                >
                  Join as a Worker →
                </motion.button>
              </div>

              {/* Worker Jobs List Mockup */}
              <div className="space-y-3.5">
                {[
                  { t: 'Incoming Allocation', s: 'Electrical repair • Model Colony • ₹500', icon: Zap, bg: 'bg-blue-600/25 border-blue-400/40 text-blue-200' },
                  { t: 'Job Completed', s: 'Plumbing fixture install • Payout ₹660 received', icon: Check, bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' },
                  { t: 'Welfare Balance', s: '₹1,240 accumulated in cooperative fund', icon: Award, bg: 'bg-white/5 border-white/10 text-white' },
                ].map(r => (
                  <div key={r.t} className={`rounded-2xl border p-4.5 flex items-center gap-4 ${r.bg}`}>
                    <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 font-black">
                      <r.icon size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-white">{r.t}</p>
                      <p className="text-xs text-blue-200 font-medium mt-0.5">{r.s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOR COOPERATIVES ════════════════════ */}
      <section id="cooperative" className="relative bg-[#f4f8ff] py-20 sm:py-24 border-b border-blue-100">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase">
                <Building2 size={14} /> FOR SOCIETIES & FEDERATIONS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                An operational command center — <span className="text-blue-600">not a spreadsheet.</span>
              </h2>
              <p className="mt-3 text-base text-slate-600 font-medium">
                Manage your members, review dispatch requests, audit payments, and track regional demand in real time.
              </p>
            </div>
          </Reveal>

          {/* Bento Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Live Queue Card */}
            <div className="sm:col-span-2 rounded-2xl bg-white border border-blue-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black text-blue-600 tracking-wider uppercase">
                  LIVE DISPATCH QUEUE • 3 PENDING
                </p>
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { id: '#REQ-4821 Electrical Repair', loc: 'Model Colony, Pune • Normal urgency', match: 'AI Score: 92%' },
                  { id: '#REQ-4820 Plumbing Leak', loc: 'Kothrud, Pune • High urgency', match: 'AI Score: 88%' },
                  { id: '#REQ-4819 Deep Cleaning', loc: 'Baner, Pune • Scheduled', match: 'AI Score: 85%' },
                ].map(item => (
                  <div key={item.id} className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{item.id}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.loc}</p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-black">
                      {item.match}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Workforce Overview */}
            <div className="rounded-2xl bg-[#0a192f] text-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-xs font-black text-blue-300 tracking-wider uppercase">SOCIETY METRICS</p>
                <div className="mt-4 space-y-3.5">
                  {[
                    { label: 'Active Workforce', val: '33 Workers', trend: '+4 this month' },
                    { label: 'Jobs Processed', val: '12 Today', trend: '100% on time' },
                    { label: 'Completion Rate', val: '94.2%', trend: '+1.5% vs avg' },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <p className="text-xs font-bold text-blue-200">{m.label}</p>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <p className="text-lg font-black text-white">{m.val}</p>
                        <span className="text-xs font-bold text-emerald-400">{m.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ SERVICES CATALOG ════════════════════ */}
      <section id="services" className="relative bg-white py-20 sm:py-24 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-xl mx-auto">
              <span className="px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase">
                COOPERATIVE SERVICES
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                One network, every household need
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium mt-2">
                Verified professionals across household services, managed directly by local cooperatives.
              </p>
            </div>
          </Reveal>

          <Stagger className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {SERVICES.map(s => (
              <motion.button
                key={s.name}
                variants={cardV}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/register')}
                className="group rounded-2xl bg-[#f8faff] border border-blue-100 p-5 text-center hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
              >
                <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mx-auto shadow-md`}>
                  <s.icon size={24} />
                </span>
                <p className="font-black text-sm mt-3 text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">{s.note}</p>
              </motion.button>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ════════════════════ STATS COUNTER ════════════════════ */}
      <section className="relative bg-gradient-to-r from-[#07152b] via-[#0c254a] to-[#07152b] text-white py-16 sm:py-20 border-b border-blue-900">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCounter value={50} suffix="+" label="Verified Workers" sub="Certified by Societies" />
            <StatCounter value={200} suffix="+" label="Bookings Processed" sub="Zero Disputes" />
            <StatCounter value={5} suffix="" label="Cooperative Societies" sub="Governed Network" />
            <StatCounter value={88} suffix="%" label="Direct Worker Payout" sub="Fair Financial Model" />
          </div>
        </div>
      </section>

      {/* ════════════════════ TRUST & VERIFICATION ════════════════════ */}
      <section id="trust" className="relative bg-[#f8faff] py-20 sm:py-24 border-b border-blue-100">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase">
                TRUST & VERIFICATION
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Verification you can <span className="text-blue-600">trust.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield, t: 'Cooperative Identity Check', d: 'Background checks and government verification handled through society admins.', color: 'text-blue-600 bg-blue-50' },
              { icon: Layers, t: 'Transparent AI Dispatch', d: 'Explainable scoring algorithms preventing monopolization and favoritism.', color: 'text-sky-600 bg-sky-50' },
              { icon: Eye, t: 'Complete Audit Trail', d: 'Every status change, allocation, and invoice is timestamped and auditable.', color: 'text-indigo-600 bg-indigo-50' },
              { icon: Wallet, t: 'Exact Financial Formulas', d: 'No hidden cuts. 88% worker payout + 2% welfare fund computed on the backend.', color: 'text-emerald-600 bg-emerald-50' },
              { icon: Star, t: 'Two-Way Rating System', d: 'Customer and worker ratings maintain high accountability and safety.', color: 'text-amber-600 bg-amber-50' },
              { icon: Building2, t: 'Democratic Governance', d: 'The platform belongs to the cooperatives, prioritizing worker welfare.', color: 'text-blue-700 bg-blue-50' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl bg-white border border-blue-100 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
                <span className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center font-bold`}>
                  <f.icon size={22} />
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-4">{f.t}</h3>
                <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FINAL CTA SECTION ════════════════════ */}
      <section
        className="relative py-20 sm:py-24 text-white overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #07152b 0%, #0c254a 50%, #081a38 100%)',
        }}
      >
        <div className="max-w-[900px] mx-auto px-5 sm:px-6 lg:px-8 text-center relative z-10">
          <Reveal>
            <span className="px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-black uppercase">
              JOIN CO-LAB CONNECT TODAY
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Build stronger communities<br />
              <span className="text-sky-400">through trusted cooperative connections.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-blue-100 font-medium max-w-xl mx-auto">
              Join customers, workers, and cooperative societies on one transparent, fair platform.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3.5 justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/register')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/35 hover:bg-blue-500 transition-colors"
              >
                Create Free Account <ArrowRight size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-colors"
              >
                Sign In to Platform
              </motion.button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════ FOOTER (Dark Navy & Crisp White) ════════════════════ */}
      <footer className="relative bg-[#050f1e] text-slate-300 border-t border-blue-900/50 py-12 sm:py-16">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  CC
                </span>
                <span className="font-black text-sm text-white">CO-LAB CONNECT</span>
              </div>
              <p className="mt-3 text-xs text-slate-400 font-medium leading-relaxed">
                Cooperative-owned digital workforce operating system. Trusted services, fair opportunities, and stronger community societies.
              </p>
            </div>

            <div>
              <p className="text-xs font-black text-blue-300 tracking-wider uppercase mb-3">PLATFORM</p>
              <ul className="space-y-2 text-sm font-semibold">
                <li><a href="#how" className="text-slate-400 hover:text-white transition">How It Works</a></li>
                <li><a href="#services" className="text-slate-400 hover:text-white transition">Services Directory</a></li>
                <li><a href="#cooperative" className="text-slate-400 hover:text-white transition">Cooperative Portal</a></li>
                <li><a href="#trust" className="text-slate-400 hover:text-white transition">Trust & Audit</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-black text-blue-300 tracking-wider uppercase mb-3">ROLES</p>
              <ul className="space-y-2 text-sm font-semibold text-slate-400">
                <li>Customer Space</li>
                <li>Worker Space</li>
                <li>Society Administrator</li>
                <li>Federation Administrator</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-black text-blue-300 tracking-wider uppercase mb-3">PLATFORM TECH</p>
              <ul className="space-y-2 text-sm font-semibold text-slate-400">
                <li>Flask + SQLAlchemy Backend</li>
                <li>React 19 + Tailwind CSS Frontend</li>
                <li>Fair Gini Dispatch Engine</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-blue-900/60 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-medium text-slate-400">
            <p>© {new Date().getFullYear()} CO-LAB CONNECT. All rights reserved.</p>
            <p className="text-blue-300">Cooperative-First Digital Workforce OS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
