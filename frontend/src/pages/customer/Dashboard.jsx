import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { CardSkeleton, Skel } from '../../motion/primitives';
import { motion } from 'framer-motion';
import { DUR, EASE } from '../../motion/tokens';
import { usePrefersReducedMotion } from '../../motion/hooks';
import {
  ArrowRight, Calendar, Clock, Search, MapPin, Star, Shield, Wallet, HeartHandshake,
  Wrench, Sparkles, Droplets, Hammer, Baby, PawPrint, Zap, Check, Timer
} from 'lucide-react';

const CATEGORY_ICONS = {
  'home-repair': Wrench, electrical: Zap, plumbing: Droplets, carpentry: Hammer,
  painting: Sparkles, cleaning: Sparkles, 'cleaning-household': Sparkles, gardening: Sparkles,
  childcare: Baby, 'childcare-care': Baby, eldercare: HeartHandshake, petcare: PawPrint,
  cooking: Sparkles, driving: Sparkles, beauty: Sparkles, appliance: Zap, default: Wrench,
};
const iconFor = (slug, name) => {
  const key = (slug || '').toLowerCase();
  if (CATEGORY_ICONS[key]) return CATEGORY_ICONS[key];
  const n = (name || '').toLowerCase();
  for (const [k, V] of Object.entries(CATEGORY_ICONS)) if (n.includes(k.replace(/-/g, ' '))) return V;
  return CATEGORY_ICONS.default;
};
const daypart = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

