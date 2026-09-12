import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Save,
  Loader2,
  MapPin,
  Grip,
  ChevronDown,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function DayToggle({ available, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!available)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        available ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          available ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Availability() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workerId, setWorkerId] = useState(null);

  const [availability, setAvailability] = useState(
    DAYS.map((day) => ({
      day,
      available: false,
      startTime: '09:00',
      endTime: '17:00',
    }))
  );

  const [serviceRadius, setServiceRadius] = useState(25);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/workers/me/profile');
      const data = res.data?.data || res.data;
      setWorkerId(data.id);

      if (data.availabilities && Array.isArray(data.availabilities)) {
        const merged = DAYS.map((day, i) => {
          const found = data.availabilities.find(
            (a) => a.day_of_week === i
          );
          return {
            day,
            available: found?.is_available ?? false,
            startTime: found?.start_time?.slice(0, 5) || '09:00',
            endTime: found?.end_time?.slice(0, 5) || '17:00',
          };
        });
        setAvailability(merged);
      }

      setServiceRadius(data.serviceArea || data.serviceRadius || 25);

      const loc = data.location;
      if (loc) {
        const lat = loc.coordinates?.[1] || loc.lat;
        const lng = loc.coordinates?.[0] || loc.lng;
        if (lat && lng) {
          setCurrentLocation({ lat, lng });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
        toast.success('Location updated');
      },
      (error) => {
        setLocationLoading(false);
        toast.error('Unable to retrieve your location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleDayChange = (index, field, value) => {
    setAvailability((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async () => {
    if (!workerId) return;
    setSaving(true);
    try {
      await api.patch(`/api/workers/${workerId}/availability`, {
        availabilities: availability.map((a, i) => ({
          day_of_week: i,
          is_available: a.available,
          start_time: a.startTime,
          end_time: a.endTime,
        })),
      });
      toast.success('Availability saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Availability</h1>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Weekly Schedule
        </h2>

        <div className="space-y-4">
          {availability.map((item, index) => (
            <div
              key={item.day}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border transition-colors ${
                item.available ? 'border-green-200 bg-green-50/50' : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-[140px]">
                <DayToggle
                  available={item.available}
                  onChange={(val) => handleDayChange(index, 'available', val)}
                />
                <span
                  className={`font-medium ${
                    item.available ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {item.day}
                </span>
              </div>

              {item.available ? (
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">From</label>
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => handleDayChange(index, 'startTime', e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <span className="text-gray-400">to</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => handleDayChange(index, 'endTime', e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Unavailable</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Availability
          </button>
        </div>
      </div>

      {/* Service Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          Service Area
        </h2>

        {/* Location */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Current Position</label>
            <button
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              {locationLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              Update Location
            </button>
          </div>

          {currentLocation ? (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Latitude</span>
                  <p className="font-mono text-sm text-gray-900 mt-0.5">
                    {currentLocation.lat.toFixed(6)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Longitude</span>
                  <p className="font-mono text-sm text-gray-900 mt-0.5">
                    {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
              {/* Simple map placeholder */}
              <div className="mt-4 h-48 bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100" />
                <div className="relative text-center">
                  <MapPin className="w-8 h-8 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600 font-medium">
                    {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </p>
                </div>
                {/* Radius circle indicator */}
                <div
                  className="absolute rounded-full border-2 border-blue-400 border-dashed bg-blue-200/20"
                  style={{
                    width: `${Math.min(serviceRadius * 6, 180)}px`,
                    height: `${Math.min(serviceRadius * 6, 180)}px`,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No location set. Click "Update Location" to set your position.</p>
            </div>
          )}
        </div>

        {/* Service Radius */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Service Area Radius</label>
            <span className="text-lg font-bold text-blue-600">{serviceRadius} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={serviceRadius}
            onChange={(e) => setServiceRadius(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>1 km</span>
            <span>25 km</span>
            <span>50 km</span>
          </div>
        </div>
      </div>
    </div>
  );
}
