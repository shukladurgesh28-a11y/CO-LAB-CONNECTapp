import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const PAYMENT_METHODS = [
  { key: 'upi', label: 'UPI', icon: Smartphone },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'net_banking', label: 'Net Banking', icon: Building2 },
];

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const { data } = await api.get(`/bookings/${id}`);
        setBooking(data.booking || data);
      } catch (err) {
        console.error('Failed to fetch booking:', err);
        toast.error('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handlePayment = async () => {
    if (paymentMethod === 'upi' && !upiId.trim()) {
      setError('Please enter your UPI ID');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      await api.post('/payments/initiate', {
        booking_id: id,
        payment_method: paymentMethod,
        upi_id: paymentMethod === 'upi' ? upiId : undefined,
      });
      toast.success('Payment successful!');
      navigate(`/customer/invoice/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading payment details..." />;
  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Booking not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-medium hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const amount = booking.final_amount || booking.total_amount || 0;
  const serviceCharges = booking.total_amount || 0;
  const materialCharges = booking.material_charges || 0;
  const tax = booking.tax || booking.tax_amount || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Payment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-gray-900">
                {booking.service_type || booking.service?.name || 'Service'}
              </span>
            </div>
            {booking.worker && (
              <div className="flex justify-between">
                <span className="text-gray-500">Worker</span>
                <span className="font-medium text-gray-900">{booking.worker.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">
                {booking.preferred_date || booking.date || 'TBD'}
              </span>
            </div>
            {booking.address && (
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">
                  {booking.address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Amount Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Amount Breakdown</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Service Charges</span>
              <span className="text-gray-900">₹{serviceCharges.toLocaleString()}</span>
            </div>
            {materialCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Material Charges</span>
                <span className="text-gray-900">₹{materialCharges.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Tax (GST)</span>
              <span className="text-gray-900">₹{tax.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-xl text-gray-900">₹{amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.key}
              onClick={() => { setPaymentMethod(method.key); setError(''); }}
              className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                paymentMethod === method.key
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <method.icon size={24} className="mx-auto mb-2" />
              <span className="text-sm font-medium">{method.label}</span>
            </button>
          ))}
        </div>

        {/* UPI ID Input */}
        {paymentMethod === 'upi' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => { setUpiId(e.target.value); setError(''); }}
              placeholder="yourname@upi"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle size={18} />
              Pay ₹{amount.toLocaleString()}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
