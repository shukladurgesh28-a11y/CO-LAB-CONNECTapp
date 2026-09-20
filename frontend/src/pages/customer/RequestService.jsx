import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import LocationPicker from '../../components/LocationPicker';
import VoiceBooking from '../../components/VoiceBooking';
import { ProgressSteps } from '../../motion/primitives';
import { AnimatePresence, motion } from 'framer-motion';
import { DUR, EASE } from '../../motion/tokens';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Send,
  Sparkles,
} from 'lucide-react';

export default function RequestService() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const preselectedService = searchParams.get('service');

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    category: '',
    service_id: preselectedService || '',
    description: '',
    address: '',
    location: { lat: null, lng: null },
    preferred_date: '',
    preferred_time_start: '',
    preferred_time_end: '',
    urgency: 'normal',
    special_requirements: '',
    amount: '',
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await api.get('/services/');
        const categoriesResponse = data?.data || data?.categories || [];
        const allServices = categoriesResponse.flatMap((category) =>
          (category.services || []).map((service) => ({
            ...service,
            category: category.slug,
            category_name: category.name,
          }))
        );
        setServices(allServices);
        const cats = categoriesResponse.map((category) => ({
          value: category.slug,
          label: category.name,
        }));
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filteredServices = form.category
    ? services.filter((s) => s.category === form.category)
    : services;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleServiceChange = (e) => {
    const serviceId = e.target.value;
    const selected = services.find((s) => String(s.id) === String(serviceId));
    setForm({
      ...form,
      service_id: serviceId,
      amount: selected?.base_price ? String(selected.base_price) : '',
    });
  };

  const handleLocationPick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm({
            ...form,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          toast.success('Location detected!');
        },
        () => {
          toast.error('Could not get your location');
        }
      );
    }
  };

  const today = new Date().toISOString().split('T')[0];

  function ReviewRow({ label, value }) {
    return (
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-900 text-right">{value}</span>
      </div>
    );
  }

  const handleDemoAutofill = () => {
    const electrician = services.find((s) => /electrician/i.test(s.name || '') || s.slug === 'electrician')
      || services.find((s) => s.category === 'home-repair')
      || services[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setForm({
      category: electrician?.category || 'home-repair',
      service_id: electrician ? String(electrician.id) : '',
      description: 'Fix faulty bedroom wiring and replace the circuit breaker switch.',
      address: 'Flat 402, Shanti Heights, Model Colony, Pune 411016',
      location: { lat: 18.5204, lng: 73.8567 },
      preferred_date: tomorrow,
      preferred_time_start: '11:00',
      preferred_time_end: '12:00',
      urgency: 'normal',
      special_requirements: 'Please bring standard testing tools.',
      amount: electrician?.base_price ? String(electrician.base_price) : '500',
    });
    toast.success('Demo details filled — review and submit!');
  };

  const STEPS = ['Service', 'Details', 'Location', 'Schedule', 'Priority', 'Review'];
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const selectedServiceName = services.find((s) => String(s.id) === String(form.service_id))?.name || '—';

  const validateStep = (s) => {
    if (s === 0 && !form.service_id) return 'Please choose a service to continue';
    if (s === 1 && (!form.description || !form.amount)) return 'Please add a description and amount';
    if (s === 2 && !form.address) return 'Please enter your address';
    if (s === 3 && !form.preferred_date) return 'Please pick a preferred date';
    return null;
  };

  const goStep = (next) => {
    if (next > step) {
      const err = validateStep(step);
      if (err) {
        toast.error(err);
        return;
      }
    }
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.service_id || !form.description || !form.address || !form.preferred_date || !form.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { data: response } = await api.post('/requests', {
        service_id: form.service_id,
        description: form.description,
        location_address: form.address,
        location_lat: form.location.lat,
        location_lng: form.location.lng,
        preferred_date: form.preferred_date,
        preferred_time_start: form.preferred_time_start || undefined,
        preferred_time_end: form.preferred_time_end || undefined,
        urgency: form.urgency,
        special_requirements: form.special_requirements || undefined,
        amount: form.amount ? parseFloat(form.amount) : undefined,
      });
      toast.success(response?.message || 'Service request submitted and sent to the cooperative!');
      const requestId = response?.data?.id || response?.id;
      navigate(requestId ? `/customer/requests/${requestId}` : '/customer/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Request a Service</h1>
        <button
          type="button"
          onClick={handleDemoAutofill}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-sm font-semibold"
          title="Fill the form with demo values (Electrician, ₹500, Pune)"
        >
          <Sparkles size={16} />
          Fill demo details
        </button>
      </div>

      <div className="mb-6">
        <VoiceBooking
          services={services}
          onFill={(parsed) => {
            setForm((prev) => {
              const next = { ...prev, ...parsed };
              const svc = services.find((s) => String(s.id) === String(parsed.service_id));
              if (svc?.category) next.category = svc.category;
              if (parsed.amount == null && svc?.base_price) next.amount = String(svc.base_price);
              return next;
            });
            toast.success('Voice details filled — please review and confirm!');
          }}
        />
      </div>

      <ProgressSteps steps={STEPS} current={step} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              enter: (d) => ({ opacity: 0, x: 24 * d }),
              center: { opacity: 1, x: 0 },
              exit: (d) => ({ opacity: 0, x: -24 * d }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: DUR.component, ease: EASE.out }}
          >
            {step === 0 && (
              <div className="space-y-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Category *</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm bg-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                  <select
                    name="service_id"
                    value={form.service_id}
                    onChange={handleServiceChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm bg-white"
                  >
                    <option value="">Select a service</option>
                    {filteredServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.base_price ? `(₹${Number(s.base_price).toLocaleString('en-IN')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
                    <input
                      type="number"
                      name="amount"
                      min="1"
                      step="0.01"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="e.g. 500"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Amount the customer will pay. The cooperative and welfare deductions are applied automatically.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe the service you need in detail..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm resize-none"
                  />
                </div>

                {/* Special Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                  <textarea
                    name="special_requirements"
                    value={form.special_requirements}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Any special instructions or requirements..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="flex gap-3 mb-2">
                    <button
                      type="button"
                      onClick={handleLocationPick}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-all duration-200 text-sm font-medium"
                    >
                      <MapPin size={16} />
                      Detect My Location
                    </button>
                    {form.location.lat && (
                      <span className="text-xs text-green-600 flex items-center">
                        ✓ Location detected
                      </span>
                    )}
                  </div>
                  <LocationPicker
                    onLocationSelect={(location) => setForm((current) => ({ ...current, location }))}
                    initialPosition={form.location.lat ? form.location : undefined}
                    height="260px"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Enter your full address"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    name="preferred_date"
                    value={form.preferred_date}
                    onChange={handleChange}
                    min={today}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock size={14} className="inline mr-1" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="preferred_time_start"
                    value={form.preferred_time_start}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock size={14} className="inline mr-1" />
                    End Time
                  </label>
                  <input
                    type="time"
                    name="preferred_time_end"
                    value={form.preferred_time_end}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    data-active={form.urgency === 'normal'}
                    onClick={() => setForm({ ...form, urgency: 'normal' })}
                    className={`cc-selectable flex-1 py-2.5 rounded-lg text-sm font-medium border-2 ${
                      form.urgency === 'normal'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Normal
                    <span className="block text-xs font-normal opacity-70">Standard request</span>
                  </button>
                  <button
                    type="button"
                    data-active={form.urgency === 'urgent'}
                    onClick={() => setForm({ ...form, urgency: 'urgent' })}
                    className={`cc-selectable flex-1 py-2.5 rounded-lg text-sm font-medium border-2 flex flex-col items-center justify-center gap-1 ${
                      form.urgency === 'urgent'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2"><AlertTriangle size={16} />Urgent</span>
                    <span className="text-xs font-normal opacity-70">Priority request</span>
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-2 text-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Review your request</h3>
                <ReviewRow label="Service" value={selectedServiceName} />
                <ReviewRow label="Amount" value={form.amount ? `₹${Number(form.amount).toLocaleString('en-IN')}` : '—'} />
                <ReviewRow label="Description" value={form.description || '—'} />
                <ReviewRow label="Address" value={form.address || '—'} />
                <ReviewRow label="Date" value={form.preferred_date || '—'} />
                <ReviewRow label="Time" value={[form.preferred_time_start, form.preferred_time_end].filter(Boolean).join(' – ') || '—'} />
                <ReviewRow label="Urgency" value={form.urgency} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Step nav */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goStep(step - 1)}
              className="px-5 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => goStep(step + 1)}
              className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 text-sm"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Submit Request
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
