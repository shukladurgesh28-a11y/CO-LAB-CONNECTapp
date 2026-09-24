import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, ArrowRight, Eye, EyeOff, Home, Briefcase, Shield, Check } from 'lucide-react';
import { EASE, SPRING } from '../motion/tokens';
import { usePrefersReducedMotion } from '../motion/hooks';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const reduce = usePrefersReducedMotion();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', role: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password || !form.role) {
      setError('Please fill in all required fields including phone');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        name: form.name, email: form.email, phone: form.phone, password: form.password, role: form.role,
      });
      const otp = result?.otp || result?.data?.otp || '';
      navigate(`/verify-otp?phone=${encodeURIComponent(form.phone)}&otp=${encodeURIComponent(otp)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex flex-col lg:flex-row overflow-hidden">
      {/* Left — same aurora as login/landing */}
      <div className="relative hidden lg:flex lg:w-[44%] flex-col justify-between p-10 xl:p-12 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #050816 0%, #0a0f2c 30%, #0f0a2a 60%, #0a1628 100%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="absolute -top-24 -right-24 w-[520px] h-[380px] bg-indigo-600/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-[420px] h-[320px] bg-teal-500/8 blur-[80px] rounded-full" />

        <Link to="/" className="relative inline-flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-sm flex items-center justify-center shadow-lg">CC</span>
          <span className="font-extrabold tracking-tight text-white text-sm">CO-LAB CONNECT</span>
        </Link>

        <div className="relative">
          <p className="text-xs font-bold tracking-[0.2em] text-indigo-300/60">JOIN THE COOPERATIVE</p>
          <h1 className="mt-3 text-3xl xl:text-4xl font-black tracking-tight leading-[0.95] text-white">
            Create your<br /><span className="bg-gradient-to-r from-indigo-300 to-teal-200 bg-clip-text text-transparent">cooperative</span><br />account.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/35 max-w-sm">
            Customers request verified services. Workers build portable reputation. Societies manage fairly.
          </p>
          <div className="mt-6 space-y-2.5">
            {[
              'Verified workers only',
              'Cooperative decides allocation',
              'Transparent, auditable payouts',
            ].map(t => (
              <span key={t} className="flex items-center gap-2 text-xs font-medium text-white/50">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center"><Check size={12} className="text-emerald-400" /></span>
                {t}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/20">Already have an account? <Link to="/login" className="text-white/60 hover:text-white underline">Sign in</Link></p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f8f9fc] relative">
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
              <h2 className="text-xl font-black tracking-tight text-slate-900">Create your account</h2>
              <p className="text-sm text-slate-500 mt-1">Join as a customer or a verified worker.</p>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                <p className="text-[11px] font-bold tracking-widest text-indigo-600">DEMO QUICK-FILL</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => {
                    const s = Date.now().toString().slice(-6);
                    setForm({ name: `Demo Customer ${s}`, email: `demo.customer.${s}@example.com`, phone: `9${s}0101`, password: 'CoLab!Demo2026', confirmPassword: 'CoLab!Demo2026', role: 'customer' });
                    setError('');
                  }} className="px-3 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-50">Demo Customer</button>
                  <button type="button" onClick={() => {
                    const s = Date.now().toString().slice(-6);
                    setForm({ name: `Demo Worker ${s}`, email: `demo.worker.${s}@example.com`, phone: `9${s}0102`, password: 'CoLab!Demo2026', confirmPassword: 'CoLab!Demo2026', role: 'worker' });
                    setError('');
                  }} className="px-3 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-50">Demo Worker</button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">Fills unique email/phone so you can register repeatedly. After submit you’ll verify OTP, then sign in and appear in Admin → Users.</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" className="w-full pl-9 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type={showPw ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter password" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" />
                  </div>
                </div>

                <div>
                  <p className="block text-xs font-bold text-slate-700 mb-2">I want to *</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setForm({ ...form, role: 'customer' })} className={`p-4 rounded-xl border-2 text-center transition ${form.role === 'customer' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      <Home size={22} className="mx-auto mb-1.5" />
                      <span className="text-xs font-extrabold block">I need services</span>
                      <span className="text-[11px] opacity-60">Customer</span>
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, role: 'worker' })} className={`p-4 rounded-xl border-2 text-center transition ${form.role === 'worker' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      <Briefcase size={22} className="mx-auto mb-1.5" />
                      <span className="text-xs font-extrabold block">I offer services</span>
                      <span className="text-[11px] opacity-60">Worker</span>
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING.button}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-3 rounded-xl bg-slate-900 text-white font-extrabold text-sm shadow-lg shadow-slate-900/20 hover:bg-black disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create account <ArrowRight size={16} /></>}
                </motion.button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Already have an account? <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700">Sign in →</Link>
              </p>
            </div>

            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5"><Shield size={12} className="text-emerald-500" /> OTP verified • Secure</span>
              <Link to="/" className="text-xs font-bold text-slate-600 hover:text-slate-900">Back to home</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