function Reveal({ children, delay = 0 }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: EASE.out }}>
      {children}
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = usePrefersReducedMotion();

  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, spent: 0, rating: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setError(null);
    setLoading(true);
    try {
      const [bookingsRes, historyRes, servicesRes] = await Promise.all([
        api.get('/bookings/'),
        api.get('/history/'),
        api.get('/services/'),
      ]);
      const allBookings = bookingsRes.data?.data || bookingsRes.data?.bookings || [];
      const completed = allBookings.filter((b) => b.status === 'completed');
      const totalSpent = completed.reduce((sum, b) => sum + Number(b.final_amount ?? b.total_amount ?? 0), 0);
      const rated = completed.filter((b) => b.rating);
      const avgRating = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;
      setBookings(allBookings);
      setHistory(historyRes.data?.data || historyRes.data?.history || []);
      setCategories(servicesRes.data?.data || servicesRes.data?.categories || []);
      setStats({ total: allBookings.length, completed: completed.length, spent: totalSpent, rating: avgRating });
    } catch (e) {
      setError(e.userMessage || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const activeBookings = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).slice(0, 3);
  const recentRequests = bookings.slice(0, 4); // recent activity from bookings + requests
  const firstName = (user?.name || 'there').split(' ')[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[24px] bg-white border border-slate-200 p-6"><Skel className="h-8 w-1/3" /><Skel className="h-4 w-2/3 mt-3" /></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="rounded-2xl bg-white border border-red-100 p-8">
          <h3 className="font-bold text-slate-900">Something went wrong</h3>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <button onClick={fetchData} className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HERO — compact, not giant ── */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#4338ca] text-white p-6 sm:p-8">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-400/20 blur-3xl rounded-full" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-teal-300/15 blur-3xl rounded-full" />
          </div>

          <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div>
              <p className="text-xs font-bold tracking-widest text-indigo-200/70">WELCOME BACK</p>
              <h1 className="mt-1 text-[26px] sm:text-[30px] font-black tracking-tight leading-[0.95]">
                Welcome back, <span className="bg-gradient-to-r from-indigo-200 to-teal-100 bg-clip-text text-transparent">{firstName}</span>
              </h1>
              <h2 className="mt-3 text-[15px] sm:text-[16px] font-bold text-white/90 leading-tight">Trusted Services. Fair Opportunities.<br />Stronger Cooperatives.</h2>
              <p className="mt-3 text-sm leading-6 text-indigo-100/75 max-w-[520px]">
                Connect with verified cooperative workers and get your services done with trust, transparency and fair opportunities.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => navigate('/customer/request')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-extrabold text-sm shadow-lg hover:bg-slate-50 transition will-change-transform">
                  Request Service <ArrowRight size={16} />
                </button>
                <button onClick={() => navigate('/customer/bookings')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-sm hover:bg-white/15 transition">
                  View Bookings
                </button>
              </div>
            </div>

            {/* hero visual — 2–3 small floating cards, minimal */}
            <div className="relative w-full max-w-[420px] mx-auto lg:mx-0">
              <div className="absolute -inset-3 bg-gradient-to-br from-indigo-400/15 to-teal-300/10 blur-2xl rounded-[20px] pointer-events-none" />
              {/* main card */}
              <motion.div initial={reduce?false:{opacity:0,y:12,scale:0.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.5, delay:0.15, ease:EASE.out}}
                className="relative bg-white rounded-2xl shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35)] border border-white/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-widest text-slate-500">SERVICE REQUEST</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><Wrench size={18} /></span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">Electrician</p>
                    <p className="text-xs text-slate-500">Model Colony • 2.4 km</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-indigo-600">₹500</span>
                </div>
                <div className="mt-3 h-px bg-slate-100" />
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tomorrow 11:00–12:00</span>
                  <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">Pending review</span>
                </div>
              </motion.div>

              {/* floating AI */}
              <motion.div initial={reduce?false:{opacity:0,y:10,scale:0.96}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.45, delay:0.3, ease:EASE.out}}
                className="absolute -left-2 sm:-left-4 -top-6 w-[148px] rounded-2xl bg-white shadow-xl border border-slate-200 p-2.5 -rotate-[1deg]">
                <p className="text-[10px] font-extrabold tracking-widest text-indigo-600">AI MATCHING</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between rounded-lg bg-indigo-600 text-white px-2 py-1 text-xs font-bold"><span>A. Verma</span><span>92%</span></div>
                  <div className="flex justify-between rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 text-xs"><span className="font-semibold text-slate-700">S. Khan</span><span className="font-bold text-slate-500">87%</span></div>
                </div>
              </motion.div>

              {/* floating worker */}
              <motion.div initial={reduce?false:{opacity:0,y:10,scale:0.96}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.45, delay:0.38, ease:EASE.out}}
                className="absolute -right-2 sm:-right-3 top-16 w-[142px] rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg p-2.5 rotate-[0.8deg]">
                <p className="text-[10px] font-bold tracking-widest text-white/70">WORKER ALLOCATED</p>
                <p className="text-xs font-extrabold mt-1">A. Verma</p>
                <p className="text-[11px] text-white/80">Electrician • 4.8 ★</p>
              </motion.div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* trust indicators — compact */}
      <Reveal delay={0.06}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Shield, t: 'Verified Workers' },
            { icon: Wallet, t: 'Fair Payout' },
            { icon: HeartHandshake, t: 'Cooperative Control' },
          ].map(x => (
            <div key={x.t} className="rounded-2xl bg-white border border-slate-200 px-3 py-3 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0"><x.icon size={14} /></span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 leading-none">{x.t}</span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Our Services — real data */}
      <Reveal delay={0.08}>
        <section className="rounded-[20px] bg-white border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Our Services</h2>
              <p className="text-xs sm:text-sm text-slate-500">Choose from a wide range of trusted services</p>
            </div>
            <Link to="/customer/services" className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700">View all <ArrowRight size={14} /></Link>
          </div>

          {categories.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-bold text-slate-700">No services available</p>
              <p className="text-xs text-slate-500 mt-1">Check back soon — your cooperative is adding services.</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.slice(0, 8).map((c, i) => {
                const Icon = iconFor(c.slug, c.name);
                return (
                  <motion.button
                    key={c.id}
                    initial={reduce?false:{opacity:0,y:12}}
                    animate={{opacity:1,y:0}}
                    transition={{duration:0.35, delay:0.04*i, ease:EASE.out}}
                    whileHover={reduce?undefined:{y:-3, scale:1.01}}
                    whileTap={reduce?undefined:{scale:0.98}}
                    onClick={() => navigate(`/customer/services?category=${c.slug}`)}
                    className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-slate-300 transition text-left group"
                  >
                    <span className="w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition">
                      <Icon size={16} />
                    </span>
                    <p className="mt-3 text-sm font-extrabold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{c.description || `${(c.services||[]).length} services`}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">Explore <ArrowRight size={12} /></span>
                  </motion.button>
                );
              })}
            </div>
          )}
          <Link to="/customer/services" className="sm:hidden mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">View all services <ArrowRight size={14} /></Link>
        </section>
      </Reveal>

      {/* lower grid — bookings | activity + actions + support */}
      <div className="grid grid-cols-12 gap-6">
        {/* My Bookings — 7 cols */}
        <Reveal delay={0.06} className="col-span-12 lg:col-span-7">
          <section className="rounded-[20px] bg-white border border-slate-200 p-5 sm:p-6 h-full">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">My Bookings</h3>
              <Link to="/customer/bookings" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">View All <ArrowRight size={14} /></Link>
            </div>

            {activeBookings.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto"><Calendar size={20} /></div>
                <p className="mt-3 text-sm font-bold text-slate-800">No bookings yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto">Request your first service to get started.</p>
                <button onClick={() => navigate('/customer/request')} className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">Request Service</button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {activeBookings.map((b) => (
                  <button key={b.id ?? b._id} onClick={() => navigate(`/customer/bookings/${b.id ?? b._id}`)} className="w-full text-left rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">{b.service_name || b.service?.name || 'Service'}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5"><MapPin size={12} />{(b.location_address || b.location || 'Pune').slice(0,36)} • <Clock size={12} />{b.service_date || b.preferred_date || '—'}</p>
                        {b.worker_name && <p className="text-xs text-slate-600 mt-1">Worker: {b.worker_name} • {b.cooperative_name || ''}</p>}
                      </div>
                      <StatusBadge status={b.status} size="sm" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{b.final_amount ?? b.total_amount ? `₹${Number(b.final_amount ?? b.total_amount).toLocaleString('en-IN')}` : ''}</span>
                      <span className="text-xs font-bold text-indigo-600">View →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* right stack — 5 cols */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Service Requests activity */}
          <Reveal delay={0.08}>
            <section className="rounded-[20px] bg-white border border-slate-200 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900">Service Requests</h3>
                <span className="text-xs font-bold text-slate-500">Last 7 days</span>
              </div>
              {recentRequests.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">No recent requests</p>
                  <p className="text-xs text-slate-500 mt-1">Your recent service requests will appear here.</p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {recentRequests.slice(0,4).map((r,i)=> (
                    <li key={r.id || i} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{r.service_name || r.service?.name || 'Service request'}</p>
                        <p className="text-xs text-slate-500 truncate">{r.worker_name ? `${r.worker_name} • ` : ''}{r.service_date || r.preferred_date || r.date || '—'}</p>
                      </div>
                      <StatusBadge status={r.status} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/customer/bookings" className="mt-4 inline-flex text-xs font-bold text-indigo-600 hover:text-indigo-700">View all requests →</Link>
            </section>
          </Reveal>

          {/* Quick Actions */}
          <Reveal delay={0.1}>
            <section className="rounded-[20px] bg-white border border-slate-200 p-5 sm:p-6">
              <h3 className="font-black text-slate-900">Quick Actions</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={()=>navigate('/customer/request')} className="rounded-2xl bg-slate-900 text-white p-4 text-left hover:bg-black transition">
                  <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center"><Zap size={14} /></span>
                  <p className="text-sm font-bold mt-2">Request Service</p>
                  <p className="text-xs text-white/60">New request</p>
                </button>
                <button onClick={()=>navigate('/customer/bookings')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-white hover:shadow-sm transition">
                  <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700"><Timer size={14} /></span>
                  <p className="text-sm font-bold text-slate-900 mt-2">Track Booking</p>
                  <p className="text-xs text-slate-500">Live status</p>
                </button>
                <button onClick={()=>navigate('/customer/history')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition">
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Wallet size={14} /></span>
                  <p className="text-sm font-bold text-slate-900 mt-2">View Wallet</p>
                  <p className="text-xs text-slate-500">Payments</p>
                </button>
                <button onClick={()=>navigate('/customer/disputes')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition">
                  <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><HeartHandshake size={14} /></span>
                  <p className="text-sm font-bold text-slate-900 mt-2">Support</p>
                  <p className="text-xs text-slate-500">Help</p>
                </button>
              </div>
            </section>
          </Reveal>

          {/* Right support card — Fair Work Better Future */}
          <Reveal delay={0.12}>
            <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white p-6">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-2xl rounded-full" />
              <p className="text-xs font-bold tracking-widest text-indigo-100/70">CO-LAB CONNECT</p>
              <h3 className="mt-2 text-lg font-black leading-tight">Fair Work.<br/>Better Future.</h3>
              <p className="mt-2 text-sm text-indigo-100/80 leading-relaxed">Stronger communities through verified work and cooperative control.</p>
              <button onClick={()=>navigate('/customer/services')} className="mt-4 px-4 py-2 rounded-xl bg-white text-indigo-700 text-xs font-extrabold hover:bg-indigo-50 transition">Explore services →</button>
              <div className="absolute right-4 bottom-4 opacity-20 hidden sm:block">
                <div className="w-20 h-20 rounded-2xl bg-white/20 border border-white/20" />
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
