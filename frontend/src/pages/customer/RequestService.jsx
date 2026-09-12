import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import LocationPicker from '../../components/LocationPicker';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Send,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.service_id || !form.description || !form.address || !form.preferred_date) {
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

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Request a Service</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm bg-white"
          >
            <option value="">Select a service</option>
            {filteredServices.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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

        {/* Date & Time */}
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

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, urgency: 'normal' })}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                form.urgency === 'normal'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, urgency: 'urgent' })}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                form.urgency === 'urgent'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <AlertTriangle size={16} />
              Urgent
            </button>
          </div>
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

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </form>
    </div>
  );
}
