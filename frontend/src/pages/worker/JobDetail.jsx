import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  User,
  Wrench,
  Navigation,
  Play,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Package,
  Plus,
  X,
  FileText,
  DollarSign,
  Scan,
  QrCode,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { useRealtimeSync } from '../../api/realtime';
import QRScannerModal from '../../components/QRScannerModal';
import ServiceMap from '../../components/ServiceMap';

const STATUS_STEPS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'en_route', label: 'En Route', icon: Navigation },
  { key: 'in_progress', label: 'In Progress', icon: Play },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

const stepKey = (status) => {
  if (status === 'accepted') return 'confirmed';
  if (status === 'service_started') return 'in_progress';
  return status;
};

function StatusTimeline({ currentStatus }) {
  const currentIndex = STATUS_STEPS.findIndex(
    (s) => s.key === currentStatus || (s.key === 'in_progress' && currentStatus === 'in_progress')
  );

  return (
    <div className="flex items-center justify-between w-full">
      {STATUS_STEPS.map((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = step.key === currentStatus;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isCurrent
                  ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                  : isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={`text-xs mt-2 font-medium ${
                isCurrent ? 'text-blue-600' : isActive ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
            {index < STATUS_STEPS.length - 1 && (
              <div
                className={`absolute h-0.5 w-full ${
                  index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                style={{ top: '20px' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [booking, setBooking] = useState(null);
  const [jobCoords, setJobCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialName, setMaterialName] = useState('');
  const [materialQty, setMaterialQty] = useState('1');
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/bookings/${id}`);
      const data = res.data?.data || res.data?.booking || res.data;
      setBooking(data);
      // Job coordinates live on the service request (worker is authorized
      // to read allocated requests).
      if (data?.request_id) {
        try {
          const reqRes = await api.get(`/api/requests/${data.request_id}`);
          const req = reqRes.data?.data || reqRes.data;
          if (Number.isFinite(req?.location_lat) && Number.isFinite(req?.location_lng)) {
            setJobCoords({ lat: req.location_lat, lng: req.location_lng });
          } else {
            setJobCoords(null);
          }
        } catch {
          setJobCoords(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  useRealtimeSync({
    tables: ['bookings', 'notifications'],
    onChange: fetchBooking,
  });

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/api/bookings/${id}/status`, { status: newStatus });
      setBooking((prev) => ({ ...prev, status: newStatus }));
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!materialName.trim()) return;
    setAddingMaterial(true);
    try {
      await api.post(`/api/bookings/${id}/materials`, {
        name: materialName.trim(),
        quantity: Number(materialQty) || 1,
      });
      toast.success('Material added');
      setShowMaterialModal(false);
      setMaterialName('');
      setMaterialQty('1');
      fetchBooking();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add material');
    } finally {
      setAddingMaterial(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-500">Job not found</p>
        <Link to="/worker/jobs" className="text-blue-600 hover:underline block text-center mt-4">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const materials = booking.materials || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        to="/worker/jobs"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 relative">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Job Status</h2>
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-blue-600 transition-all"
            style={{
              width: `${
                ((STATUS_STEPS.findIndex((s) => s.key === stepKey(booking.status)) + 1) /
                  STATUS_STEPS.length) *
                100
              }%`,
            }}
          />
          <div className="relative flex justify-between">
            {STATUS_STEPS.map((step) => {
              const stepIndex = STATUS_STEPS.findIndex((s) => s.key === step.key);
              const currentIndex = STATUS_STEPS.findIndex((s) => s.key === stepKey(booking.status));
              const isActive = stepIndex <= currentIndex;
              const isCurrent = step.key === booking.status;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isCurrent ? 'text-blue-600' : isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Service Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Service</span>
                <span className="font-medium text-gray-900">
                  {booking.service_name || booking.service?.name || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Date</span>
                <span className="font-medium text-gray-900">
                  {booking.service_date
                    ? new Date(booking.service_date).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              {booking.time_start && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Time</span>
                  <span className="font-medium text-gray-900">{booking.time_start}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Status</span>
                <span className="font-medium text-gray-900 capitalize">
                  {booking.status?.replace('_', ' ')}
                </span>
              </div>
              {(booking.total_amount || booking.amount) && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="font-semibold text-green-600 text-lg">
                    ₹{Number(booking.total_amount || booking.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {booking.financials && (
                <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Service charges</span>
                    <span>₹{Number(booking.financials.service_charges || 0).toFixed(2)}</span>
                  </div>
                  {Number(booking.financials.material_charges) > 0 && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Materials</span>
                      <span>₹{Number(booking.financials.material_charges || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Cooperative commission</span>
                    <span>- ₹{Number(booking.financials.commission_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Welfare contribution</span>
                    <span>- ₹{Number(booking.financials.welfare_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-green-700 font-semibold pt-2 border-t border-gray-200">
                    <span>Your payout</span>
                    <span>₹{Number(booking.financials.worker_payout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Special Requirements */}
          {booking.description && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Service Description
              </h2>
              <p className="text-gray-700 bg-orange-50 p-4 rounded-lg">
                {booking.description}
              </p>
            </div>
          )}

          {/* Materials */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Materials
              </h2>
              <button
                onClick={() => setShowMaterialModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>
            {materials.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No materials added yet</p>
            ) : (
              <div className="space-y-2">
                {materials.map((mat, index) => (
                  <div
                    key={mat._id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900">{mat.name}</span>
                    <span className="text-sm text-gray-500">Qty: {mat.quantity || 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Customer
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                {booking.location_address || 'Area not specified'}
              </div>
              {booking.customer_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400">{booking.customer_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {(booking.location_address || booking.description) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" />
                Location
              </h3>
              {jobCoords ? (
                <ServiceMap
                  height={192}
                  center={jobCoords}
                  markers={[{
                    ...jobCoords,
                    label: 'Job site',
                    sub: booking.location_address,
                    kind: 'request',
                  }]}
                />
              ) : (
                <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50" />
                  <div className="relative text-center">
                    <MapPin className="w-8 h-8 text-red-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 px-4">
                      {booking.location_address || 'Service address on request'}
                    </p>
                  </div>
                </div>
              )}
              {booking.location_address && (
                <p className="text-sm text-gray-600 mt-2">{booking.location_address}</p>
              )}
            </div>
          )}

          {/* Status Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {/* QR Scanner for On-Site Verification */}
              {['confirmed', 'accepted', 'en_route', 'service_started', 'in_progress'].includes(booking.status) && (
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-sm text-sm"
                >
                  <Scan className="w-4 h-4 animate-pulse" />
                  Scan Customer QR Pass
                </button>
              )}
              {booking.status === 'pending' && (
                <>
                  <button
                    onClick={() => setConfirmAction('confirmed')}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Accept Job
                  </button>
                  <button
                    onClick={() => setConfirmAction('cancelled')}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
                  >
                    Reject Job
                  </button>
                </>
              )}

              {booking.status === 'confirmed' && (
                <button
                  onClick={() => setConfirmAction('en_route')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                  <Navigation className="w-5 h-5" />
                  Mark En Route
                </button>
              )}

              {booking.status === 'accepted' && (
                <button
                  onClick={() => setConfirmAction('en_route')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                  <Navigation className="w-5 h-5" />
                  Mark En Route
                </button>
              )}

              {booking.status === 'en_route' && (
                <button
                  onClick={() => setConfirmAction('service_started')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                >
                  {updating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  Start Service
                </button>
              )}

              {['service_started', 'in_progress'].includes(booking.status) && (
                <button
                  onClick={() => setConfirmAction('completed')}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {updating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Complete Service
                </button>
              )}

              {booking.status === 'completed' && (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">Service Completed</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="cc-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="cc-pop bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to change the status to{' '}
              <strong className="capitalize">{confirmAction.replace('_', ' ')}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(confirmAction)}
                disabled={updating}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showMaterialModal && (
        <div className="cc-fade fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="cc-pop bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add Material</h3>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Material Name
                </label>
                <input
                  type="text"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. PVC Pipes, Screws"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={materialQty}
                  onChange={(e) => setMaterialQty(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMaterial}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingMaterial && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add
                </button>
              </div>
            </form>
          </div>
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
