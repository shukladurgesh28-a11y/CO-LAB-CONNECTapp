import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Phone, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [otp, setOtp] = useState(searchParams.get('otp') || '');
  const [message, setMessage] = useState(searchParams.get('otp') ? 'Demo OTP loaded. Verify to continue.' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async (event) => {
    event.preventDefault();
    setError('');
    if (!phone.trim() || !/^\d{6}$/.test(otp.trim())) {
      setError('Enter a valid phone number and 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { phone: phone.trim(), otp: otp.trim() });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const { data } = await api.post('/auth/resend-otp', { phone: phone.trim() });
      const nextOtp = data?.data?.otp || data?.otp || '';
      setOtp(nextOtp);
      setMessage(nextOtp ? 'A new demo OTP has been loaded.' : 'A new OTP was sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <ShieldCheck className="text-indigo-600" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify your phone</h1>
          <p className="text-gray-500 text-sm mt-1">Enter the OTP sent to complete registration.</p>
        </div>

        {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">{message}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

        <form onSubmit={verify} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">One-time password</label>
            <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="6-digit OTP" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 tracking-[0.4em]" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
            <CheckCircle size={18} />
            {loading ? 'Verifying...' : 'Verify phone'}
          </button>
        </form>

        <button type="button" onClick={resend} className="w-full mt-3 py-2.5 text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-2">
          <RefreshCw size={16} /> Resend OTP
        </button>
        <p className="text-center text-sm text-gray-500 mt-5"><Link to="/login" className="text-indigo-600 font-medium hover:underline">Back to login</Link></p>
      </div>
    </div>
  );
}
