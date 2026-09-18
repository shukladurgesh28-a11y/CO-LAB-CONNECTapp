import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import RatingStars from '../../components/RatingStars';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ArrowLeft,
  User,
  Shield,
  Star,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  XCircle,
  CheckCircle,
  QrCode,
  Scan,
} from 'lucide-react';
import { useRealtimeSync } from '../../api/realtime';
import QRScannerModal from '../../components/QRScannerModal';

const STEPS = [
  'pending',
  'recommended',
  'allocated',
  'confirmed',
  'accepted',
  'en_route',
  'service_started',
  'completed',
];

const STEP_LABELS = [
  'Request Created',
  'Worker Matching',
  'Recommended',
  'Allocated',
  'Confirmed',
  'Worker Accepted',
  'En Route',
  'Service Started',
  'Service Completed',
];

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [booking, setBooking] = useState(null);
  const [ratingData, setRatingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const [bookingRes, ratingRes] = await Promise.all([
        api.get(`/bookings/${id}`),
        api.get(`/ratings/booking/${id}`).catch(() => ({ data: null })),
      ]);
      setBooking(bookingRes.data?.data || bookingRes.data?.booking || bookingRes.data);
      setRatingData(ratingRes.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch booking:', err);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
    if (['completed', 'cancelled'].includes(booking?.status)) return undefined;
    const interval = window.setInterval(fetchBooking, 15000);
    return () => window.clearInterval(interval);
  }, [fetchBooking, booking?.status]);

  useRealtimeSync({
    tables: ['bookings', 'payments', 'notifications'],
    onChange: fetchBooking,
  });

  const currentStepIndex = STEPS.indexOf(
    booking?.status === 'in_progress' ? 'service_started' : booking?.status,
  );

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled');
      fetchBooking();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleRate = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setSubmittingRating(true);
    try {
      await api.post('/ratings', {
        booking_id: id,
        rating,
        feedback,
      });
      toast.success('Rating submitted!');
      fetchBooking();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading booking details..." />;
  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Booking not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-medium hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {booking.service_type || booking.service?.name || 'Booking Detail'}
        </h1>
        <StatusBadge status={booking.status} />
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6 overflow-x-auto">
        <div className="flex items-center min-w-[600px]">
          {STEP_LABELS.map((label, i) => {
            const isCompleted = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                          : 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircle size={16} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1.5 text-center whitespace-nowrap ${
                      isCurrent ? 'font-semibold text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${
                      i < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* On-Site Service Verification Pass (QR Code) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 mb-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-800/40">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white p-2 rounded-xl shadow-inner flex flex-col items-center justify-center flex-shrink-0">
            <QrCode className="w-12 h-12 text-gray-900" />
            <span className="text-[9px] font-mono text-gray-700 uppercase font-bold mt-0.5">
              CC-SVC-{booking.id}
            </span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-500/30 text-blue-200 rounded-full text-xs font-semibold mb-1">
              <QrCode className="w-3 h-3 text-blue-300" />
              On-Site Check-In Pass
            </div>
            <h3 className="font-bold text-lg text-white">Service Verification Pass</h3>
            <p className="text-xs text-blue-200 max-w-md mt-0.5">
              Present this pass to your assigned worker upon arrival to authenticate their visit and securely record service start and completion.
            </p>
            <p className="text-xs font-mono text-emerald-300 mt-1 font-bold">
              Pass Token: CC-SVC-{booking.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-colors shadow flex items-center gap-2"
          >
            <Scan className="w-4 h-4" />
            Scan / Verify Pass
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Info */}
        {booking.worker && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-indigo-500" />
              Worker Information
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-600">
                  {booking.worker.name?.charAt(0) || 'W'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{booking.worker.name}</p>
                {booking.worker.rating != null && (
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    {booking.worker.rating?.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
            {booking.worker.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {booking.worker.skills.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {booking.worker.verified && (
              <div className="flex items-center gap-1.5 mt-3 text-sm text-green-600">
                <Shield size={14} />
                Verified Worker
              </div>
            )}
          </div>
        )}

        {/* Service Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={16} className="text-gray-400" />
              <span>Date: {booking.preferred_date || booking.date || 'TBD'}</span>
            </div>
            {booking.preferred_time_start && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} className="text-gray-400" />
                <span>Time: {booking.preferred_time_start} - {booking.preferred_time_end || ''}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={16} className="text-gray-400" />
              <span>{booking.location_address || booking.address || 'Location not set'}</span>
            </div>
            {booking.description && (
              <p className="text-gray-600 mt-2">{booking.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Section */}
      {booking.total_amount != null && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-purple-500" />
            Payment
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{(booking.final_amount ?? booking.total_amount).toLocaleString()}</p>
            </div>
            {booking.payment_status === 'paid' ? (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                ✓ Paid
              </span>
            ) : booking.status === 'completed' ? (
              <button
                onClick={() => navigate(`/customer/payment/${id}`)}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200"
              >
                Pay Now
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Invoice */}
      {booking.payment_status === 'paid' && (
        <div className="mt-6">
          <button
            onClick={() => navigate(`/customer/invoice/${id}`)}
            className="flex items-center gap-2 text-indigo-600 font-medium hover:underline"
          >
            <FileText size={18} />
            View Invoice
          </button>
        </div>
      )}

      {/* Rating Section */}
      {booking.status === 'completed' && !ratingData && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={18} className="text-yellow-500" />
            Rate Your Experience
          </h2>
          <RatingStars rating={rating} interactive onChange={setRating} />
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Share your feedback (optional)..."
            className="w-full mt-4 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm resize-none"
          />
          <button
            onClick={handleRate}
            disabled={submittingRating}
            className="mt-3 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200 disabled:opacity-60"
          >
            {submittingRating ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      )}

      {ratingData && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Rating</h2>
          <RatingStars rating={ratingData.rating} />
          {ratingData.feedback && (
            <p className="text-gray-600 text-sm mt-2">{ratingData.feedback}</p>
          )}
        </div>
      )}

      {booking.status === 'completed' && (
        <div className="mt-6">
          <button
            onClick={() => navigate(`/customer/disputes?booking_id=${id}`)}
            className="flex items-center gap-2 text-red-600 font-medium hover:underline"
          >
            <XCircle size={18} />
            Report a Problem
          </button>
        </div>
      )}

      {/* Cancel */}
      {['pending', 'reviewing', 'confirmed', 'accepted'].includes(booking.status) && (
        <div className="mt-6">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-all duration-200 disabled:opacity-60"
          >
            <XCircle size={18} />
            {cancelling ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        </div>
      )}
      {/* QR Scanner Modal */}
      {booking && (
        <QRScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          initialCode={`CC-SVC-${booking.id}`}
          onVerified={() => fetchBooking()}
        />
      )}
    </div>
  );
}
