import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, Shield, Users, Sparkles } from 'lucide-react';
import { EASE, SPRING } from '../motion/tokens';
import { usePrefersReducedMotion } from '../motion/hooks';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const reduce = usePrefersReducedMotion();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { label: 'Customer', email: 'customer@demo.com', password: 'CoLab!Demo2026', desc: 'Request services' },
    { label: 'Worker', email: 'worker@demo.com', password: 'CoLab!Demo2026', desc: 'Find work' },
    { label: 'Co-op Admin', email: 'coop@demo.com', password: 'CoLab!Demo2026', desc: 'Manage workforce' },
    { label: 'Federation', email: 'federation@demo.com', password: 'CoLab!Demo2026', desc: 'Network view' },
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const redirectForRole = (role) => {
    const r = role?.toLowerCase();
    if (r === 'worker') navigate('/worker/dashboard');
    else if (['cooperative_admin', 'federation_admin', 'platform_admin'].includes(r)) navigate('/admin');
    else navigate('/customer/dashboard');
  };

  const loginDemo = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      redirectForRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      redirectForRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex flex-col lg:flex-row overflow-hidden">
      {/* Left — brand storytelling (matches landing aurora) */}
      <div className="relative hidden lg:flex lg:w-[46%] flex-col justify-between p-10 xl:p-12 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #050816 0%, #0a0f2c 30%, #0f0a2a 60%, #0a1628 100%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="absolute -top-24 -right-24 w-[520px] h-[380px] bg-indigo-600/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-[420px] h-[320px] bg-teal-500/8 blur-[80px] rounded-full" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-sm flex items-center justify-center shadow-lg">CC</span>
            <span className="font-extrabold tracking-tight text-white text-sm">CO-LAB CONNECT</span>
            <span className="hidden xl:inline text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white/60 font-bold tracking-widest">COOPERATIVE OS</span>
          </Link>
        </div>

        <div className="relative">
          <motion.div initial={reduce?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.6, delay:0.1, ease:EASE.out}}>
            <p className="text-xs font-bold tracking-[0.2em] text-indigo-300/60">COOPERATIVE WORKFORCE OS</p>
            <h1 className="mt-3 text-3xl xl:text-4xl font-black tracking-tight leading-[0.95] text-white">
              Stronger<br />Communities.<br /><span className="bg-gradient-to-r from-indigo-300 to-teal-200 bg-clip-text text-transparent">Greater Opportunities.</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/35 max-w-sm">
              Verified workers, cooperative-controlled allocation, transparent payouts. One platform for customers, workers, societies and federations.
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm">
            {[
              { icon: Shield, label: 'Verified', sub: 'Background checked' },
              { icon: Users, label: 'Cooperative', sub: 'Society managed' },
              { icon: Sparkles, label: 'Fair', sub: 'No hidden cuts' },
            ].map(x => (
              <div key={x.label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mx-auto"><x.icon size={14} className="text-white/60" /></span>
                <p className="text-xs font-bold text-white mt-2">{x.label}</p>
                <p className="text-[11px] text-white/30">{x.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live on Supabase Postgres • hpvnqvnhoigcepgrcdek
          </div>
        </div>

        <p className="relative text-xs text-white/20">© {new Date().getFullYear()} CO-LAB CONNECT • Built for SIH 2026</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f8f9fc] lg:bg-[#f8f9fc] relative">
        {/* mobile top brand */}
        <Link to="/" className="lg:hidden absolute top-4 left-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">CC</span>
          <span className="font-black text-slate-900 text-sm">CO-LAB CONNECT</span>
        </Link>

        <motion.div
          initial={reduce?false:{opacity:0,y:16,scale:0.98}}
          animate={{opacity:1,y:0,scale:1}}
          transition={{duration:0.5, ease:EASE.out}}
          className="w-full max-w-[440px] mt-10 lg:mt-0"
        >
          <div className="bg-white rounded-[20px] shadow-[0_16px_40px_-16px_rgba(15,23,42,0.12)] border border-slate-200 overflow-hidden">
            <div className="px-6 sm:px-8 pt-8 pb-6">
              <h2 className="text-xl font-black tracking-tight text-slate-900">Sign in to your account</h2>
              <p className="text-sm text-slate-500 mt-1">Welcome back — choose a demo role or use your credentials.</p>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Demo quick login — premium cards */}
              <div className="mt-6">
                <p className="text-[11px] font-bold tracking-widest text-slate-400">QUICK DEMO LOGIN</p>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  {demoAccounts.map(a => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => loginDemo(a.email, a.password)}
                      disabled={loading}
                      className="text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:shadow-sm p-3 transition disabled:opacity-60 group"
                    >
                      <p className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700">{a.label}</p>
                      <p className="text-[11px] text-slate-500">{a.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-bold tracking-widest text-slate-400">OR CONTINUE WITH EMAIL</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING.button}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-slate-900 text-white font-extrabold text-sm shadow-lg shadow-slate-900/20 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Sign in <ArrowRight size={16} /></>
                  )}
                </motion.button>
              </form>

              <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <summary className="px-4 py-3 text-xs font-bold tracking-widest text-slate-600 cursor-pointer hover:bg-slate-100 transition list-none flex items-center justify-between">
                  Demo accounts & passwords <span className="text-slate-400">▾</span>
                </summary>
                <div className="px-4 pb-4 space-y-1 text-xs font-mono text-slate-600 border-t border-slate-200 bg-white">
                  <div className="pt-3">customer@demo.com / CoLab!Demo2026</div>
                  <div>worker@demo.com / CoLab!Demo2026</div>
                  <div>coop@demo.com / CoLab!Demo2026</div>
                  <div>federation@demo.com / CoLab!Demo2026</div>
                </div>
              </details>

              <p className="text-center text-sm text-slate-500 mt-6">
                Don’t have an account?{' '}
                <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700">
                  Create account →
                </Link>
              </p>
            </div>

            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> No spam • Cooperative verified</span>
              <Link to="/" className="text-xs font-bold text-slate-600 hover:text-slate-900">Back to home</Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4 lg:hidden">© {new Date().getFullYear()} CO-LAB CONNECT</p>
        </motion.div>
      </div>
    </div>
  );
}
